from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from routes.files import router


app = FastAPI()
app.include_router(router)


def get_mock_registry():
    return MagicMock()


class TestListFiles:
    def test_list_files_returns_file_listing(self):
        mock_client = MagicMock()
        mock_client.call = MagicMock(return_value={
            'files': [
                {'name': 'readme.md', 'path': 'readme.md', 'isDirectory': False, 'size': 100, 'modified': '2024-01-01T00:00:00Z'},
                {'name': 'src', 'path': 'src', 'isDirectory': True, 'size': 0, 'modified': '2024-01-01T00:00:00Z'},
            ],
            'path': ''
        })

        mock_registry = MagicMock()
        mock_registry.get_client.return_value = mock_client
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/test-session/files')

                assert response.status_code == 200
                data = response.json()
                assert 'files' in data
                assert len(data['files']) == 2
                assert data['files'][0]['name'] == 'readme.md'

    def test_list_files_session_not_found(self):
        mock_registry = MagicMock()
        mock_registry.get_client.return_value = None

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/nonexistent/files')

                assert response.status_code == 404

    def test_list_files_touches_session(self):
        mock_client = MagicMock()
        mock_client.call = MagicMock(return_value={'files': [], 'path': ''})

        mock_registry = MagicMock()
        mock_registry.get_client.return_value = mock_client
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                client.get('/api/v1/sessions/test-session/files')

                mock_registry.touch.assert_called_once_with('test-session')


class TestReadFile:
    def test_read_file_returns_content(self):
        mock_client = MagicMock()
        mock_client.call = MagicMock(return_value={
            'content': '# Hello World\n\nThis is a test file.',
            'path': 'readme.md'
        })

        mock_registry = MagicMock()
        mock_registry.get_client.return_value = mock_client
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/test-session/files/readme.md')

                assert response.status_code == 200
                assert '# Hello World' in response.text

    def test_read_file_session_not_found(self):
        mock_registry = MagicMock()
        mock_registry.get_client.return_value = None

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/nonexistent/files/readme.md')

                assert response.status_code == 404

    def test_read_file_path_traversal_blocked(self):
        mock_registry = MagicMock()
        mock_registry.get_client.return_value = MagicMock()
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/test-session/files/../etc/passwd')

                assert response.status_code == 400
                assert 'Invalid path' in response.json()['detail']

    def test_read_file_absolute_path_blocked(self):
        mock_registry = MagicMock()
        mock_registry.get_client.return_value = MagicMock()
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/test-session/files//etc/passwd')

                assert response.status_code == 400
                assert 'Invalid path' in response.json()['detail']

    def test_read_file_rpc_path_traversal_returns_403(self):
        mock_client = MagicMock()
        mock_client.call = MagicMock(side_effect=Exception('Path traversal detected'))

        mock_registry = MagicMock()
        mock_registry.get_client.return_value = mock_client
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/test-session/files/../../../etc/passwd')

                assert response.status_code == 403
                assert 'Access denied' in response.json()['detail']

    def test_read_file_not_found(self):
        mock_client = MagicMock()
        mock_client.call = MagicMock(side_effect=Exception('File not found'))

        mock_registry = MagicMock()
        mock_registry.get_client.return_value = mock_client
        mock_registry.touch = MagicMock()

        with patch('routes.files.get_registry', return_value=mock_registry):
            with TestClient(app) as client:
                response = client.get('/api/v1/sessions/test-session/files/nonexistent.md')

                assert response.status_code == 404
