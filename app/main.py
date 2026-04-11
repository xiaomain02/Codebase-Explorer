from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api.repo import router as repo_router
from app.core.exceptions import InvalidArchiveError, InvalidQuestionError, RepoNotFoundError

app = FastAPI(title='Codebase Explorer Backend', version='0.1.0')
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