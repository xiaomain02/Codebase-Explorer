# Codebase Explorer

Веб-приложение для анализа и визуализации структуры кодовых баз.

## Введение

Codebase Explorer - веб-инструмент для интерактивного исследования любого программного проекта. Пользователь загружает ZIP-архив с кодом, после чего приложение строит интерактивное дерево файловой структуры, анализирует модули, генерирует AI-описания папок и файлов и позволяет задавать вопросы о коде на естественном языке.

Весь AI-анализ выполняется **локально** - код пользователя не покидает машину.

## Быстрый старт

```bash
git clone https://github.com/xiaomain02/Codebase-Explorer
cd Codebase-Explorer
docker compose up --build
```

После запуска:

- **Фронтенд:** `http://localhost:3000` или `http://<IP-адрес-машины>:3000`
- **Backend API:** `http://localhost:8000`
- **Swagger UI:** `http://localhost:8000/docs`

> При первом запуске бэкенд автоматически скачает LLM-модель (~1.9 ГБ).
> Подождите 2–3 минуты до появления `Application startup complete` в логах.

## Архитектура

Приложение развёртывается через Docker Compose и состоит из четырёх слоёв:

**Nginx (порт 3000)** - раздаёт статику фронтенда, проксирует `/api/` на бэкенд.

**Frontend** - React 18 + TypeScript, собирается в статику при сборке образа.

**Backend (порт 8000)** - FastAPI + Uvicorn, REST API, бизнес-логика, AST-парсинг.

**LLM Service** - qwen2.5 (1.5b), работает внутри бэкенд-контейнера, грузится лениво при первом запросе.

**Storage** - файловая система + `index.json` для хранения архивов и распакованного кода.

### Структура проекта

```
Codebase-Explorer/
├── app/                          # FastAPI-приложение
│   ├── api/repo.py               # Все эндпоинты (prefix: /api/repos)
│   ├── core/
│   │   ├── config.py             # BASE_DIR, лимиты, игнорируемые папки
│   │   └── exceptions.py         # Кастомные исключения → HTTP-коды
│   ├── schemas/                  # Pydantic-модели запросов и ответов
│   ├── services/
│   │   ├── repo_service.py       # Основная бизнес-логика
│   │   ├── storage_service.py    # Работа с ФС и index.json
│   │   └── llm_service.py        # LLM-интеграция (llama-cpp-python)
│   └── main.py                   # FastAPI app, регистрация роутера
├── src/                          # React-фронтенд
│   ├── api/                      # Axios-клиент, типы, вызовы к бэкенду
│   ├── components/
│   │   ├── StructureView/        # Панель Overview (summary, модули, папки)
│   │   ├── QAPanel/              # Q&A с историей вопросов
│   │   ├── NodeAiDescription/    # LLM-описание выбранного узла
│   │   └── FolderSummary/        # Описание папки
│   ├── hooks/useRepo.ts          # Хук управления состоянием репозитория
│   ├── App.tsx
│   └── App.css
├── tests/
├── storage/                      # Данные (gitignore)
├── models/                       # LLM-модель (gitignore, ~2 ГБ)
├── Dockerfile
├── Dockerfile.frontend
├── docker-compose.yml
└── nginx.conf
```

## REST API

Все эндпоинты под префиксом `/api/repos`. Интерактивная документация — `/docs`.

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/repos/upload` | Загрузка ZIP-архива, возвращает `repo_id` |
| `GET` | `/api/repos/{id}/tree` | Полное дерево файлов |
| `GET` | `/api/repos/{id}/modules` | Список модулей по директориям |
| `GET` | `/api/repos/{id}/summary` | LLM-резюме проекта |
| `GET` | `/api/repos/{id}/structure[/{path}]` | AST-структура папки: классы, функции, README |
| `POST` | `/api/repos/{id}/ask` | Вопрос о проекте → ответ LLM |
| `GET` | `/api/repos/{id}/file/{path}/describe` | LLM-анализ файла |
| `GET` | `/api/repos/{id}/folder/{path}/describe` | LLM-анализ папки |
| `GET` | `/health` | Проверка работоспособности |

## Функциональность

### Загрузка архива
Принимает только `.zip`, проверяет размер (лимит 500 МБ). Защита от path traversal через `.resolve()`. Если в архиве одна корневая папка (GitHub-стиль) - автоматически «проваливается» в неё.

### Интерактивное дерево
По умолчанию показываются только папки первого уровня. Клик разворачивает/сворачивает содержимое. Директории - фиолетовые ноды, файлы - зелёные. Поддерживается drag, zoom и pan.

### LLM-анализ
При клике на узел автоматически запрашивается описание от LLM. Для файлов возвращает назначение, классы, функции и импорты. Для папок - назначение и содержимое. Кэш описаний хранится в `localStorage`.

### Q&A
История вопросов не исчезает - каждый можно свернуть/развернуть. История сохраняется между перезагрузками страницы. Кнопка «Очистить» удаляет всё.

### Персистентность сессии
При обновлении страницы граф, история Q&A и кэш описаний восстанавливаются из `localStorage`. При 404-ошибке (бэкенд перезапущен) - автосброс на страницу загрузки.

## LLM-интеграция

Используется локальная модель через `qwen2.5`. При первом обращении к LLM модель скачивается из Hugging Face Hub и кэшируется в `/app/models/`.

Параметры: формат GGUF (Q4_K_M), ~1.9 ГБ, контекстное окно 4096 токенов, температура 0.2, выполнение на CPU.

## Конфигурация

### nginx.conf
- `proxy_read_timeout 300s` — 5 минут на LLM-генерацию
- `client_max_body_size 500M` — поддержка крупных архивов
- `proxy_buffering off` — без буферизации для больших файлов
- `try_files $uri /index.html` — SPA-роутинг

### Решённые проблемы

**504 Gateway Timeout при upload** — nginx timeout был меньше времени обработки. Решение: `proxy_read/send/connect_timeout 300s`.

**Upload failed** — axios вручную выставлял `Content-Type` без boundary. Решение: убрать явный заголовок, axios ставит его автоматически.

**Backend не стартует после изменений** — флаг `--reload` прерывал upload. Решение: убрать `--reload` из Dockerfile.

**Бесконечный Loading overview** — `localStorage` хранил устаревший `repoId`. Решение: `useEffect` сбрасывает состояние при 404-ошибке.

## Тестирование

```bash
docker compose run --rm backend pytest tests/ -v
```

Тесты используют `pytest` и `TestClient` из FastAPI. Тестовые ZIP-архивы создаются в памяти через `BytesIO`.

Покрытые случаи: успешная загрузка ZIP, загрузка не-ZIP файла (→ 400), полный интеграционный флоу upload → tree → modules → summary → ask, запрос несуществующего `repo_id` (→ 404).

## Полезные команды

```bash
# Пересборка без кэша
docker compose down && docker compose build --no-cache && docker compose up -d

# Пересборка только фронтенда
docker compose build --no-cache frontend && docker compose up -d frontend

# Логи бэкенда
docker compose logs backend --tail=50 -f

# Запустить тесты
docker compose run --rm backend pytest tests/ -v

# Сбросить storage
rm -rf storage/repos/* && echo "{}" > storage/index.json
```

## Стек

**Backend:** FastAPI 0.115+, Uvicorn, Pydantic v2, llama-cpp-python, huggingface_hub

**Frontend:** React 18, TypeScript 5, Vite, ReactFlow, axios

**Инфраструктура:** Docker Compose, Nginx stable-alpine, pytest + httpx