import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_blank_database_uses_local_sqlite_and_dev_secret_is_ephemeral():
    settings = Settings(_env_file=None, app_env="development", database_url="", jwt_secret="")
    assert settings.database_url.startswith("sqlite:")
    assert len(settings.jwt_secret) >= 32


def test_non_development_requires_a_long_jwt_secret():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_env="production", database_url="sqlite:///test.db", jwt_secret="short")
