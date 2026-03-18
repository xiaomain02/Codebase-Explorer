from fastapi import APIRouter, File, UploadFile

from app.schemas.modules import RepoModulesResponse
from app.schemas.qa import AskRequest, AskResponse
from app.schemas.repo import UploadRepoResponse
from app.schemas.summary import RepoSummaryResponse
from app.schemas.tree import RepoTreeResponse
from app.services.repo_service import RepoService

router = APIRouter(prefix='/repo', tags=['repo'])
service = RepoService()


@router.post('/upload', response_model=UploadRepoResponse)
async def upload_repo(file: UploadFile = File(...)) -> UploadRepoResponse:
    repo_id = await service.upload_repo(file)
    return UploadRepoResponse(repo_id=repo_id)


@router.get('/{repo_id}/tree', response_model=RepoTreeResponse)
def get_tree(repo_id: str) -> RepoTreeResponse:
    return RepoTreeResponse(repo_id=repo_id, tree=service.get_tree(repo_id))


@router.get('/{repo_id}/modules', response_model=RepoModulesResponse)
def get_modules(repo_id: str) -> RepoModulesResponse:
    return RepoModulesResponse(repo_id=repo_id, modules=service.get_modules(repo_id))


@router.get('/{repo_id}/summary', response_model=RepoSummaryResponse)
def get_summary(repo_id: str) -> RepoSummaryResponse:
    return RepoSummaryResponse(repo_id=repo_id, summary=service.get_summary(repo_id))


@router.post('/{repo_id}/ask', response_model=AskResponse)
def ask_about_repo(repo_id: str, payload: AskRequest) -> AskResponse:
    result = service.ask_about_repo(repo_id, payload.question)
    return AskResponse(repo_id=repo_id, **result)
