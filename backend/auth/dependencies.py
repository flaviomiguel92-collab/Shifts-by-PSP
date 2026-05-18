"""FastAPI dependencies for authentication."""
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request

import db as _db
from config import SESSION_TTL_DAYS
from models.auth import User


async def _validate_session(session_token: str) -> User:
    """Common session validation logic shared by get_current_user and require_header_auth.

    Implements *sliding expiration*: any authenticated use renews the session
    so it never expires while the app is in regular use. Only an explicit
    logout (session deleted) or a long idle gap (> SESSION_TTL_DAYS with no
    use at all) ends a session. The renewal write is throttled to at most
    once per day per session to avoid a DB write on every request.
    """
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
    now = datetime.now(timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await _db.db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    # Sliding renewal: push expiry back to now+TTL on use, but only write
    # when that would move it by more than 12h — keeps active sessions alive
    # indefinitely while throttling to at most ~1 write per 12h per session.
    new_expiry = now + timedelta(days=SESSION_TTL_DAYS)
    if new_expiry - expires_at > timedelta(hours=12):
        await _db.db.user_sessions.update_one(
            {"session_token": token_hash},
            {"$set": {"expires_at": new_expiry}},
        )
    return User(**user_doc)


async def get_current_user(request: Request) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await _validate_session(auth_header[7:])


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
    return await _validate_session(auth_header[7:])