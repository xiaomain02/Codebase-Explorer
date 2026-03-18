from pydantic import BaseModel


class RepoSummaryResponse(BaseModel):
    repo_id: str
    summary: str
