import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from services.session_manager import SubprocessRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sessions", tags=["files"])


def get_registry() -> SubprocessRegistry:
    from main import registry
    return registry


def check_session_access(session_id: str, registry: SubprocessRegistry) -> None:
    client = registry.get_client(session_id)
    if not client:
        raise HTTPException(status_code=404, detail="Session not found")


@router.get("/{session_id}/files")
async def list_files(session_id: str):
    reg = get_registry()
    check_session_access(session_id, reg)
    reg.touch(session_id)

    client = reg.get_client(session_id)
    result = await client.call("list_files", {"sessionId": session_id})
    return result


@router.get("/{session_id}/files/{path:path}")
async def read_file(session_id: str, path: str):
    reg = get_registry()
    check_session_access(session_id, reg)
    reg.touch(session_id)

    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")

    client = reg.get_client(session_id)
    try:
        result = await client.call("read_file", {"sessionId": session_id, "path": path})
        content = result.get("content", "")
        return PlainTextResponse(content)
    except Exception as e:
        if "Path traversal detected" in str(e):
            raise HTTPException(status_code=403, detail="Access denied")
        raise HTTPException(status_code=404, detail=str(e))
