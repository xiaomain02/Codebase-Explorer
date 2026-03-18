from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)


class AskResponse(BaseModel):
    repo_id: str
    question: str
    answer: str
    sources: list[str] = []
