from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

import db as _db
from auth.dependencies import require_header_auth
from models.auth import User

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
async def cleanup_all_data(user: User = Depends(require_header_auth)):
    try:
        user_filter = {"user_id": user.user_id}
        shifts_deleted = await _db.db.shifts.delete_many(user_filter)
        cycles_deleted = await _db.db.cycles.delete_many(user_filter)
        occurrences_deleted = await _db.db.occurrences.delete_many(user_filter)
        gratifications_deleted = await _db.db.gratifications.delete_many(user_filter)
        gratified_entries_deleted = await _db.db.gratified_entries.delete_many(user_filter)
        return {
            "message": "User data cleaned successfully",
            "shifts_deleted": shifts_deleted.deleted_count,
            "cycles_deleted": cycles_deleted.deleted_count,
            "occurrences_deleted": occurrences_deleted.deleted_count,
            "gratifications_deleted": gratifications_deleted.deleted_count,
            "gratified_entries_deleted": gratified_entries_deleted.deleted_count,
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(error)}")


@router.get("/")
async def root():
    return {"message": "ShiftExtra API", "version": "1.0.0"}
