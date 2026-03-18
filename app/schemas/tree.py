from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


class TreeNode(BaseModel):
    name: str
    type: Literal['file', 'directory']
    children: list['TreeNode'] | None = None


class RepoTreeResponse(BaseModel):
    repo_id: str
    tree: TreeNode
