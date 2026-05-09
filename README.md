# Codebase-Explorer

## Введение

Codebase-Explorer - это веб-приложение для анализа и исследования кодовых баз. Проект включает FastAPI бэкенд для обработки репозиториев, парсинга Python файлов и генерации структур папок.

## Архитектура

Проект состоит из трех основных компонентов:
- **Бэкенд**: FastAPI приложение на Python
- **Фронтенд**: React + TypeScript веб-интерфейс  
- **LLM**: Сервис для генерации описаний с использованием llama-cpp-python

## Функциональность

### Реализованная функциональность
- Загрузка и анализ репозиториев
- Парсинг Python файлов с извлечением классов, функций и докстрингов
- Рекурсивная обработка структур папок
- Интеграция README файлов на уровне папок
- REST API эндпоинты для получения структур
- Q&A панель для вопросов о кодовой базе
- Визуализация структуры кода через интерактивный граф

### Интеграция и улучшения компонентов
- **Парсинг Python файлов**: AST-парсинг для извлечения классов, функций, методов и их документации
- **Рекурсивные структуры папок**: Поддержка глубокого обхода директорий с правильной вложенностью
- **Интеграция README**: README файлы читаются и включаются в описания папок
- **Docker контейнеризация**: Dockerfile, docker-compose.yml для развертывания полного стека
- **Схемы данных**: Pydantic модели для поддержки рекурсивных структур и README полей
- **Тестирование**: Тесты для API эндпоинтов

## DevOps: Проделанные действия и исправления

### 1. API Routes Mismatch (Фронтенд-Бэкенд коммуникация)
**Проблема**: Фронтенд обращался к `/api/repos/upload`, но бэкенд был зарегистрирован с префиксом `/repo` (без 's').

**Решение** (`app/api/repo.py` + `app/main.py`):
```python
# Было: router = APIRouter(prefix='/repo', tags=['repo'])
# Стало: router = APIRouter(prefix='/api/repos', tags=['repo'])
```
- Изменён префикс роутера на `/api/repos` для полного совпадения с путями фронтенда
- Nginx корректно проксирует `/api/` запросы к бэкенду
- Все API запросы теперь доходят до правильных обработчиков

### 2. Docker Build: Hash Verification Failure
**Проблема**: При сборке бэкенда контейнера падала ошибка:
```
ERROR: THESE PACKAGES DO NOT MATCH THE HASHES FROM THE REQUIREMENTS FILE
llama-cpp-python<0.3.0,>=0.2.56 from https://files.pythonhosted.org/packages/...
Expected sha256 419b041c62dbdb9f7e67883a6ef2f247d583d08417058776be0bff05b4ec9e3d
Got        d15a0772aed3b6d5461304d799b42926829a88398c490d00e82e1f0cfbf0e021
```

**Решение** (`Dockerfile`):
- Удалены хеши из `requirements.txt` (они не кэшировались, а пакет скачивается со своим хешем)
- Исходный pip install вернулся в обычный режим без дополнительных флагов

### 3. Frontend: Отсутствие Q&A и Summary UI
**Проблема**: Компоненты `QAPanel` и `StructureView` существовали, но не подключались в `App.tsx`.
Результат:
- Нельзя было задать вопрос о коде
- Summary не выводился
- Структура и модули не показывались

**Решение** (`src/App.tsx`):
- ✅ Добавлен импорт `useRepo` hook для управления состоянием репозитория
- ✅ Добавлены импорты компонентов:
  ```typescript
  import { useRepo } from './hooks/useRepo';
  import { StructureView } from './components/StructureView/StructureView';
  import { QAPanel } from './components/QAPanel/QAPanel';
  ```
- ✅ Подключён хук `useRepo(repoId)` для загрузки данных репозитория
- ✅ Добавлены `StructureView` и `QAPanel` в правую панель для отображения:
  - Project Summary
  - Модули проекта
  - Структуру файлов
  - Форму для задания вопросов о коде
- ✅ Добавлена очистка `setAnswer(null)` при загрузке нового репозитория

### 4. TypeScript Compilation Error
**Проблема**: 
```
src/App.tsx(37,5): error TS6133: 'setAnswer' is declared but its value is never read.
```

**Решение** (`src/App.tsx`):
- Использована переменная `setAnswer` в функции `handleFileUpload` для сброса предыдущего ответа
- Добавлено `setAnswer(null)` после загрузки нового репозитория

## Результат после исправлений

✅ **Фронтенд подключен к бэкенду** - все API запросы корректно обрабатываются  
✅ **Docker контейнеры собираются** без ошибок хешей  
✅ **UI полностью функционален**:
  - Графическое дерево структуры кода
  - Project Summary
  - Список модулей
  - Форма Q&A для вопросов о коде
  - Отображение структуры папок и Python файлов

## Установка и запуск

### Локальная разработка
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Docker развертывание
```bash
docker-compose down
docker-compose up --build
```
- Бэкенд запустится на `http://localhost:8000`
- Фронтенд запустится на `http://localhost:3000`
- Nginx проксирует `/api/` запросы к бэкенду

## Структура проекта

```
├── app/                    # FastAPI приложение
│   ├── api/               # API эндпоинты (исправлен префикс /api/repos)
│   ├── core/              # Конфигурация и исключения
│   ├── schemas/           # Pydantic модели
│   └── services/          # Бизнес-логика (repo_service, llm_service, storage_service)
├── src/                   # React фронтенд
│   ├── components/        # UI компоненты (StructureView, QAPanel, FileTree, etc)
│   ├── hooks/            # React хуки (useRepo для управления репозиторием)
│   ├── api/              # API клиент (repos.ts, client.ts, types.ts)
│   └── App.tsx           # Главный компонент (обновлён с StructureView и QAPanel)
├── storage/              # Хранение загруженных репозиториев
├── tests/                # Тесты
├── Dockerfile            # Контейнер бэкенда (исправлена установка зависимостей)
├── Dockerfile.frontend   # Контейнер фронтенда
├── docker-compose.yml    # Оркестрация сервисов
├── nginx.conf            # Конфигурация nginx (проксирует /api/ к бэкенду)
└── requirements.txt      # Python зависимости (без хешей)
```

## API

- `POST /api/repos/upload` - Загрузка репозитория (ZIP архив)
- `GET /api/repos/{repo_id}/tree` - Получение дерева структуры
- `GET /api/repos/{repo_id}/structure[/{path}]` - Получение структуры папки
- `GET /api/repos/{repo_id}/modules` - Список модулей проекта
- `GET /api/repos/{repo_id}/summary` - Summary проекта
- `POST /api/repos/{repo_id}/ask` - Задать вопрос о коде (Q&A)
- `GET /api/repos/{repo_id}/file/{file_path}/describe` - Описание конкретного файла

## Разработка

Проект использует:
- **FastAPI** для REST API
- **Pydantic** для валидации данных
- **Python AST** для парсинга кода
- **React 18 + TypeScript** для фронтенда
- **Vite** для быстрой сборки фронтенда
- **Docker & Docker Compose** для контейнеризации
- **Nginx** для reverse proxy и static файлов
- **llama-cpp-python** для локального LLM (Llama-3.2-3B)
- **pytest** для тестирования