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
        # Корневые файлы
        archive.writestr('app/main.py', 'print("hello")')
        archive.writestr('app/service.py', 'def run():\n    return True\n\nclass Service:\n    def process(self):\n        pass')
        archive.writestr('app/utils.py', 'def helper():\n    pass')
        # Подпапка для Python-моделей
        archive.writestr('app/models/user.py', 'class User:\n    def __init__(self, name):\n        self.name = name')
        archive.writestr('app/models/product.py', 'class Product:\n    def __init__(self, title):\n        self.title = title')
        # Папка без .py (только вспомогательные файлы)
        archive.writestr('app/assets/config.txt', 'data=123')
        archive.writestr('app/assets/README.md', 'Assets README')
        archive.writestr('README.md', '# Demo Project\n\nThis is a demo project for testing.')
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


def test_repo_structure_parsing():
    upload_response = client.post(
        '/repo/upload',
        files={'file': ('demo.zip', make_zip(), 'application/zip')},
    )
    assert upload_response.status_code == 200
    repo_id = upload_response.json()['repo_id']

    structure_response = client.get(f'/repo/{repo_id}/structure')
    assert structure_response.status_code == 200

    structure_data = structure_response.json()
    assert structure_data['repo_id'] == repo_id
    assert 'structure' in structure_data
    assert structure_data['structure']['path'] == '.'
    assert 'files' in structure_data['structure']
    assert 'subfolders' in structure_data['structure']
    assert 'summary' in structure_data['structure']

    # Корень может содержать только подпапку app и README
    assert structure_data['structure']['files'] == []
    assert any(sf['path'] == 'app' for sf in structure_data['structure']['subfolders'])
    assert structure_data['structure']['readme'] is not None

    # Проверяем app-папку
    app_structure = client.get(f'/repo/{repo_id}/structure/app').json()
    assert app_structure['structure']['path'] == 'app'
    assert any(f['file_path'] == 'app/service.py' for f in app_structure['structure']['files'])

    service_file = next(f for f in app_structure['structure']['files'] if f['file_path'] == 'app/service.py')
    assert any(func['name'] == 'run' for func in service_file['functions'])

    # Проверяем, что в app/assets без .py есть README и корректный summary
    assets_structure = client.get(f'/repo/{repo_id}/structure/app/assets').json()
    assert assets_structure['structure']['path'] == 'app/assets'
    assert assets_structure['structure']['files'] == []
    assert assets_structure['structure']['readme'] == 'Assets README'
    assert 'не содержит .py' in assets_structure['structure']['summary']

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
