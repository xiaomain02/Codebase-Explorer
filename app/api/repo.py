from fastapi import APIRouter, File, UploadFile

from app.schemas.modules import RepoModulesResponse
from app.schemas.qa import AskRequest, AskResponse
from app.schemas.repo import UploadRepoResponse, FileDescriptionResponse 
from app.schemas.structure import RepoStructureResponse, FolderStructure
from app.schemas.summary import RepoSummaryResponse
from app.schemas.tree import RepoTreeResponse
from app.services.repo_service import RepoService
from app.services.llm_service import LLMService

router = APIRouter(prefix='/api/repos', tags=['repo'])
service = RepoService()
llm_service = LLMService()
service = RepoService(llm_service=llm_service)


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


@router.get('/{repo_id}/structure/{path:path}', response_model=RepoStructureResponse)
def get_structure(repo_id: str, path: str = "") -> RepoStructureResponse:
    structure_data = service.get_structure(repo_id, path)
    return RepoStructureResponse(
        repo_id=repo_id,
        structure=FolderStructure(**structure_data),
        readme=structure_data.get('readme')
    )


@router.get('/{repo_id}/structure', response_model=RepoStructureResponse)
def get_structure_root(repo_id: str) -> RepoStructureResponse:
    return get_structure(repo_id, "")


@router.post('/{repo_id}/ask', response_model=AskResponse)
def ask_about_repo(repo_id: str, payload: AskRequest) -> AskResponse:
    result = service.ask_about_repo(repo_id, payload.question)
    return AskResponse(repo_id=repo_id, **result)


@router.get('/{repo_id}/file/{file_path:path}/describe', response_model=FileDescriptionResponse)
def describe_file(repo_id: str, file_path: str) -> FileDescriptionResponse:
    """
    Возвращает описание конкретного файла: назначение, классы, функции.
    """
    result = service.describe_file(repo_id, file_path)
    return FileDescriptionResponse(**result)