"""FastAPI dependencies for authentication."""
import hashlib
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request

import db as _db
from models.auth import User


async def get_current_user(request: Request) -> User:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header[7:]
    else:
        session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    session_doc = await _db.db.user_sessions.find_one({"session_token": token_hash}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await _db.db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


async def require_header_auth(request: Request) -> User:
    """Like get_current_user but only accepts Authorization header — rejects cookie-only auth.

    Applied to destructive/reset endpoints to prevent CSRF: a cross-origin form POST
    can send cookies automatically, but cannot set a custom Authorization header.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=403,
            detail="Este endpoint requer o header Authorization: Bearer <token>",
        )
    session_token = auth_header[7:]
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    session_doc = await _db.db.user_sessions.find_one({"session_token": token_hash}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await _db.db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)
