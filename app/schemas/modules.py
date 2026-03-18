from pydantic import BaseModel


class ModuleInfo(BaseModel):
    name: str
    description: str
    files: list[str]


class RepoModulesResponse(BaseModel):
    repo_id: str
    modules: list[ModuleInfo]
