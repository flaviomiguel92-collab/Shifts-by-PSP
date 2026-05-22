import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

import db as _db
from auth.dependencies import require_header_auth
from config import limiter
from models.auth import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    try:
        await _db.client.admin.command('ping')
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status, "timestamp": datetime.now(timezone.utc).isoformat()}


@router.post("/cleanup/all-data")
@limiter.limit("1/minute")
async def cleanup_all_data(request: Request, user: User = Depends(require_header_auth)):
    try:
        user_filter = {"user_id": user.user_id}
        shifts_deleted = await _db.db.shifts.delete_many(user_filter)
        cycles_deleted = await _db.db.cycles.delete_many(user_filter)
        occurrences_deleted = await _db.db.occurrences.delete_many(user_filter)
        gratifications_deleted = await _db.db.gratifications.delete_many(user_filter)
        gratified_entries_deleted = await _db.db.gratified_entries.delete_many(user_filter)
        await _db.db.shift_types.delete_many(user_filter)
        await _db.db.events.delete_many(user_filter)
        return {
            "message": "User data cleaned successfully",
            "shifts_deleted": shifts_deleted.deleted_count,
            "cycles_deleted": cycles_deleted.deleted_count,
            "occurrences_deleted": occurrences_deleted.deleted_count,
            "gratifications_deleted": gratifications_deleted.deleted_count,
            "gratified_entries_deleted": gratified_entries_deleted.deleted_count,
        }
    except Exception:
        logger.exception("cleanup_all_data failed")
        raise HTTPException(status_code=500, detail="Erro ao limpar dados. Tente novamente.")


@router.get("/")
async def root():
    return {"message": "ShiftExtra API", "version": "1.0.0"}
