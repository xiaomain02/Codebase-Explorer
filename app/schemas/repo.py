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

class FileDescriptionResponse(BaseModel):
    """Ответ с описанием файла: классы, функции, назначение."""
    repo_id: str
    file_path: str
    summary: str = Field(..., description="Краткое описание: за что отвечает файл", examples=["Модуль для работы с репозиториями: загрузка, извлечение, индексация."])
    classes: list[dict[str, str]] = Field(default_factory=list, description="Список классов в файле", examples=[
        [{"name": "RepoService", "description": "Основной сервис для управления репозиториями"}]
    ])
    functions: list[dict[str, str]] = Field(default_factory=list, description="Список функций в файле", examples=[
        [{"name": "upload_repo", "description": "Загружает ZIP-архив и извлекает его"}]
    ])
    imports: list[str] = Field(default_factory=list, description="Список импортируемых модулей", examples=[["fastapi", "pydantic", "zipfile"]])
