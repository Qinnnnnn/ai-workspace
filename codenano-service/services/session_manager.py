import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from services.rpc_client import JsonRpcClient
from services.sandbox import build_bwrap_args
from core.config import CODENANO_CLI_PATH, SB_TTL_MINUTES, ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, WORKSPACE_BASE_DIR

logger = logging.getLogger(__name__)


class SessionInfo:
    def __init__(self, session_id: str, client: JsonRpcClient, created_at: datetime, last_activity: datetime):
        self.session_id = session_id
        self.client = client
        self.created_at = created_at
        self.last_activity = last_activity
        self._ttl_task: asyncio.Task | None = None

    def touch(self) -> None:
        self.last_activity = datetime.now()


class SubprocessRegistry:
    def __init__(self):
        self._sessions: dict[str, SessionInfo] = {}
        self._cleanup_task: asyncio.Task = asyncio.create_task(self._cleanup_loop())

    async def create_session(self, config: dict | None = None) -> str:
        session_id = str(uuid.uuid4())
        cli_path = os.path.abspath(CODENANO_CLI_PATH)
        workspace_path = Path(WORKSPACE_BASE_DIR) / session_id / "workspace"

        # TODO: re-enable bwrap after debugging
        # bwrap_args = build_bwrap_args(session_id, cli_path, str(workspace_path))
        proc = await asyncio.create_subprocess_exec(
            "node", cli_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "ANTHROPIC_API_KEY": ANTHROPIC_API_KEY, **({"ANTHROPIC_BASE_URL": ANTHROPIC_BASE_URL} if ANTHROPIC_BASE_URL else {})},
        )

        client = JsonRpcClient(proc)
        client.start_reading()

        # Default config, merged with provided config
        init_config = {"model": "claude-sonnet-4-6"}
        if config:
            init_config.update(config)
        await client.call("init", {"config": init_config})

        now = datetime.now()
        info = SessionInfo(session_id, client, now, now)
        self._sessions[session_id] = info
        info._ttl_task = asyncio.create_task(self._session_ttl(session_id))
        return session_id

    async def _session_ttl(self, session_id: str) -> None:
        ttl = timedelta(minutes=SB_TTL_MINUTES)
        while True:
            await asyncio.sleep(30)
            info = self._sessions.get(session_id)
            if info is None:
                return
            if datetime.now() - info.last_activity > ttl:
                logger.info(f"Session {session_id} expired due to TTL")
                await self.destroy_session(session_id)
                return

    async def _cleanup_loop(self) -> None:
        while True:
            await asyncio.sleep(60)
            ttl = timedelta(minutes=SB_TTL_MINUTES)
            now = datetime.now()
            for sid, info in list(self._sessions.items()):
                if now - info.last_activity > ttl:
                    await self.destroy_session(sid)

    def get_client(self, session_id: str) -> JsonRpcClient | None:
        info = self._sessions.get(session_id)
        return info.client if info else None

    def touch(self, session_id: str) -> None:
        info = self._sessions.get(session_id)
        if info:
            info.touch()

    async def destroy_session(self, session_id: str) -> None:
        info = self._sessions.pop(session_id, None)
        if info is None:
            return
        if info._ttl_task:
            info._ttl_task.cancel()
        try:
            await info.client.close()
        except Exception as e:
            logger.warning(f"Error closing session {session_id}: {e}")

    async def shutdown(self) -> None:
        self._cleanup_task.cancel()
        for session_id in list(self._sessions.keys()):
            await self.destroy_session(session_id)

    def list_sessions(self) -> list[dict]:
        return [
            {
                "sessionId": info.session_id,
                "createdAt": info.created_at.isoformat(),
                "lastActivity": info.last_activity.isoformat(),
            }
            for info in self._sessions.values()
        ]
