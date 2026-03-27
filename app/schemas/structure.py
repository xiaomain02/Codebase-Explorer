from __future__ import annotations

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


class FolderStructure(BaseModel):
    path: str
    files: list[FileStructure] = []
    subfolders: list[FolderStructure] = []
    summary: str | None = None
    readme: str | None = None


class RepoStructureResponse(BaseModel):
    repo_id: str
    structure: FolderStructure
    readme: str | None = None


