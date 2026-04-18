import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, Response
from sse_starlette.sse import EventSourceResponse

from services.session_manager import SubprocessRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


def create_registry() -> SubprocessRegistry:
    from main import registry
    return registry


@router.post("")
async def create_session(body: dict | None = None):
    reg = create_registry()
    config = body or {}
    session_id = await reg.create_session(config)
    return {"sessionId": session_id}


@router.get("")
async def list_sessions():
    reg = create_registry()
    return {"sessions": reg.list_sessions()}


@router.get("/{session_id}")
async def get_session(session_id: str):
    reg = create_registry()
    client = reg.get_client(session_id)
    if not client:
        raise HTTPException(status_code=404, detail="Session not found")
    reg.touch(session_id)
    sessions = reg.list_sessions()
    for s in sessions:
        if s["sessionId"] == session_id:
            return s
    raise HTTPException(status_code=404, detail="Session not found")


@router.delete("/{session_id}")
async def close_session(session_id: str):
    reg = create_registry()
    client = reg.get_client(session_id)
    if not client:
        raise HTTPException(status_code=404, detail="Session not found")
    await reg.destroy_session(session_id)
    return {"ok": True}


@router.get("/{session_id}/history")
async def get_history(session_id: str):
    reg = create_registry()
    client = reg.get_client(session_id)
    if not client:
        raise HTTPException(status_code=404, detail="Session not found")
    reg.touch(session_id)
    result = await client.call("history", {"sessionId": session_id})
    return result


@router.post("/{session_id}/message")
async def send_message(session_id: str, body: dict):
    reg = create_registry()
    client = reg.get_client(session_id)
    if not client:
        raise HTTPException(status_code=404, detail="Session not found")

    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing 'prompt' field")

    stream = body.get("stream", True)
    reg.touch(session_id)

    # Build send params - pass through all codenano-compatible params
    send_params = {
        "sessionId": session_id,
        "prompt": prompt,
        # Per-message overrides (currently CLI may not use all of these)
        "model": body.get("model"),
        "systemPrompt": body.get("systemPrompt"),
        "overrideSystemPrompt": body.get("overrideSystemPrompt"),
        "appendSystemPrompt": body.get("appendSystemPrompt"),
        "maxOutputTokens": body.get("maxOutputTokens"),
        "thinkingConfig": body.get("thinkingConfig"),
    }
    # Remove None values
    send_params = {k: v for k, v in send_params.items() if v is not None}

    event_queue: asyncio.Queue[dict] = asyncio.Queue()
    events: list[dict] = []

    def notification_handler(notification: dict) -> None:
        event_queue.put_nowait(notification)

    client.add_notification_handler(notification_handler)

    async def event_generator():
        task = asyncio.create_task(client.call("send", send_params))

        try:
            while True:
                try:
                    notification = await asyncio.wait_for(event_queue.get(), timeout=60)
                    params = notification.get("params", {})
                    ev_type = params.get("type", "unknown")
                    data = params.get("data", {})
                    events.append({"type": ev_type, "data": data})
                    yield {"event": ev_type, "data": json.dumps(data)}
                    if ev_type == "result":
                        break
                except asyncio.TimeoutError:
                    break
        finally:
            try:
                await task
            except Exception as e:
                yield {"event": "error", "data": json.dumps({"error": str(e)})}

    if not stream:
        # Non-streaming: collect all events and return JSON
        collected = []
        async for event in event_generator():
            collected.append(event)
        return {"events": collected}

    return EventSourceResponse(event_generator())
