import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.repo import router as repo_router
from app.core.exceptions import InvalidArchiveError, InvalidQuestionError, RepoNotFoundError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='Codebase Explorer Backend', version='0.1.0')

# 🔓 CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔌 Подключаем роутер (сервисы инициализируются внутри repo.py)
app.include_router(repo_router)

@app.get('/health')
def healthcheck() -> dict[str, str]:
    return {'status': 'ok'}

@app.exception_handler(RepoNotFoundError)
async def repo_not_found_handler(_, exc: RepoNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={'detail': str(exc)})

@app.exception_handler(InvalidArchiveError)
async def invalid_archive_handler(_, exc: InvalidArchiveError) -> JSONResponse:
    return JSONResponse(status_code=400, content={'detail': str(exc)})

@app.exception_handler(InvalidQuestionError)
async def invalid_question_handler(_, exc: InvalidQuestionError) -> JSONResponse:
    return JSONResponse(status_code=400, content={'detail': str(exc)})