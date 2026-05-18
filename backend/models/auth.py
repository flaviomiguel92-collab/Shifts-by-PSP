from datetime import datetime, timezone
from typing import Optional
import uuid

from pydantic import BaseModel, Field, validator, EmailStr
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(BaseModel):
    user_id: str
    email: str
    name: str
    password_hash: Optional[str] = None
    picture: Optional[str] = None
    created_at: Optional[datetime] = None


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: Optional[datetime] = None


class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @validator('password')
    def validate_password(cls, v):
        if len(v) > 128:
            raise ValueError("Password não pode exceder 128 caracteres")
        if len(v) < 8:
            raise ValueError("Password deve ter pelo menos 8 caracteres")
        if not any(c.isupper() for c in v):
            raise ValueError("Password deve conter pelo menos uma letra maiúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password deve conter pelo menos um número")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
