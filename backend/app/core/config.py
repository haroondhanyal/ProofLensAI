import secrets

from pydantic import model_validator
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ProofLens AI"
    app_env: str = "development"
    database_url: str = "sqlite:///./prooflens.db"
    jwt_secret: str = ""
    access_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:3000"
    max_upload_mb: int = 20
    refresh_token_expire_days: int = 14
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = ""
    web_risk_api_key: str = ""
    fact_check_api_key: str = ""
    media_provider_url: str = ""
    media_provider_api_key: str = ""
    antivirus_socket: str = ""
    antivirus_host: str = ""
    antivirus_port: int = Field(default=3310, gt=0, le=65535)
    antivirus_binary: str = "clamscan"
    local_ai_url: str = ""
    local_ai_model: str = ""
    local_ai_timeout_seconds: int = Field(default=20, gt=0, le=60)
    yara_rules_path: str = ""
    max_file_upload_mb: int = Field(default=20, gt=0, le=100)
    risk_caution_threshold: int = Field(default=30, ge=1, le=100)
    risk_high_threshold: int = Field(default=55, ge=2, le=100)
    risk_critical_threshold: int = Field(default=75, ge=3, le=100)

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    @model_validator(mode="after")
    def validate_runtime_settings(self):
        if not self.database_url.strip():
            self.database_url = "sqlite:///./prooflens.db"
        if len(self.jwt_secret.strip()) < 32:
            if self.app_env in {"development", "test"}:
                self.jwt_secret = secrets.token_urlsafe(48)
            else:
                raise ValueError("JWT_SECRET must contain at least 32 characters outside development.")
        if not self.risk_caution_threshold < self.risk_high_threshold < self.risk_critical_threshold:
            raise ValueError("Risk thresholds must be strictly increasing: caution < high < critical.")
        return self


settings = Settings()
