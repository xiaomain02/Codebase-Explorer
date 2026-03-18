import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.config import INDEX_FILE, REPOS_DIR, STORAGE_DIR
from app.core.exceptions import RepoNotFoundError


class StorageService:
    def __init__(self, index_file: Path = INDEX_FILE):
        self.index_file = index_file
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        REPOS_DIR.mkdir(parents=True, exist_ok=True)
        if not self.index_file.exists():
            self._write_index({})

    def _read_index(self) -> dict[str, Any]:
        if not self.index_file.exists():
            return {}
        return json.loads(self.index_file.read_text(encoding='utf-8'))

    def _write_index(self, data: dict[str, Any]) -> None:
        self.index_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )

    def generate_repo_id(self) -> str:
        return uuid4().hex[:12]

    def create_repo_paths(self, repo_id: str) -> dict[str, Path]:
        repo_dir = REPOS_DIR / repo_id
        repo_dir.mkdir(parents=True, exist_ok=True)

        extracted_dir = repo_dir / 'extracted'
        extracted_dir.mkdir(parents=True, exist_ok=True)

        return {
            'repo_dir': repo_dir,
            'zip_path': repo_dir / 'source.zip',
            'extracted_path': extracted_dir,
            'results_path': repo_dir / 'results.json',
        }

    def save_repo_meta(
        self,
        repo_id: str,
        zip_path: Path,
        extracted_path: Path,
        status: str = 'ready'
    ) -> dict[str, Any]:
        index = self._read_index()

        payload = {
            'repo_id': repo_id,
            'zip_path': f'storage/repos/{repo_id}/source.zip',
            'extracted_path': f'storage/repos/{repo_id}/extracted',
            'created_at': datetime.now(UTC).isoformat(),
            'status': status,
        }

        index[repo_id] = payload
        self._write_index(index)
        return payload

    def get_repo_meta(self, repo_id: str) -> dict[str, Any]:
        index = self._read_index()
        if repo_id not in index:
            raise RepoNotFoundError(f'Repository {repo_id} not found')
        return index[repo_id]

    def save_results(self, repo_id: str, results: dict[str, Any]) -> None:
        repo_meta = self.get_repo_meta(repo_id)
        results_path = Path(repo_meta['zip_path']).parent / 'results.json'
        results_path.write_text(
            json.dumps(results, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )

    def load_results(self, repo_id: str) -> dict[str, Any]:
        repo_meta = self.get_repo_meta(repo_id)
        results_path = Path(repo_meta['zip_path']).parent / 'results.json'
        if not results_path.exists():
            return {}
        return json.loads(results_path.read_text(encoding='utf-8'))