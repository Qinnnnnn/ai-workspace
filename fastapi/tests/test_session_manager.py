import asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock
import pytest

from session_manager import SessionInfo, SubprocessRegistry


def cancel_registry(registry: SubprocessRegistry):
    """Cancel the cleanup task without awaiting."""
    registry._cleanup_task.cancel()


class TestSessionInfo:
    def test_touch_updates_last_activity(self):
        client = MagicMock()
        now = datetime.now()
        session = SessionInfo('test-id', client, now, now)

        original = session.last_activity
        import time
        time.sleep(0.01)
        session.touch()

        assert session.last_activity > original

    def test_session_id_preserved(self):
        client = MagicMock()
        now = datetime.now()
        session = SessionInfo('my-session-id', client, now, now)

        assert session.session_id == 'my-session-id'


class TestSubprocessRegistryCreation:
    @pytest.mark.asyncio
    async def test_create_session_generates_uuid(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        with patch('session_manager.asyncio.create_subprocess_exec') as mock_proc:
            mock_proc.return_value = AsyncMock()
            mock_proc.return_value.stdin = AsyncMock()
            mock_proc.return_value.stdout = AsyncMock()
            mock_proc.return_value.wait = AsyncMock()

            with patch('session_manager.JsonRpcClient') as mock_client_cls:
                mock_client = MagicMock()
                mock_client.call = AsyncMock(return_value={'ok': True})
                mock_client.start_reading = MagicMock()
                mock_client_cls.return_value = mock_client

                session_id = await registry.create_session()

                assert session_id is not None
                assert len(session_id) == 36  # UUID format

        cancel_registry(registry)

    @pytest.mark.asyncio
    async def test_create_session_initializes_agent(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        with patch('session_manager.asyncio.create_subprocess_exec') as mock_proc:
            mock_proc.return_value = AsyncMock()
            mock_proc.return_value.stdin = AsyncMock()
            mock_proc.return_value.stdout = AsyncMock()
            mock_proc.return_value.wait = AsyncMock()

            with patch('session_manager.JsonRpcClient') as mock_client_cls:
                mock_client = MagicMock()
                mock_client.call = AsyncMock(return_value={'ok': True})
                mock_client.start_reading = MagicMock()
                mock_client_cls.return_value = mock_client

                await registry.create_session()

                mock_client.call.assert_called_once()
                call_args = mock_client.call.call_args
                assert call_args[0][0] == 'init'

        cancel_registry(registry)


class TestSubprocessRegistryGetClient:
    def test_get_client_returns_client_for_existing_session(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        client = MagicMock()
        now = datetime.now()
        info = SessionInfo('existing', client, now, now)
        registry._sessions['existing'] = info

        result = registry.get_client('existing')
        assert result is client

        cancel_registry(registry)

    def test_get_client_returns_none_for_nonexistent_session(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        result = registry.get_client('nonexistent')
        assert result is None

        cancel_registry(registry)


class TestSubprocessRegistryListSessions:
    def test_list_sessions_empty(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        result = registry.list_sessions()
        assert result == []

        cancel_registry(registry)

    def test_list_sessions_returns_session_info(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        client = MagicMock()
        now = datetime.now()
        info = SessionInfo('session-1', client, now, now)
        registry._sessions['session-1'] = info

        result = registry.list_sessions()
        assert len(result) == 1
        assert result[0]['sessionId'] == 'session-1'
        assert 'createdAt' in result[0]
        assert 'lastActivity' in result[0]

        cancel_registry(registry)


class TestSubprocessRegistryTouch:
    def test_touch_updates_last_activity(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        client = MagicMock()
        now = datetime.now()
        old_time = now - timedelta(minutes=10)
        info = SessionInfo('session-1', client, old_time, old_time)
        registry._sessions['session-1'] = info

        registry.touch('session-1')

        assert info.last_activity > old_time

        cancel_registry(registry)

    def test_touch_nonexistent_session_no_error(self):
        registry = SubprocessRegistry()
        registry._cleanup_task = asyncio.create_task(asyncio.sleep(3600))

        registry.touch('nonexistent')

        cancel_registry(registry)
