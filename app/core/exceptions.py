class RepoError(Exception):
    """Base repository exception."""


class RepoNotFoundError(RepoError):
    """Raised when repo_id does not exist."""


class InvalidArchiveError(RepoError):
    """Raised when uploaded archive is invalid."""


class InvalidQuestionError(RepoError):
    """Raised when question is empty."""
