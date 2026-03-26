import ast
import shutil
import zipfile
from pathlib import Path

from fastapi import UploadFile

from app.core.config import IGNORED_DIRS, IGNORED_FILES, MAX_UPLOAD_SIZE_BYTES
from app.core.exceptions import InvalidArchiveError, InvalidQuestionError
from app.schemas.modules import ModuleInfo
from app.schemas.tree import TreeNode
from app.services.storage_service import StorageService


class RepoService:
    def __init__(self, storage: StorageService | None = None):
        self.storage = storage or StorageService()

    async def upload_repo(self, file: UploadFile) -> str:
        if not file.filename or not file.filename.lower().endswith('.zip'):
            raise InvalidArchiveError('Only .zip archives are supported')

        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise InvalidArchiveError('Archive is too large')

        repo_id = self.storage.generate_repo_id()
        paths = self.storage.create_repo_paths(repo_id)
        paths['zip_path'].write_bytes(content)

        try:
            with zipfile.ZipFile(paths['zip_path'], 'r') as archive:
                self._safe_extract(archive, paths['extracted_path'])
        except zipfile.BadZipFile as exc:
            raise InvalidArchiveError('Invalid zip archive') from exc

        self.storage.save_repo_meta(repo_id, paths['zip_path'], paths['extracted_path'])
        return repo_id

    def _safe_extract(self, archive: zipfile.ZipFile, destination: Path) -> None:
        destination = destination.resolve()
        for member in archive.infolist():
            member_path = (destination / member.filename).resolve()
            if not str(member_path).startswith(str(destination)):
                raise InvalidArchiveError('Archive contains unsafe paths')
        archive.extractall(destination)

    def get_tree(self, repo_id: str) -> TreeNode:
        extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])    
        children = list(extracted.iterdir())
        if len(children) == 1 and children[0].is_dir():
            extracted = children[0]
        return self._build_tree(extracted)

    def _build_tree(self, root: Path) -> TreeNode:
        children: list[TreeNode] = []
        for item in sorted(root.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
            if item.name in IGNORED_FILES or item.name in IGNORED_DIRS:
                continue
            if item.is_dir():
                children.append(self._build_tree(item))
            else:
                children.append(TreeNode(name=item.name, type='file'))
        return TreeNode(name=root.name, type='directory', children=children)

    def get_modules(self, repo_id: str) -> list[ModuleInfo]:
        extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])
        modules: list[ModuleInfo] = []
        for item in sorted(extracted.iterdir(), key=lambda p: p.name.lower()):
            if item.name in IGNORED_DIRS or item.name in IGNORED_FILES:
                continue
            if item.is_dir():
                files = [str(path.relative_to(extracted)) for path in item.rglob('*') if path.is_file()][:20]
                modules.append(
                    ModuleInfo(
                        name=item.name,
                        description=f'Каталог {item.name} содержит связанную функциональность проекта.',
                        files=files,
                    )
                )
        if not modules:
            files = [str(path.relative_to(extracted)) for path in extracted.rglob('*') if path.is_file()][:20]
            modules.append(
                ModuleInfo(
                    name=extracted.name,
                    description='Проект не разделён на крупные каталоги, поэтому показан как один модуль.',
                    files=files,
                )
            )
        return modules

    def _parse_function_node(self, node: ast.FunctionDef) -> dict:
        args = []
        for a in node.args.args:
            if a.arg == 'self':
                continue
            args.append(a.arg)
        if node.args.vararg:
            args.append('*' + node.args.vararg.arg)
        if node.args.kwarg:
            args.append('**' + node.args.kwarg.arg)
        return {
            'name': node.name,
            'args': args,
            'docstring': ast.get_docstring(node),
        }

    def _parse_class_node(self, node: ast.ClassDef) -> dict:
        methods = []
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                methods.append(self._parse_function_node(item))
        bases = [ast.unparse(base) if hasattr(ast, 'unparse') else getattr(base, 'id', str(base)) for base in node.bases]
        return {
            'name': node.name,
            'bases': bases,
            'docstring': ast.get_docstring(node),
            'methods': methods,
        }

    def _parse_python_file(self, file_path: Path, repo_root: Path) -> dict:
        try:
            content = file_path.read_text(encoding='utf-8')
            tree = ast.parse(content)
        except (UnicodeDecodeError, SyntaxError, FileNotFoundError):
            return {'file_path': str(file_path.relative_to(repo_root)), 'functions': [], 'classes': []}

        functions = []
        classes = []

        for node in tree.body:
            if isinstance(node, ast.FunctionDef):
                functions.append(self._parse_function_node(node))
            elif isinstance(node, ast.ClassDef):
                classes.append(self._parse_class_node(node))

        return {
            'file_path': str(file_path.relative_to(repo_root).as_posix()),
            'functions': functions,
            'classes': classes,
        }

    def get_structure(self, repo_id: str) -> list[dict]:
        extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])
        py_files = sorted(extracted.rglob('*.py'))
        structure = [self._parse_python_file(path, extracted) for path in py_files if path.is_file()]
        return structure

    def get_summary(self, repo_id: str) -> str:
        modules = self.get_modules(repo_id)
        names = ', '.join(module.name for module in modules[:5])
        return (
            f'Репозиторий содержит {len(modules)} ключевых модулей. '
            f'Основные части проекта: {names}. '
            'Это базовый summary-заглушка для MVP backend и его можно заменить LLM-сервисом.'
        )

    def ask_about_repo(self, repo_id: str, question: str) -> dict:
        cleaned = question.strip()
        if not cleaned:
            raise InvalidQuestionError('Question must not be empty')

        extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])
        matched_files: list[str] = []
        keywords = [token.lower() for token in cleaned.replace('?', ' ').split() if len(token) > 2]
        for path in extracted.rglob('*'):
            if not path.is_file():
                continue
            rel = str(path.relative_to(extracted))
            lower_rel = rel.lower()
            if any(keyword in lower_rel for keyword in keywords):
                matched_files.append(rel)
            if len(matched_files) >= 3:
                break

        if matched_files:
            answer = (
                'Для ответа на вопрос backend нашёл несколько потенциально релевантных файлов. '
                'Сейчас это простая эвристика по именам файлов; позже сюда можно подключить retrieval + LLM.'
            )
        else:
            some_files = [str(path.relative_to(extracted)) for path in extracted.rglob('*') if path.is_file()][:3]
            matched_files = some_files
            answer = (
                'Точного совпадения по именам файлов не найдено. '
                'В MVP backend вернул несколько файлов проекта, которые можно использовать как стартовый контекст для LLM.'
            )

        return {
            'question': cleaned,
            'answer': answer,
            'sources': matched_files,
        }
