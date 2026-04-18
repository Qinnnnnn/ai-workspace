import os
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest

from sandbox import build_bwrap_args, check_bwrap, get_bwrap_path


class TestGetBwrapPath:
    def test_bwrap_found(self):
        with patch('shutil.which') as mock_which:
            mock_which.return_value = '/usr/bin/bwrap'
            result = get_bwrap_path()
            assert result == '/usr/bin/bwrap'
            mock_which.assert_called_once_with('bwrap')

    def test_bwrap_not_found(self):
        with patch('shutil.which') as mock_which:
            mock_which.return_value = None
            with pytest.raises(RuntimeError, match='bwrap is not installed'):
                get_bwrap_path()


class TestCheckBwrap:
    def test_bwrap_available(self):
        with patch('sandbox.get_bwrap_path', return_value='/usr/bin/bwrap'):
            assert check_bwrap() is True

    def test_bwrap_not_available(self):
        with patch('sandbox.get_bwrap_path', side_effect=RuntimeError('not found')):
            assert check_bwrap() is False


class TestBuildBwrapArgs:
    def test_basic_args_structure(self):
        with patch('sandbox.get_bwrap_path', return_value='/usr/bin/bwrap'):
            with patch('pathlib.Path.mkdir'):
                args = build_bwrap_args('test-session', '/usr/bin/node', '/tmp/workspace/test')

                assert 'bwrap' in args[0]
                assert '--unshare-user' in args
                assert '--unshare-pid' in args
                assert '--unshare-uts' in args
                assert '--ro-bind' in args
                assert '/workspace' in args
                assert '--tmpfs' in args
                assert '/tmp' in args
                assert '--hostname' in args
                assert 'sandbox-test-s' in args
                assert '--chdir' in args
                assert '/workspace' in args

    def test_workspace_path_created(self):
        with patch('sandbox.get_bwrap_path', return_value='/usr/bin/bwrap'):
            with patch('pathlib.Path.mkdir') as mock_mkdir:
                with patch('pathlib.Path.resolve', return_value=Path('/tmp/host_sessions/test-id/workspace')):
                    build_bwrap_args('test-id', '/usr/bin/node', '/tmp/host_sessions/test-id/workspace')

                    mock_mkdir.assert_called_once()

    def test_chdir_is_workspace(self):
        with patch('sandbox.get_bwrap_path', return_value='/usr/bin/bwrap'):
            with patch('pathlib.Path.mkdir'):
                with patch('pathlib.Path.resolve', return_value=Path('/tmp/workspace')):
                    args = build_bwrap_args('session', '/usr/bin/node', '/tmp/workspace')

                    chdir_index = args.index('--chdir')
                    assert args[chdir_index + 1] == '/workspace'

    def test_hostname_derived_from_session_id(self):
        with patch('sandbox.get_bwrap_path', return_value='/usr/bin/bwrap'):
            with patch('pathlib.Path.mkdir'):
                with patch('pathlib.Path.resolve', return_value=Path('/tmp/workspace')):
                    args = build_bwrap_args('abc12345', '/usr/bin/node', '/tmp/workspace')

                    hostname_index = args.index('--hostname')
                    assert 'sandbox-abc123' in args[hostname_index + 1]
