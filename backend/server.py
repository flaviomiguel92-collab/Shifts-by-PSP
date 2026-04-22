from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'shiftextra_db')]

# Create the main app

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://shifts-by-psp.vercel.app",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix

api_router = APIRouter(prefix="/api")

# Configure logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_id: str

# Shift Types: Manhã, Tarde, Noite, Férias, Folga, Excesso

class ShiftType:
    MANHA = "manha"
    TARDE = "tarde"
    NOITE = "noite"
    FERIAS = "ferias"
    FOLGA = "folga"
    EXCESSO = "excesso"  # Uses hours from bank

    SHIFT_TIMES = {
        "manha": {"start": "08:00", "end": "16:00"},
        "tarde": {"start": "16:00", "end": "00:00"},
        "noite": {"start": "00:00", "end": "08:00"},
        "ferias": {"start": None, "end": None},
        "folga": {"start": None, "end": None},
        "excesso": {"start": None, "end": None},
    }

class Shift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    shift_type: str  # manha, tarde, noite, ferias, folga, excesso
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format
    excess_hours: Optional[float] = None  # Hours to add (+) or deduct (-) from bank
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    excess_hours: Optional[float] = None
    note: Optional[str] = None

class ShiftUpdate(BaseModel):
    shift_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    excess_hours: Optional[float] = None
    note: Optional[str] = None

# Gratification Types: Hora Extra, Gratificação, Prémio

class GratificationType:
    HORA_EXTRA = "hora_extra"
    GRATIFICACAO = "gratificacao"
    PREMIO = "premio"

class Gratification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    gratification_type: str  # hora_extra, gratificacao, premio
    value: float  # Value in EUR
    note: Optional[str] = None
    shift_id: Optional[str] = None  # Optional association with a shift
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GratificationCreate(BaseModel):
    date: str
    gratification_type: str
    value: float
    note: Optional[str] = None
    shift_id: Optional[str] = None

class GratificationUpdate(BaseModel):
    date: Optional[str] = None
    gratification_type: Optional[str] = None
    value: Optional[float] = None
    note: Optional[str] = None
    shift_id: Optional[str] = None

# Hour Bank Entry - for tracking excess hours

class HourBankEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    hours: float  # Positive = added, Negative = used
    description: Optional[str] = None
    shift_id: Optional[str] = None  # Link to shift if applicable
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HourBankEntryCreate(BaseModel):
    date: str
    hours: float
    description: Optional[str] = None

# ==================== CUSTOM SHIFT TYPES & CYCLES ====================

class CustomShiftType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str  # Display name (e.g., "Manhã", "Noite 12h")
    short_name: str  # Short code (e.g., "M", "N12")
    color: str  # Hex color (e.g., "#F59E0B")
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format
    is_working: bool = True  # True = working shift, False = day off/vacation
    order: int = 0  # Display order
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomShiftTypeCreate(BaseModel):
    name: str
    short_name: str
    color: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: bool = True
    order: int = 0

class CustomShiftTypeUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: Optional[bool] = None
    order: Optional[int] = None

class CustomCycle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str  # Cycle name (e.g., "Ciclo PSP")
    pattern: List[str]  # List of shift type IDs in sequence
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomCycleCreate(BaseModel):
    name: str
    pattern: List[str]  # List of shift type IDs

class CustomCycleUpdate(BaseModel):
    name: Optional[str] = None
    pattern: Optional[List[str]] = None

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")

    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )

    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Check expiry with timezone awareness
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )

    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(session_request: SessionRequest, response: Response):
    """Exchange session_id for session_token via Emergent Auth"""
    try:
        async with httpx.AsyncClient() as client_http:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_request.session_id}
            )

            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")

            auth_data = auth_response.json()
    except httpx.RequestError as e:
        logger.error(f"Auth request error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")

    user_id = f"user_{uuid.uuid4().hex[:12]}"

    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": auth_data["email"]},
        {"_id": 0}
    )

    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data.get("name", existing_user.get("name")),
                "picture": auth_data.get("picture", existing_user.get("picture"))
            }}
        )
    else:
        # Create new user
        new_user = User(
            user_id=user_id,
            email=auth_data["email"],
            name=auth_data.get("name", "User"),
            picture=auth_data.get("picture")
        )
        await db.users.insert_one(new_user.dict())

    # Create session
    session_token = auth_data.get("session_token", str(uuid.uuid4()))
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )

    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})

    # Insert new session
    await db.user_sessions.insert_one(session.dict())

    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )

    # Get user data to return
    user_doc = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )

    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.dict()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user by deleting session"""
    session_token = request.cookies.get("session_token")

    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})

    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )

    return {"message": "Logged out successfully"}

# ==================== SHIFT ENDPOINTS ====================

@api_router.get("/shifts", response_model=List[dict])
async def get_shifts(
    month: Optional[str] = None,  # YYYY-MM format
    user: User = Depends(get_current_user)
):
    """Get all shifts for the current user, optionally filtered by month"""
    query = {"user_id": user.user_id}

    if month:
        # Filter by month (date starts with YYYY-MM)
        query["date"] = {"$regex": f"^{month}"}

    shifts = await db.shifts.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return shifts

@api_router.get("/shifts/{date}")
async def get_shift_by_date(date: str, user: User = Depends(get_current_user)):
    """Get shift for a specific date"""
    shift = await db.shifts.find_one(
        {"user_id": user.user_id, "date": date},
        {"_id": 0}
    )

    if not shift:
        return None

    return shift

@api_router.post("/shifts", response_model=dict)
async def create_shift(shift_data: ShiftCreate, user: User = Depends(get_current_user)):
    """Create a new shift"""
    # Check if shift already exists for this date
    existing = await db.shifts.find_one(
        {"user_id": user.user_id, "date": shift_data.date}
    )

    if existing:
        raise HTTPException(status_code=400, detail="Shift already exists for this date")

    # Set default times based on shift type
    start_time = shift_data.start_time
    end_time = shift_data.end_time

    if not start_time and shift_data.shift_type in ShiftType.SHIFT_TIMES:
        start_time = ShiftType.SHIFT_TIMES[shift_data.shift_type]["start"]
    if not end_time and shift_data.shift_type in ShiftType.SHIFT_TIMES:
        end_time = ShiftType.SHIFT_TIMES[shift_data.shift_type]["end"]

    shift = Shift(
        user_id=user.user_id,
        date=shift_data.date,
        shift_type=shift_data.shift_type,
        start_time=start_time,
        end_time=end_time,
        excess_hours=shift_data.excess_hours,
        note=shift_data.note
    )

    await db.shifts.insert_one(shift.dict())

    # If this is an excesso shift with hours, add to hour bank (negative = using hours)
    if shift_data.shift_type == "excesso" and shift_data.excess_hours:
        hour_entry = HourBankEntry(
            user_id=user.user_id,
            date=shift_data.date,
            hours=-abs(shift_data.excess_hours),  # Negative because we're using hours
            description=f"Turno excesso - {abs(shift_data.excess_hours)}h utilizadas",
            shift_id=shift.id
        )
        await db.hour_bank.insert_one(hour_entry.dict())

    return shift.dict()

@api_router.put("/shifts/{shift_id}", response_model=dict)
async def update_shift(
    shift_id: str,
    shift_data: ShiftUpdate,
    user: User = Depends(get_current_user)
):
    """Update an existing shift"""
    existing = await db.shifts.find_one(
        {"id": shift_id, "user_id": user.user_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")

    update_data = {k: v for k, v in shift_data.dict().items() if v is not None}

    if update_data:
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": update_data}
        )

    # Update hour bank if excess hours changed
    if shift_data.excess_hours is not None:
        # Remove old hour bank entry for this shift
        await db.hour_bank.delete_many({"shift_id": shift_id})

        # Add new entry if it's an excesso shift
        new_type = shift_data.shift_type or existing.get("shift_type")
        if new_type == "excesso" and shift_data.excess_hours:
            hour_entry = HourBankEntry(
                user_id=user.user_id,
                date=existing["date"],
                hours=-abs(shift_data.excess_hours),
                description=f"Turno excesso - {abs(shift_data.excess_hours)}h utilizadas",
                shift_id=shift_id
            )
            await db.hour_bank.insert_one(hour_entry.dict())

    updated = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return updated

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: User = Depends(get_current_user)):
    """Delete a shift"""
    result = await db.shifts.delete_one(
        {"id": shift_id, "user_id": user.user_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")

    # Also delete associated hour bank entry
    await db.hour_bank.delete_many({"shift_id": shift_id})

    return {"message": "Shift deleted successfully"}

# ==================== BULK SHIFTS ENDPOINT ====================

class BulkShiftItem(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class BulkShiftsRequest(BaseModel):
    shifts: List[BulkShiftItem]

@api_router.post("/shifts/bulk", response_model=dict)
async def create_or_update_shifts_bulk(
    bulk_data: BulkShiftsRequest,
    user: User = Depends(get_current_user)
):
    """Create or update multiple shifts at once (for cycle application)"""
    created_count = 0
    updated_count = 0

    for shift_item in bulk_data.shifts:
        # Check if shift already exists for this date
        existing = await db.shifts.find_one(
            {"user_id": user.user_id, "date": shift_item.date}
        )

        # Set default times based on shift type
        start_time = shift_item.start_time
        end_time = shift_item.end_time

        if not start_time and shift_item.shift_type in ShiftType.SHIFT_TIMES:
            start_time = ShiftType.SHIFT_TIMES[shift_item.shift_type]["start"]
        if not end_time and shift_item.shift_type in ShiftType.SHIFT_TIMES:
            end_time = ShiftType.SHIFT_TIMES[shift_item.shift_type]["end"]

        if existing:
            # Update existing shift
            await db.shifts.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "shift_type": shift_item.shift_type,
                    "start_time": start_time,
                    "end_time": end_time
                }}
            )
            updated_count += 1
        else:
            # Create new shift
            shift = Shift(
                user_id=user.user_id,
                date=shift_item.date,
                shift_type=shift_item.shift_type,
                start_time=start_time,
                end_time=end_time
            )
            await db.shifts.insert_one(shift.dict())
            created_count += 1

    return {
        "message": "Bulk operation completed",
        "created": created_count,
        "updated": updated_count,
        "total": created_count + updated_count
    }

# ==================== GRATIFICATION ENDPOINTS ====================

@api_router.get("/gratifications", response_model=List[dict])
async def get_gratifications(
    month: Optional[str] = None,  # YYYY-MM format
    year: Optional[str] = None,  # YYYY format
    user: User = Depends(get_current_user)
):
    """Get all gratifications for the current user"""
    query = {"user_id": user.user_id}

    if month:
        query["date"] = {"$regex": f"^{month}"}
    elif year:
        query["date"] = {"$regex": f"^{year}"}

    gratifications = await db.gratifications.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return gratifications

@api_router.post("/gratifications", response_model=dict)
async def create_gratification(
    grat_data: GratificationCreate,
    user: User = Depends(get_current_user)
):
    """Create a new gratification"""
    gratification = Gratification(
        user_id=user.user_id,
        date=grat_data.date,
        gratification_type=grat_data.gratification_type,
        value=grat_data.value,
        note=grat_data.note,
        shift_id=grat_data.shift_id
    )

    await db.gratifications.insert_one(gratification.dict())

    return gratification.dict()

@api_router.put("/gratifications/{grat_id}", response_model=dict)
async def update_gratification(
    grat_id: str,
    grat_data: GratificationUpdate,
    user: User = Depends(get_current_user)
):
    """Update an existing gratification"""
    existing = await db.gratifications.find_one(
        {"id": grat_id, "user_id": user.user_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Gratification not found")

    update_data = {k: v for k, v in grat_data.dict().items() if v is not None}

    if update_data:
        await db.gratifications.update_one(
            {"id": grat_id},
            {"$set": update_data}
        )

    updated = await db.gratifications.find_one({"id": grat_id}, {"_id": 0})
    return updated

@api_router.delete("/gratifications/{grat_id}")
async def delete_gratification(grat_id: str, user: User = Depends(get_current_user)):
    """Delete a gratification"""
    result = await db.gratifications.delete_one(
        {"id": grat_id, "user_id": user.user_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gratification not found")

    return {"message": "Gratification deleted successfully"}

# ==================== HOUR BANK ENDPOINTS ====================

@api_router.get("/hour-bank", response_model=List[dict])
async def get_hour_bank_entries(
    year: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get all hour bank entries"""
    query = {"user_id": user.user_id}

    if year:
        query["date"] = {"$regex": f"^{year}"}

    entries = await db.hour_bank.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return entries

@api_router.post("/hour-bank", response_model=dict)
async def add_hour_bank_entry(
    entry_data: HourBankEntryCreate,
    user: User = Depends(get_current_user)
):
    """Add hours to the hour bank (accumulate excess hours)"""
    entry = HourBankEntry(
        user_id=user.user_id,
        date=entry_data.date,
        hours=entry_data.hours,
        description=entry_data.description or f"Horas acumuladas: {entry_data.hours}h"
    )

    await db.hour_bank.insert_one(entry.dict())

    return entry.dict()

@api_router.delete("/hour-bank/{entry_id}")
async def delete_hour_bank_entry(entry_id: str, user: User = Depends(get_current_user)):
    """Delete an hour bank entry"""
    result = await db.hour_bank.delete_one(
        {"id": entry_id, "user_id": user.user_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")

    return {"message": "Entry deleted successfully"}

@api_router.get("/hour-bank/balance")
async def get_hour_bank_balance(user: User = Depends(get_current_user)):
    """Get current hour bank balance"""
    entries = await db.hour_bank.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(10000)

    total_hours = sum(e.get("hours", 0) for e in entries)

    # Get entries by year
    current_year = datetime.now().year
    year_entries = [e for e in entries if e.get("date", "").startswith(str(current_year))]
    year_hours = sum(e.get("hours", 0) for e in year_entries)

    # Count additions and deductions
    added = sum(e.get("hours", 0) for e in entries if e.get("hours", 0) > 0)
    used = abs(sum(e.get("hours", 0) for e in entries if e.get("hours", 0) < 0))

    return {
        "total_balance": total_hours,
        "year_balance": year_hours,
        "total_added": added,
        "total_used": used,
        "entries_count": len(entries)
    }

# ==================== STATISTICS ENDPOINTS ====================

@api_router.get("/stats/monthly/{month}")
async def get_monthly_stats(month: str, user: User = Depends(get_current_user)):
    """Get monthly statistics (month format: YYYY-MM)"""
    gratifications = await db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)

    total = sum(g["value"] for g in gratifications)
    count = len(gratifications)

    # Group by type
    by_type = {}
    for g in gratifications:
        gtype = g["gratification_type"]
        if gtype not in by_type:
            by_type[gtype] = {"total": 0, "count": 0}
        by_type[gtype]["total"] += g["value"]
        by_type[gtype]["count"] += 1

    # Get shifts count for this month
    shifts = await db.shifts.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)

    shifts_by_type = {}
    for s in shifts:
        stype = s["shift_type"]
        if stype not in shifts_by_type:
            shifts_by_type[stype] = 0
        shifts_by_type[stype] += 1

    return {
        "month": month,
        "total_gratifications": total,
        "gratification_count": count,
        "by_type": by_type,
        "shifts_count": len(shifts),
        "shifts_by_type": shifts_by_type
    }

@api_router.get("/stats/yearly/{year}")
async def get_yearly_stats(year: str, user: User = Depends(get_current_user)):
    """Get yearly statistics (year format: YYYY)"""
    gratifications = await db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{year}"}},
        {"_id": 0}
    ).to_list(1000)

    total = sum(g["value"] for g in gratifications)
    count = len(gratifications)

    # Group by month
    by_month = {}
    for g in gratifications:
        month = g["date"][:7]  # YYYY-MM
        if month not in by_month:
            by_month[month] = {"total": 0, "count": 0}
        by_month[month]["total"] += g["value"]
        by_month[month]["count"] += 1

    # Group by type
    by_type = {}
    for g in gratifications:
        gtype = g["gratification_type"]
        if gtype not in by_type:
            by_type[gtype] = {"total": 0, "count": 0}
        by_type[gtype]["total"] += g["value"]
        by_type[gtype]["count"] += 1

    # Get shifts for the year
    shifts = await db.shifts.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{year}"}},
        {"_id": 0}
    ).to_list(1000)

    # Count folgas
    folgas_count = len([s for s in shifts if s.get("shift_type") == "folga"])
    ferias_count = len([s for s in shifts if s.get("shift_type") == "ferias"])
    excesso_count = len([s for s in shifts if s.get("shift_type") == "excesso"])

    # Get hour bank balance for the year
    hour_entries = await db.hour_bank.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{year}"}},
        {"_id": 0}
    ).to_list(1000)

    hour_bank_balance = sum(e.get("hours", 0) for e in hour_entries)
    hours_added = sum(e.get("hours", 0) for e in hour_entries if e.get("hours", 0) > 0)
    hours_used = abs(sum(e.get("hours", 0) for e in hour_entries if e.get("hours", 0) < 0))

    return {
        "year": year,
        "total_gratifications": total,
        "gratification_count": count,
        "by_month": by_month,
        "by_type": by_type,
        "folgas_count": folgas_count,
        "ferias_count": ferias_count,
        "excesso_count": excesso_count,
        "hour_bank_balance": hour_bank_balance,
        "hours_added": hours_added,
        "hours_used": hours_used
    }

@api_router.get("/stats/comparison")
async def get_comparison_stats(user: User = Depends(get_current_user)):
    """Get comparison between last 6 months"""
    today = datetime.now()
    months_data = []

    for i in range(6):
        month_date = today - timedelta(days=30 * i)
        month_str = month_date.strftime("%Y-%m")

        gratifications = await db.gratifications.find(
            {"user_id": user.user_id, "date": {"$regex": f"^{month_str}"}},
            {"_id": 0}
        ).to_list(1000)

        total = sum(g["value"] for g in gratifications)

        months_data.append({
            "month": month_str,
            "total": total,
            "count": len(gratifications)
        })

    return {"months": list(reversed(months_data))}

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    """Get all dashboard statistics"""
    current_year = str(datetime.now().year)
    current_month = datetime.now().strftime("%Y-%m")

    # Monthly gratifications
    monthly_grats = await db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{current_month}"}},
        {"_id": 0}
    ).to_list(1000)
    monthly_total = sum(g["value"] for g in monthly_grats)

    # Yearly gratifications
    yearly_grats = await db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{current_year}"}},
        {"_id": 0}
    ).to_list(1000)
    yearly_total = sum(g["value"] for g in yearly_grats)

    # Hour bank balance
    hour_entries = await db.hour_bank.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(10000)
    hour_bank_total = sum(e.get("hours", 0) for e in hour_entries)

    # Year hour bank
    year_hour_entries = [e for e in hour_entries if e.get("date", "").startswith(current_year)]
    year_hour_balance = sum(e.get("hours", 0) for e in year_hour_entries)
    hours_added = sum(e.get("hours", 0) for e in year_hour_entries if e.get("hours", 0) > 0)
    hours_used = abs(sum(e.get("hours", 0) for e in year_hour_entries if e.get("hours", 0) < 0))

    # Shifts this year
    shifts = await db.shifts.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{current_year}"}},
        {"_id": 0}
    ).to_list(1000)

    folgas_count = len([s for s in shifts if s.get("shift_type") == "folga"])
    ferias_count = len([s for s in shifts if s.get("shift_type") == "ferias"])
    excesso_count = len([s for s in shifts if s.get("shift_type") == "excesso"])

    return {
        "monthly_total": monthly_total,
        "yearly_total": yearly_total,
        "hour_bank_balance": hour_bank_total,
        "year_hour_balance": year_hour_balance,
        "hours_added": hours_added,
        "hours_used": hours_used,
        "folgas_count": folgas_count,
        "ferias_count": ferias_count,
        "excesso_count": excesso_count,
        "current_month": current_month,
        "current_year": current_year
    }

# ==================== OCCURRENCE MODELS ====================

class PersonInOccurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # suspeito, testemunha, lesado
    full_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_id: Optional[str] = None  # NIF
    document_type: str  # cartao_cidadao, passaporte, titulo_residencia, carta_conducao
    document_number: Optional[str] = None
    document_issue_date: Optional[str] = None
    document_expiry_date: Optional[str] = None
    photos: List[str] = []  # Base64 images
    notes: Optional[str] = None

class Occurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM
    location: str
    description: str
    classification: str  # Type of occurrence
    status: str = "rascunho"  # rascunho, em_analise, concluido, arquivado
    photos: List[str] = []  # Base64 images
    suspects: List[PersonInOccurrence] = []
    witnesses: List[PersonInOccurrence] = []
    victims: List[PersonInOccurrence] = []  # Lesados
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OccurrenceCreate(BaseModel):
    date: str
    time: Optional[str] = None
    location: str
    description: str
    classification: str
    status: Optional[str] = "rascunho"
    photos: Optional[List[str]] = []

class OccurrenceUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    classification: Optional[str] = None
    status: Optional[str] = None
    photos: Optional[List[str]] = None

class PersonCreate(BaseModel):
    role: str
    full_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_id: Optional[str] = None
    document_type: str
    document_number: Optional[str] = None
    document_issue_date: Optional[str] = None
    document_expiry_date: Optional[str] = None
    photos: Optional[List[str]] = []
    notes: Optional[str] = None

# ==================== OCCURRENCE ENDPOINTS (SEM AUTENTICACAO) ====================

@api_router.get("/occurrences", response_model=List[dict])
async def get_occurrences(
    status: Optional[str] = None,
    classification: Optional[str] = None
):
    """Get all occurrences"""
    query = {}

    if status:
        query["status"] = status
    if classification:
        query["classification"] = classification

    occurrences = await db.occurrences.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return occurrences

@api_router.get("/occurrences/{occurrence_id}")
async def get_occurrence(occurrence_id: str):
    """Get a specific occurrence"""
    occurrence = await db.occurrences.find_one(
        {"id": occurrence_id},
        {"_id": 0}
    )

    if not occurrence:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    return occurrence

@api_router.post("/occurrences", response_model=dict)
async def create_occurrence(occ_data: OccurrenceCreate):
    """Create a new occurrence"""
    occurrence = Occurrence(
        user_id="demo_user",
        date=occ_data.date,
        time=occ_data.time,
        location=occ_data.location,
        description=occ_data.description,
        classification=occ_data.classification,
        status=occ_data.status or "rascunho",
        photos=occ_data.photos or []
    )

    await db.occurrences.insert_one(occurrence.dict())

    return occurrence.dict()

@api_router.put("/occurrences/{occurrence_id}", response_model=dict)
async def update_occurrence(
    occurrence_id: str,
    occ_data: OccurrenceUpdate
):
    """Update an existing occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    update_data = {k: v for k, v in occ_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    if update_data:
        await db.occurrences.update_one(
            {"id": occurrence_id},
            {"$set": update_data}
        )

    updated = await db.occurrences.find_one({"id": occurrence_id}, {"_id": 0})
    return updated

@api_router.delete("/occurrences/{occurrence_id}")
async def delete_occurrence(occurrence_id: str):
    """Delete an occurrence"""
    result = await db.occurrences.delete_one(
        {"id": occurrence_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    return {"message": "Occurrence deleted successfully"}

# Person management within occurrences

@api_router.post("/occurrences/{occurrence_id}/persons", response_model=dict)
async def add_person_to_occurrence(
    occurrence_id: str,
    person_data: PersonCreate
):
    """Add a person (suspect, witness, or victim) to an occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    person = PersonInOccurrence(
        role=person_data.role,
        full_name=person_data.full_name,
        address=person_data.address,
        phone=person_data.phone,
        email=person_data.email,
        tax_id=person_data.tax_id,
        document_type=person_data.document_type,
        document_number=person_data.document_number,
        document_issue_date=person_data.document_issue_date,
        document_expiry_date=person_data.document_expiry_date,
        photos=person_data.photos or [],
        notes=person_data.notes
    )

    # Determine which array to add to based on role
    role_map = {
        "suspeito": "suspects",
        "testemunha": "witnesses",
        "lesado": "victims"
    }

    array_name = role_map.get(person_data.role, "suspects")

    await db.occurrences.update_one(
        {"id": occurrence_id},
        {
            "$push": {array_name: person.dict()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    updated = await db.occurrences.find_one({"id": occurrence_id}, {"_id": 0})
    return updated

@api_router.delete("/occurrences/{occurrence_id}/persons/{person_id}")
async def remove_person_from_occurrence(
    occurrence_id: str,
    person_id: str
):
    """Remove a person from an occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    # Remove from all arrays
    await db.occurrences.update_one(
        {"id": occurrence_id},
        {
            "$pull": {
                "suspects": {"id": person_id},
                "witnesses": {"id": person_id},
                "victims": {"id": person_id}
            },
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    return {"message": "Person removed successfully"}

@api_router.post("/occurrences/{occurrence_id}/photos")
async def add_photo_to_occurrence(
    occurrence_id: str,
    photo_data: dict
):
    """Add a photo to an occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    photo_base64 = photo_data.get("photo")
    if not photo_base64:
        raise HTTPException(status_code=400, detail="Photo data required")

    await db.occurrences.update_one(
        {"id": occurrence_id},
        {
            "$push": {"photos": photo_base64},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    return {"message": "Photo added successfully"}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "ShiftExtra API", "version": "1.0.0"}

# Include the router in the main app

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
