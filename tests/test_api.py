from io import BytesIO
from pathlib import Path
import zipfile

from fastapi.testclient import TestClient

from app.main import app
from app.services.storage_service import StorageService

client = TestClient(app)


def make_zip() -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, 'w') as archive:
        archive.writestr('app/main.py', 'print("hello")')
        archive.writestr('app/service.py', 'def run():\n    return True')
        archive.writestr('README.md', '# demo')
    buffer.seek(0)
    return buffer.read()


def test_upload_repo_success():
    response = client.post(
        '/repo/upload',
        files={'file': ('demo.zip', make_zip(), 'application/zip')},
    )
    assert response.status_code == 200
    data = response.json()
    assert 'repo_id' in data
    assert data['status'] == 'uploaded'


def test_upload_repo_invalid_extension():
    response = client.post(
        '/repo/upload',
        files={'file': ('demo.txt', b'not a zip', 'text/plain')},
    )
    assert response.status_code == 400


def test_repo_endpoints_flow():
    upload_response = client.post(
        '/repo/upload',
        files={'file': ('demo.zip', make_zip(), 'application/zip')},
    )
    repo_id = upload_response.json()['repo_id']

    tree_response = client.get(f'/repo/{repo_id}/tree')
    assert tree_response.status_code == 200
    assert tree_response.json()['tree']['type'] == 'directory'

    modules_response = client.get(f'/repo/{repo_id}/modules')
    assert modules_response.status_code == 200
    assert len(modules_response.json()['modules']) >= 1

    summary_response = client.get(f'/repo/{repo_id}/summary')
    assert summary_response.status_code == 200
    assert 'summary' in summary_response.json()

    ask_response = client.post(f'/repo/{repo_id}/ask', json={'question': 'Что делает main?'})
    assert ask_response.status_code == 200
    assert 'answer' in ask_response.json()
    assert isinstance(ask_response.json()['sources'], list)


def test_missing_repo_returns_404():
    response = client.get('/repo/missing123/tree')
    assert response.status_code == 404
