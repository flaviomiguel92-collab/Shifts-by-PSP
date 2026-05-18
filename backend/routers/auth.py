import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pymongo.errors import DuplicateKeyError

import db as _db
from auth.dependencies import get_current_user
from config import _AUTH_RATE, _IS_PRODUCTION, limiter
from models.auth import LoginRequest, RegisterRequest, User, UserPublic, pwd_context

router = APIRouter()


def _cookie_flags() -> dict:
    if _IS_PRODUCTION:
        return {"secure": True, "samesite": "none"}
    return {"secure": False, "samesite": "lax"}


@router.post("/auth/register")
@limiter.limit(_AUTH_RATE)
async def register(data: RegisterRequest, request: Request, response: Response):
    existing_user = await _db.db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado")
    password_hash = pwd_context.hash(data.password)
    user_id = str(uuid.uuid4())
    user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await _db.db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email já registado")
    session_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": token_hash,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    }
    await _db.db.user_sessions.insert_one(session)
    return {
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "picture": None,
            "created_at": user["created_at"].isoformat(),
        },
        "session_token": session_token,
    }


@router.post("/auth/login")
@limiter.limit(_AUTH_RATE)
async def login(data: LoginRequest, request: Request, response: Response):
    user = await _db.db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.get("password_hash") or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    user_id = user["user_id"]
    session_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": token_hash,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    }
    await _db.db.user_sessions.insert_one(session)
    return {
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "created_at": user["created_at"].isoformat(),
        },
        "session_token": session_token,
    }


@router.get("/auth/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)):
    return UserPublic(**user.model_dump())


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    auth_header = request.headers.get("Authorization")
    session_token = auth_header[7:] if auth_header and auth_header.startswith("Bearer ") else None
    if session_token:
        token_hash = hashlib.sha256(session_token.encode()).hexdigest()
        await _db.db.user_sessions.delete_many({"session_token": token_hash})
    response.delete_cookie(key="session_token", path="/", **_cookie_flags())
    return {"message": "Logged out successfully"}


@router.get("/auth/sessions")
async def list_sessions(request: Request, user: User = Depends(get_current_user)):
    auth_header = request.headers.get("Authorization")
    raw_token = auth_header[7:] if auth_header and auth_header.startswith("Bearer ") else None
    current_hash = hashlib.sha256(raw_token.encode()).hexdigest() if raw_token else None
    sessions = await _db.db.user_sessions.find(
        {"user_id": user.user_id},
        {"_id": 0, "session_id": 1, "created_at": 1, "expires_at": 1, "session_token": 1},
    ).to_list(length=50)
    result = []
    for s in sessions:
        result.append({
            "session_id": s["session_id"],
            "created_at": s["created_at"].isoformat() if hasattr(s["created_at"], "isoformat") else str(s["created_at"]),
            "expires_at": s["expires_at"].isoformat() if hasattr(s["expires_at"], "isoformat") else str(s["expires_at"]),
            "is_current": s.get("session_token") == current_hash,
        })
    result.sort(key=lambda x: x["created_at"], reverse=True)
    return result


@router.delete("/auth/sessions/{session_id}")
async def revoke_session(session_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.user_sessions.delete_one({"session_id": session_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session revoked"}
