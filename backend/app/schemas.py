from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=40)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=30, max_length=256)
    new_password: str = Field(min_length=10, max_length=128)


class ProfileUpdateRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=40)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class AccountDeleteRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AnalyzeRequest(BaseModel):
    content: str = Field(min_length=1, max_length=12000)
    fetch_page: bool = False


class ProductAnalyzeRequest(BaseModel):
    url: str | None = Field(default=None, max_length=2048)
    description: str = Field(default="", max_length=8000)
    price: float | None = Field(default=None, ge=0, le=1000000000)
    reference_price: float | None = Field(default=None, ge=0, le=1000000000)
    fetch_page: bool = False


class StoreAnalyzeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    context: str = Field(default="", max_length=8000)
    fetch_page: bool = False


class ClaimAnalyzeRequest(BaseModel):
    claim: str = Field(min_length=1, max_length=4000)
    organization: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    source_urls: list[str] = Field(default_factory=list, max_length=3)


class EvidenceResponse(BaseModel):
    title: str
    description: str
    severity: str
    source: str


class ScanResponse(BaseModel):
    scan_id: str
    scan_type: str
    risk_score: int
    risk_level: str
    confidence: str
    summary: str
    evidence: list[EvidenceResponse]
    recommendations: list[str]
    status: str
    created_at: datetime
