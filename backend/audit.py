"""Lightweight, fire-and-forget audit log.

Writes to the ``audit_logs`` collection. Never raises — a failure to log
must never block or fail the actual operation. The index on (user_id, ts)
is created at startup alongside the other indexes in db.py.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import db as _db

logger = logging.getLogger(__name__)

_SENSITIVE_EVENTS = frozenset({
    "login",
    "login_failed",
    "register",
    "logout",
    "delete_account",
    "password_change",
})


async def log(
    event: str,
    user_id: Optional[str],
    *,
    ip: Optional[str] = None,
    detail: str = "",
) -> None:
    """Append an audit entry. Swallows all exceptions."""
    try:
        await _db.db.audit_logs.insert_one({
            "event": event,
            "user_id": user_id,
            "ip": ip,
            "detail": detail,
            "ts": datetime.now(timezone.utc),
        })
    except Exception as exc:
        logger.warning("audit log write failed (event=%s user=%s): %s", event, user_id, exc)


def _ip_from_request(request) -> Optional[str]:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else None
