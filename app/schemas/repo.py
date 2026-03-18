from datetime import datetime
from pydantic import BaseModel, Field


class UploadRepoResponse(BaseModel):
    repo_id: str
    status: str = 'uploaded'


class RepoMeta(BaseModel):
    repo_id: str
    zip_path: str
    extracted_path: str
    created_at: datetime
    status: str = 'ready'


class ErrorResponse(BaseModel):
    detail: str = Field(..., examples=['Repository not found'])
