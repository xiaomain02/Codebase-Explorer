from pydantic import BaseModel


class FunctionInfo(BaseModel):
    name: str
    args: list[str]
    docstring: str | None = None


class ClassInfo(BaseModel):
    name: str
    bases: list[str]
    docstring: str | None = None
    methods: list[FunctionInfo] = []


class FileStructure(BaseModel):
    file_path: str
    functions: list[FunctionInfo] = []
    classes: list[ClassInfo] = []


class RepoStructureResponse(BaseModel):
    repo_id: str
    files: list[FileStructure] = []
    readme: str | None = None
