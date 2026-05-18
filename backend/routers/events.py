from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

import db as _db
from auth.dependencies import get_current_user, require_header_auth
from config import validate_month_format, limiter
from models.auth import User
from models.events import Event, EventCreate, EventUpdate

router = APIRouter()


@router.get("/events", response_model=List[dict])
async def get_events(
    month: Optional[str] = None,
    page: int = 1,
    per_page: int = 100,
    user: User = Depends(get_current_user),
):
    per_page = max(1, min(per_page, 500))
    page = max(1, page)
    query: dict = {"user_id": user.user_id}
    if month:
        validate_month_format(month)
        query["date"] = {"$gte": f"{month}-01", "$lte": f"{month}-31"}
    skip = (page - 1) * per_page
    events = await _db.db.events.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(per_page).to_list(length=None)
    return events


@router.post("/events", response_model=dict)
async def create_event(event_data: EventCreate, user: User = Depends(get_current_user)):
    event = Event(
        user_id=user.user_id,
        date=event_data.date,
        title=event_data.title,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        location=event_data.location,
        note=event_data.note,
    )
    await _db.db.events.insert_one(event.model_dump())
    return event.model_dump()


@router.post("/events/reset")
@limiter.limit("2/minute")
async def reset_all_events(request: Request, user: User = Depends(require_header_auth)):
    result = await _db.db.events.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} events"}


@router.put("/events/{event_id}", response_model=dict)
async def update_event(event_id: str, event_data: EventUpdate, user: User = Depends(get_current_user)):
    existing = await _db.db.events.find_one({"id": event_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    update_data = {k: v for k, v in event_data.model_dump().items() if v is not None}
    if update_data:
        await _db.db.events.update_one({"id": event_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await _db.db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    return updated


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.events.delete_one({"id": event_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}
