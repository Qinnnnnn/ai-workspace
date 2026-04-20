import asyncio
import pytest
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / 'services'))

from session_manager import SubprocessRegistry
from unittest.mock import patch, MagicMock, AsyncMock


class TestToolPreset:
    """Tests for tool preset configuration in session creation."""

    @pytest.mark.asyncio
    async def test_create_session_with_tool_preset_core(self):
        """When toolPreset is 'core', it should be passed to codenano-cli."""
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

                session_id = await registry.create_session({"toolPreset": "core"})

                mock_client.call.assert_called_once()
                call_args = mock_client.call.call_args
                init_params = call_args[0][1]
                assert init_params['config']['toolPreset'] == 'core'

        registry._cleanup_task.cancel()

    @pytest.mark.asyncio
    async def test_create_session_with_tool_preset_extended(self):
        """When toolPreset is 'extended', it should be passed to codenano-cli."""
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

                session_id = await registry.create_session({"toolPreset": "extended"})

                call_args = mock_client.call.call_args
                init_params = call_args[0][1]
                assert init_params['config']['toolPreset'] == 'extended'

        registry._cleanup_task.cancel()

    @pytest.mark.asyncio
    async def test_create_session_with_tool_preset_all(self):
        """When toolPreset is 'all', it should be passed to codenano-cli."""
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

                session_id = await registry.create_session({"toolPreset": "all"})

                call_args = mock_client.call.call_args
                init_params = call_args[0][1]
                assert init_params['config']['toolPreset'] == 'all'

        registry._cleanup_task.cancel()

    @pytest.mark.asyncio
    async def test_create_session_defaults_to_core(self):
        """When no toolPreset is provided, it should default to 'core'."""
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

                await registry.create_session()  # No config

                call_args = mock_client.call.call_args
                init_params = call_args[0][1]
                assert init_params['config']['toolPreset'] == 'core'

        registry._cleanup_task.cancel()

    @pytest.mark.asyncio
    async def test_create_session_tool_preset_preserves_other_config(self):
        """toolPreset should not override model, apiKey, baseURL."""
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

                await registry.create_session({"toolPreset": "extended", "model": "claude-opus-4-6"})

                call_args = mock_client.call.call_args
                init_params = call_args[0][1]
                assert init_params['config']['toolPreset'] == 'extended'
                assert init_params['config']['model'] == 'claude-opus-4-6'

        registry._cleanup_task.cancel()
