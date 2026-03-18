from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BASE_DIR / 'storage'
REPOS_DIR = STORAGE_DIR / 'repos'
INDEX_FILE = STORAGE_DIR / 'index.json'
MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
IGNORED_DIRS = {'.git', 'venv', '.venv', '__pycache__', 'node_modules', 'dist', 'build', 'storage', '.idea', '.vscode'}
IGNORED_FILES = {'.DS_Store'}
