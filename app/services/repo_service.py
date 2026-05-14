import ast
import shutil
import zipfile
from collections import defaultdict
from pathlib import Path

from fastapi import UploadFile

from app.core.config import IGNORED_DIRS, IGNORED_FILES, MAX_UPLOAD_SIZE_BYTES
from app.core.exceptions import InvalidArchiveError, InvalidQuestionError
from app.schemas.modules import ModuleInfo
from app.schemas.tree import TreeNode
from app.services.storage_service import StorageService


class RepoService:
    def __init__(self, storage: StorageService | None = None, llm_service=None):
        self.llm = llm_service
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
        tree, _ = self._build_tree(extracted)
        return tree

    def _build_tree(self, root: Path, max_depth: int = 5, current_depth: int = 0, max_files: int = 500, files_scanned: int = 0) -> tuple[TreeNode, int]:
        SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', 'coverage'}
        
        if current_depth >= max_depth or files_scanned >= max_files:
            return TreeNode(name=root.name, type='directory', children=[], truncated=True), files_scanned
        
        if root.name in IGNORED_FILES or root.name in IGNORED_DIRS or root.name in SKIP_DIRS:
            return None, files_scanned
        
        children: list[TreeNode] = []
        for item in sorted(root.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
            if files_scanned >= max_files:
                break
            if item.name in IGNORED_FILES or item.name in IGNORED_DIRS or item.name in SKIP_DIRS:
                continue
            if item.is_symlink():
                continue
            if item.is_dir():
                result, files_scanned = self._build_tree(item, max_depth, current_depth + 1, max_files, files_scanned)
                if result:
                    children.append(result)
            else:
                files_scanned += 1
                children.append(TreeNode(name=item.name, type='file'))
        
        return TreeNode(name=root.name, type='directory', children=children), files_scanned

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
    def _get_analysis_root(self, extracted: Path) -> Path:
        """Определяет корневую папку для анализа (учитывает вложенность архива)"""
        children = list(extracted.iterdir())
        if len(children) == 1 and children[0].is_dir():
            return children[0]
        return extracted

    def _get_folder_info(self, folder: Path, repo_root: Path) -> dict:
        """Получает информацию о папке для списка subfolders"""
        py_files = list(folder.rglob('*.py'))
        subfolders = [item for item in folder.iterdir() if item.is_dir() and item.name not in IGNORED_DIRS]

        return {
            'name': folder.name,
            'path': str(folder.relative_to(repo_root).as_posix()),
            'file_count': len([f for f in py_files if f.is_file()]),
            'subfolder_count': len(subfolders),
            'summary': None,  # Пока без summary для subfolders в списке
        }

    def _generate_folder_summary(self, folder: Path, file_structures: list[dict], repo_root: Path) -> str:
        """Генерирует summary для конкретной папки"""
        folder_name = folder.name
        if str(folder.relative_to(repo_root).as_posix()) == '.':
            folder_name = 'корневая папка'

        # Собираем статистику
        all_functions = []
        all_classes = []
        for file_info in file_structures:
            all_functions.extend([f['name'] for f in file_info['functions']])
            all_classes.extend([c['name'] for c in file_info['classes']])

        if not file_structures:
            # Если нет Python-файлов, но есть другие файлы — показываем их названия
            non_py_files = [f.name for f in folder.iterdir() if f.is_file() and f.suffix.lower() != '.py']
            if non_py_files:
                names = ', '.join(non_py_files[:10])
                more = f', и еще {len(non_py_files)-10} файл(ов)' if len(non_py_files) > 10 else ''
                return f"Папка {folder_name} не содержит .py файлов; есть другие файлы: {names}{more}."
            return f"Папка {folder_name} не содержит Python файлов."

        # Пока заглушка - потом заменить на LLM
        return self._generate_folder_summary_stub(folder_name, file_structures, all_functions, all_classes)

    def _generate_folder_summaries(self, repo_root: Path, file_structures: list[dict]) -> list[dict]:
        """Генерирует summaries для папок на основе структуры файлов"""
        # Группируем файлы по папкам
        folder_files = defaultdict(list)
        for file_info in file_structures:
            folder_path = str(Path(file_info['file_path']).parent)
            if folder_path == '.':
                folder_path = ''  # корневая папка
            folder_files[folder_path].append(file_info)

        summaries = []
        for folder_path, files in folder_files.items():
            # Собираем ключевую информацию о папке
            all_functions = []
            all_classes = []
            for file_info in files:
                all_functions.extend([f['name'] for f in file_info['functions']])
                all_classes.extend([c['name'] for c in file_info['classes']])

            # Пока заглушка - потом заменить на LLM
            summary_text = self._generate_folder_summary_stub(folder_path, files, all_functions, all_classes)

            summaries.append({
                'folder_path': folder_path or '.',
                'summary': summary_text,
                'file_count': len(files),
                'key_functions': all_functions[:10],  # ограничиваем для краткости
                'key_classes': all_classes[:10],
            })

        return summaries

    def _generate_folder_summary_stub(self, folder_path: str, files: list[dict], functions: list[str], classes: list[str]) -> str:
        """Заглушка для генерации summary папки - потом заменить на LLM"""
        folder_name = folder_path.split('/')[-1] if folder_path else 'корневая папка'

        if folder_name in ['api', 'routes', 'endpoints']:
            return f"Папка {folder_name} содержит API эндпоинты и обработчики запросов."
        elif folder_name in ['services', 'logic', 'business']:
            return f"Папка {folder_name} реализует бизнес-логику приложения."
        elif folder_name in ['models', 'schemas', 'types']:
            return f"Папка {folder_name} содержит модели данных и схемы валидации."
        elif folder_name in ['utils', 'helpers', 'common']:
            return f"Папка {folder_name} содержит вспомогательные функции и утилиты."
        elif folder_name in ['tests', 'test']:
            return f"Папка {folder_name} содержит тесты для проверки функциональности."
        else:
            func_count = len(functions)
            class_count = len(classes)
            file_count = len(files)
            return f"Папка {folder_name} содержит {file_count} Python файлов с {class_count} классами и {func_count} функциями."
    def _read_readme_from_repo_id(self, repo_id: str) -> str | None:
        """Читает README для репозитория по repo_id"""
        extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])
        return self._read_readme(extracted)

    def get_structure(self, repo_id: str, folder_path: str = "") -> dict:
        """Получает структуру конкретной папки (файлы и подпапки) с полной рекурсией"""
        extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])
        root_folder = self._get_analysis_root(extracted)

        if folder_path:
            target_folder = root_folder / folder_path
        else:
            target_folder = root_folder

        if not target_folder.exists() or not target_folder.is_dir():
            raise InvalidQuestionError(f'Folder {folder_path} not found')

        # Используем рекурсивный метод
        return self._get_structure_recursive(target_folder, root_folder, folder_path or '.')

    def _get_structure_recursive(self, target_folder: Path, root_folder: Path, folder_path: str) -> dict:
        """Рекурсивно получает структуру папки (только текущий уровень + вложенные папки рекурсивно)"""
        # Парсим файлы ТОЛЬКО в текущей папке (не рекурсивно)
        py_files = sorted(target_folder.glob('*.py'))
        file_structures = []
        for py_file in py_files:
            if py_file.is_file():
                file_structures.append(self._parse_python_file(py_file, root_folder))

        # Получаем вложенные папки рекурсивно
        subfolders = []
        for item in sorted(target_folder.iterdir()):
            if item.is_dir() and item.name not in IGNORED_DIRS:
                subfolder_path = str(item.relative_to(root_folder).as_posix())
                subfolder_structure = self._get_structure_recursive(item, root_folder, subfolder_path)
                subfolders.append(subfolder_structure)

        # Генерируем summary для текущей папки
        summary = self._generate_folder_summary(target_folder, file_structures, root_folder)

        # Ищем README только в текущей папке
        readme = self._find_readme_in_folder(target_folder)

        return {
            'path': folder_path,
            'files': file_structures,
            'subfolders': subfolders,
            'summary': summary,
            'readme': readme,
        }

    def _find_readme_in_folder(self, folder: Path) -> str | None:
        """Ищет README только в текущей папке (не рекурсивно)"""
        readme_candidates = ['README.md', 'README.rst', 'README.txt', 'readme.md', 'README', 'Readme.md']

        for filename in readme_candidates:
            readme_path = folder / filename
            if readme_path.exists() and readme_path.is_file():
                try:
                    return readme_path.read_text(encoding='utf-8')
                except (UnicodeDecodeError, IOError):
                    continue

        return None

    def _read_readme(self, extracted: Path) -> str | None:
        """Читает README из папки"""
        try:
            children = list(extracted.iterdir())
            if len(children) == 1 and children[0].is_dir():
                extracted = children[0]
        except (FileNotFoundError, PermissionError):
            pass
        
        readme_candidates = ['README.md', 'README.rst', 'README.txt', 'readme.md', 'README', 'Readme.md']
        
        for filename in readme_candidates:
            readme_path = extracted / filename
            if readme_path.exists() and readme_path.is_file():
                try:
                    return readme_path.read_text(encoding='utf-8')
                except (UnicodeDecodeError, IOError):
                    continue
        
        return None

    def get_summary(self, repo_id: str) -> str:
        try:
            if not self.llm:
                modules = self.get_modules(repo_id)
                names = ', '.join(module.name for module in modules[:5])
                return f'Репозиторий содержит {len(modules)} модулей: {names}.'
            
            modules = self.get_modules(repo_id)
            readme = self._read_readme_from_repo_id(repo_id) or ''
            tree = self.get_tree(repo_id)

            module_names = ', '.join(m.name for m in modules[:5])
            readme_short = readme[:200].replace('\n', ' ').strip()
            tree_short = str(tree)[:150] if tree else ''
            
            prompt = (
                "Твоя задача: написать краткое описание проекта на русском языке.\n"
                "Пиши ЕДИНЫМ связным текстом, а не списком.\n"
                "Используй правильные падежи и склонения.\n"
                "НЕ повторяй структуру этого промпта. НЕ пиши '1.', '2.', 'Модули:', 'README:'.\n"
                "НЕ начинай с 'Проанализировал...', 'На основе...', 'Дано...'.\n"
                "Просто начни с описания проекта.\n\n"
                "Пример хорошего ответа:\n"
                '"Это веб-приложение для управления учебным процессом. Бэкенд написан на FastAPI с использованием SQLAlchemy для работы с базой данных SQLite. Фронтенд реализован на React с библиотекой компонентов Ant Design. Проект поддерживает регистрацию пользователей, создание курсов и отслеживание посещаемости."\n\n'
                f"Данные о проекте:\n"
                f"• Модули: {module_names}\n"
                f"• README: {readme_short}\n"
                f"• Структура: {tree_short}\n\n"
                "Ответ (единым текстом, на русском, с правильными склонениями):"
            )

            summary = self.llm.generate(
                prompt,
                system_prompt="Ты — технический писатель. Отвечай только на русском языке, грамотно, с правильными падежами и склонениями. Пиши связным текстом, без списков и маркеров.",
                max_tokens=150,
            ).strip()

            if not summary or summary.startswith(("⚠️", "Ошибка", "Error", "LLM error")):
                return "⚠️ LLM не смогла сгенерировать описание. Попробуйте обновить страницу."

            summary = summary.replace("```", "").replace("**", "").strip()
            
            for marker in ["Данные о проекте:", "• Модули:", "• README:", "• Структура:", "Контекст:", "Ответ:"]:
                if marker in summary:
                    summary = summary.split(marker)[0].strip()
            summary = summary.split('\n\n')[0].split('\n')[0].strip()
            if summary and not summary.endswith('.'):
                summary = summary.rstrip(',') + '.'
            
            if not summary or len(summary) < 20:
                return "⚠️ LLM вернула невалидный ответ."
            
            return summary
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"get_summary error: {type(e).__name__}: {e}")
            return f"⚠️ Ошибка генерации summary: {type(e).__name__}. Проверь логи бэкенда."
        
    # def ask_about_repo(self, repo_id: str, question: str) -> dict:
    #     cleaned = question.strip()
    #     if not cleaned:
    #         raise InvalidQuestionError('Question must not be empty')

    #     extracted = Path(self.storage.get_repo_meta(repo_id)['extracted_path'])
    #     matched_files: list[str] = []
    #     keywords = [token.lower() for token in cleaned.replace('?', ' ').split() if len(token) > 2]
    #     for path in extracted.rglob('*'):
    #         if not path.is_file():
    #             continue
    #         rel = str(path.relative_to(extracted))
    #         lower_rel = rel.lower()
    #         if any(keyword in lower_rel for keyword in keywords):
    #             matched_files.append(rel)
    #         if len(matched_files) >= 3:
    #             break

    #     if matched_files:
    #         answer = (
    #             'Для ответа на вопрос backend нашёл несколько потенциально релевантных файлов. '
    #             'Сейчас это простая эвристика по именам файлов; позже сюда можно подключить retrieval + LLM.'
    #         )
    #     else:
    #         some_files = [str(path.relative_to(extracted)) for path in extracted.rglob('*') if path.is_file()][:3]
    #         matched_files = some_files
    #         answer = (
    #             'Точного совпадения по именам файлов не найдено. '
    #             'В MVP backend вернул несколько файлов проекта, которые можно использовать как стартовый контекст для LLM.'
    #         )

    #     return {
    #         'question': cleaned,
    #         'answer': answer,
    #         'sources': matched_files,
    #     }
    
    def ask_about_repo(self, repo_id: str, question: str) -> dict:
        if not self.llm:
            raise RuntimeError("LLM service not initialized")
            
        # Собираем контекст: дерево + модули + README
        tree = self.get_tree(repo_id)
        modules = self.get_modules(repo_id)
        readme = self.get_readme(repo_id) if hasattr(self, 'get_readme') else ""
        
        context_parts = [
            f"📁 Project Structure:\n{tree}",
            f"📦 Modules:\n{modules}",
        ]
        if readme:
            context_parts.append(f"📖 README:\n{readme}")
            
        full_context = "\n\n---\n\n".join(context_parts)
        safe_context = self.llm.safe_truncate(full_context)
        
        prompt = f"Контекст проекта:\n{safe_context}\n\nВопрос пользователя: {question}"
        answer = self.llm.generate(prompt)
        
        return {
            "question": question,
            "answer": answer,
            "sources": ["structure", "modules", "readme"] if readme else ["structure", "modules"]
        }

    def describe_file(self, repo_id: str, file_path: str) -> dict:
            """
            Читает файл из хранилища и возвращает его описание через LLM.
            """
            if not self.llm:
                return {
                    "repo_id": repo_id,
                    "file_path": file_path,
                    "summary": "⚠️ LLM сервис не инициализирован.",
                    "classes": [], 
                    "functions": [], 
                    "imports": []
                }
            
            try:
                repo_paths = self.storage.get_repo_paths(repo_id)
                full_path = repo_paths['extracted_path'] / file_path
            except AttributeError:
                from pathlib import Path
                full_path = Path(f"./storage/repos/{repo_id}/extracted/{file_path}")
            
            if not full_path.exists():
                return {
                    "repo_id": repo_id,
                    "file_path": file_path,
                    "summary": f"⚠️ Файл не найден: {file_path}",
                    "classes": [], 
                    "functions": [], 
                    "imports": []
                }
            
            ext = full_path.suffix.lower()
            language_map = {
                '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
                '.java': 'java', '.go': 'go', '.rs': 'rust'
            }
            language = language_map.get(ext, 'text')
            
            try:
                content = full_path.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                content = full_path.read_text(encoding='latin-1')
            except Exception as e:
                return {
                    "repo_id": repo_id,
                    "file_path": file_path,
                    "summary": f"⚠️ Ошибка чтения файла: {str(e)}",
                    "classes": [], 
                    "functions": [], 
                    "imports": []
                }
            
            try:
                description = self.llm.describe_file(content, file_path, language)
            except Exception as e:
                description = {
                    "summary": f"⚠️ Ошибка анализа: {str(e)}",
                    "classes": [],
                    "functions": [],
                    "imports": []
                }
            
            return {
                "repo_id": repo_id,
                "file_path": file_path,
                **description
            }
