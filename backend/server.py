from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, validator, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import re

ROOT_DIR = Path(__file__).parent

# Date format validation helpers (anti-NoSQL-injection)
MONTH_RE = re.compile(r'^\d{4}-(?:0[1-9]|1[0-2])$')
YEAR_RE = re.compile(r'^\d{4}$')
DATE_RE = re.compile(r'^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$')

def validate_month_format(month: str) -> None:
    if not MONTH_RE.match(month):
        raise HTTPException(status_code=400, detail=f"Formato de mês inválido: {month}. Use YYYY-MM")

def validate_year_format(year: str) -> None:
    if not YEAR_RE.match(year):
        raise HTTPException(status_code=400, detail=f"Formato de ano inválido: {year}. Use YYYY")

def validate_date_format(date: str) -> None:
    if not DATE_RE.match(date):
        raise HTTPException(status_code=400, detail=f"Formato de data inválido: {date}. Use YYYY-MM-DD")

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'shiftextra_db')]

app = FastAPI()

_TESTING = os.environ.get('TESTING', '') == 'true'
_AUTH_RATE = "9999/minute" if _TESTING else "5/minute"
_REPORT_RATE = "9999/minute" if _TESTING else "3/minute"

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CORS_ORIGINS = os.environ.get(
    'CORS_ORIGINS',
    'https://shifts-by-psp.vercel.app,http://localhost:3000,http://localhost:8000'
).split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_IS_PRODUCTION = os.environ.get('ENVIRONMENT', '').lower() == 'production'

def _cookie_flags() -> dict:
    """Return cookie security flags appropriate for the current environment.

    Production (cross-origin, HTTPS): secure=True, samesite=none required for cookies
    to be sent in cross-origin fetch with credentials.
    Development (localhost, HTTP): secure=False, samesite=lax to work without HTTPS.
    """
    if _IS_PRODUCTION:
        return {"secure": True, "samesite": "none"}
    return {"secure": False, "samesite": "lax"}

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserPublic(BaseModel):
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

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('A password deve ter pelo menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('A password deve conter pelo menos uma letra maiúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('A password deve conter pelo menos um número')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Shift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None

    @validator('date')
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v

class ShiftUpdate(BaseModel):
    shift_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None

class Gratification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    gratification_type: str
    value: float
    note: Optional[str] = None
    shift_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GratificationCreate(BaseModel):
    date: str
    gratification_type: str
    value: float = Field(ge=0)
    note: Optional[str] = None
    shift_id: Optional[str] = None

    @validator('date')
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v

class GratificationUpdate(BaseModel):
    date: Optional[str] = None
    gratification_type: Optional[str] = None
    value: Optional[float] = None
    note: Optional[str] = None
    shift_id: Optional[str] = None

# ==================== CUSTOM SHIFT TYPES & CYCLES ====================

class CustomShiftType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    short_name: str
    color: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomShiftTypeCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
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
    name: str
    pattern: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomCycleCreate(BaseModel):
    name: str
    pattern: List[str]

class CustomCycleUpdate(BaseModel):
    name: Optional[str] = None
    pattern: Optional[List[str]] = None

class GratifiedCalendarEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    value: Optional[float] = None
    subtotal: Optional[float] = None
    discount_percent: Optional[float] = None
    is_holiday_or_weekend: Optional[bool] = None
    note: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GratifiedCalendarEntryCreate(BaseModel):
    date: str
    name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    value: Optional[float] = Field(default=None, ge=0)
    subtotal: Optional[float] = Field(default=None, ge=0)
    discount_percent: Optional[float] = Field(default=None, ge=0, le=100)
    is_holiday_or_weekend: Optional[bool] = None
    note: Optional[str] = None

    @validator('date')
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header[7:]
    else:
        session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    session_doc = await db.user_sessions.find_one({"session_token": token_hash}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
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
    session_doc = await db.user_sessions.find_one({"session_token": token_hash}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
@limiter.limit(_AUTH_RATE)
async def register(data: RegisterRequest, request: Request, response: Response):
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado")
    password_hash = pwd_context.hash(data.password)
    user_id = str(uuid.uuid4())
    user = {"user_id": user_id, "email": data.email, "name": data.name, "password_hash": password_hash, "created_at": datetime.now(timezone.utc)}
    await db.users.insert_one(user)
    session_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {"session_id": str(uuid.uuid4()), "user_id": user_id, "session_token": token_hash, "expires_at": expires_at, "created_at": datetime.now(timezone.utc)}
    await db.user_sessions.insert_one(session)
    response.set_cookie(key="session_token", value=session_token, httponly=True, path="/", max_age=7 * 24 * 60 * 60, **_cookie_flags())
    return {"user": {"user_id": user_id, "email": user["email"], "name": user["name"], "picture": None, "created_at": user["created_at"].isoformat()}, "session_token": session_token}

@api_router.post("/auth/login")
@limiter.limit(_AUTH_RATE)
async def login(data: LoginRequest, request: Request, response: Response):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.get("password_hash") or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    user_id = user["user_id"]
    await db.user_sessions.delete_many({"user_id": user_id})
    session_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {"session_id": str(uuid.uuid4()), "user_id": user_id, "session_token": token_hash, "expires_at": expires_at, "created_at": datetime.now(timezone.utc)}
    await db.user_sessions.insert_one(session)
    response.set_cookie(key="session_token", value=session_token, httponly=True, path="/", max_age=7 * 24 * 60 * 60, **_cookie_flags())
    return {"user": {"user_id": user_id, "email": user["email"], "name": user["name"], "picture": user.get("picture"), "created_at": user["created_at"].isoformat()}, "session_token": session_token}

@api_router.get("/auth/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)):
    return UserPublic(**user.model_dump())

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header[7:]
    else:
        session_token = request.cookies.get("session_token")
    if session_token:
        token_hash = hashlib.sha256(session_token.encode()).hexdigest()
        await db.user_sessions.delete_many({"session_token": token_hash})
    response.delete_cookie(key="session_token", path="/", **_cookie_flags())
    return {"message": "Logged out successfully"}

@api_router.get("/auth/sessions")
async def list_sessions(request: Request, user: User = Depends(get_current_user)):
    raw_token = request.cookies.get("session_token")
    if not raw_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header[7:]
    current_hash = hashlib.sha256(raw_token.encode()).hexdigest() if raw_token else None
    sessions = await db.user_sessions.find(
        {"user_id": user.user_id},
        {"_id": 0, "session_id": 1, "created_at": 1, "expires_at": 1, "session_token": 1}
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

@api_router.delete("/auth/sessions/{session_id}")
async def revoke_session(session_id: str, user: User = Depends(get_current_user)):
    result = await db.user_sessions.delete_one({"session_id": session_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session revoked"}

# ==================== SHIFT ENDPOINTS ====================

class BulkShiftItem(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class BulkShiftsRequest(BaseModel):
    shifts: List[BulkShiftItem]

@api_router.get("/shifts", response_model=List[dict])
async def get_shifts(month: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if month:
        validate_month_format(month)
        query["date"] = {"$regex": f"^{month}"}
    shifts = await db.shifts.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return shifts

@api_router.post("/shifts", response_model=dict)
async def create_shift(shift_data: ShiftCreate, user: User = Depends(get_current_user)):
    existing = await db.shifts.find_one({"user_id": user.user_id, "date": shift_data.date})
    if existing:
        raise HTTPException(status_code=400, detail="Shift already exists for this date")
    shift = Shift(user_id=user.user_id, date=shift_data.date, shift_type=shift_data.shift_type, start_time=shift_data.start_time, end_time=shift_data.end_time, note=shift_data.note)
    await db.shifts.insert_one(shift.model_dump())
    return shift.model_dump()

@api_router.post("/shifts/reset")
async def reset_all_shifts(user: User = Depends(require_header_auth)):
    result = await db.shifts.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} shifts"}

@api_router.post("/shifts/bulk", response_model=dict)
async def create_or_update_shifts_bulk(bulk_data: BulkShiftsRequest, user: User = Depends(get_current_user)):
    created_count = 0
    updated_count = 0
    for shift_item in bulk_data.shifts:
        existing = await db.shifts.find_one({"user_id": user.user_id, "date": shift_item.date})
        if existing:
            update_fields: dict = {"shift_type": shift_item.shift_type}
            if shift_item.start_time is not None:
                update_fields["start_time"] = shift_item.start_time
            if shift_item.end_time is not None:
                update_fields["end_time"] = shift_item.end_time
            await db.shifts.update_one({"id": existing["id"], "user_id": user.user_id}, {"$set": update_fields})
            updated_count += 1
        else:
            shift = Shift(user_id=user.user_id, date=shift_item.date, shift_type=shift_item.shift_type, start_time=shift_item.start_time, end_time=shift_item.end_time)
            await db.shifts.insert_one(shift.model_dump())
            created_count += 1
    return {"message": "Bulk operation completed", "created": created_count, "updated": updated_count, "total": created_count + updated_count}

@api_router.get("/shifts/{date}")
async def get_shift_by_date(date: str, user: User = Depends(get_current_user)):
    shift = await db.shifts.find_one({"user_id": user.user_id, "date": date}, {"_id": 0})
    return shift

@api_router.put("/shifts/{shift_id}", response_model=dict)
async def update_shift(shift_id: str, shift_data: ShiftUpdate, user: User = Depends(get_current_user)):
    existing = await db.shifts.find_one({"id": shift_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")
    update_data = {k: v for k, v in shift_data.model_dump().items() if v is not None}
    if update_data:
        await db.shifts.update_one({"id": shift_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return updated

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: User = Depends(get_current_user)):
    result = await db.shifts.delete_one({"id": shift_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Shift deleted successfully"}

# ==================== CYCLES ENDPOINTS ====================

@api_router.get("/cycles", response_model=List[dict])
async def get_cycles(user: User = Depends(get_current_user)):
    cycles = await db.cycles.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return cycles

@api_router.post("/cycles", response_model=dict)
async def create_cycle(cycle_data: CustomCycleCreate, user: User = Depends(get_current_user)):
    cycle = CustomCycle(user_id=user.user_id, name=cycle_data.name, pattern=cycle_data.pattern)
    await db.cycles.insert_one(cycle.model_dump())
    return cycle.model_dump()

@api_router.post("/cycles/reset")
async def reset_all_cycles(user: User = Depends(require_header_auth)):
    result = await db.cycles.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} cycles"}

@api_router.put("/cycles/{cycle_id}", response_model=dict)
async def update_cycle(cycle_id: str, data: CustomCycleUpdate, user: User = Depends(get_current_user)):
    existing = await db.cycles.find_one({"id": cycle_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cycle not found")
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_fields:
        await db.cycles.update_one({"id": cycle_id, "user_id": user.user_id}, {"$set": update_fields})
    updated = await db.cycles.find_one({"id": cycle_id}, {"_id": 0})
    return updated

@api_router.delete("/cycles/{cycle_id}")
async def delete_cycle(cycle_id: str, user: User = Depends(get_current_user)):
    result = await db.cycles.delete_one({"id": cycle_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cycle not found")
    return {"message": "Cycle deleted"}

# ==================== GRATIFICATION ENDPOINTS ====================

@api_router.get("/gratifications", response_model=List[dict])
async def get_gratifications(month: Optional[str] = None, year: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if month:
        validate_month_format(month)
        query["date"] = {"$regex": f"^{month}"}
    elif year:
        validate_year_format(year)
        query["date"] = {"$regex": f"^{year}"}
    gratifications = await db.gratifications.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return gratifications

@api_router.post("/gratifications", response_model=dict)
async def create_gratification(grat_data: GratificationCreate, user: User = Depends(get_current_user)):
    gratification = Gratification(user_id=user.user_id, date=grat_data.date, gratification_type=grat_data.gratification_type, value=grat_data.value, note=grat_data.note, shift_id=grat_data.shift_id)
    await db.gratifications.insert_one(gratification.model_dump())
    return gratification.model_dump()

@api_router.put("/gratifications/{grat_id}", response_model=dict)
async def update_gratification(grat_id: str, grat_data: GratificationUpdate, user: User = Depends(get_current_user)):
    existing = await db.gratifications.find_one({"id": grat_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Gratification not found")
    update_data = {k: v for k, v in grat_data.model_dump().items() if v is not None}
    if update_data:
        await db.gratifications.update_one({"id": grat_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await db.gratifications.find_one({"id": grat_id}, {"_id": 0})
    return updated

@api_router.delete("/gratifications/{grat_id}")
async def delete_gratification(grat_id: str, user: User = Depends(get_current_user)):
    result = await db.gratifications.delete_one({"id": grat_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gratification not found")
    return {"message": "Gratification deleted successfully"}

# ==================== GRATIFIED CALENDAR ENTRIES ====================

@api_router.get("/gratified-entries", response_model=List[dict])
async def get_gratified_entries(month: Optional[str] = None, user: User = Depends(get_current_user)):
    query: dict = {"user_id": user.user_id}
    if month:
        validate_month_format(month)
        query["date"] = {"$regex": f"^{month}"}
    entries = await db.gratified_entries.find(query, {"_id": 0}).sort("date", -1).to_list(2000)
    return entries

@api_router.post("/gratified-entries", response_model=dict)
async def create_gratified_entry(entry_data: GratifiedCalendarEntryCreate, user: User = Depends(get_current_user)):
    validate_date_format(entry_data.date)
    entry = GratifiedCalendarEntry(user_id=user.user_id, **entry_data.model_dump())
    await db.gratified_entries.insert_one(entry.model_dump())
    return entry.model_dump()

@api_router.delete("/gratified-entries/{entry_id}")
async def delete_gratified_entry(entry_id: str, user: User = Depends(get_current_user)):
    result = await db.gratified_entries.delete_one({"id": entry_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}

@api_router.post("/gratified-entries/reset")
async def reset_all_gratified_entries(user: User = Depends(require_header_auth)):
    result = await db.gratified_entries.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} gratified entries"}

# ==================== STATISTICS ENDPOINTS ====================

@api_router.get("/stats/monthly/{month}")
async def get_monthly_stats(month: str, user: User = Depends(get_current_user)):
    validate_month_format(month)
    gratifications = await db.gratifications.find({"user_id": user.user_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(1000)
    total = sum(g["value"] for g in gratifications)
    count = len(gratifications)
    by_type = {}
    for g in gratifications:
        gtype = g["gratification_type"]
        if gtype not in by_type:
            by_type[gtype] = {"total": 0, "count": 0}
        by_type[gtype]["total"] += g["value"]
        by_type[gtype]["count"] += 1
    shifts = await db.shifts.find({"user_id": user.user_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(1000)
    shifts_by_type = {}
    for s in shifts:
        stype = s["shift_type"]
        if stype not in shifts_by_type:
            shifts_by_type[stype] = 0
        shifts_by_type[stype] += 1
    return {"month": month, "total_gratifications": total, "gratification_count": count, "by_type": by_type, "shifts_count": len(shifts), "shifts_by_type": shifts_by_type}

@api_router.get("/stats/yearly/{year}")
async def get_yearly_stats(year: str, user: User = Depends(get_current_user)):
    validate_year_format(year)
    gratifications = await db.gratifications.find({"user_id": user.user_id, "date": {"$regex": f"^{year}"}}, {"_id": 0}).to_list(1000)
    total = sum(g["value"] for g in gratifications)
    count = len(gratifications)
    by_month = {}
    for g in gratifications:
        m = g["date"][:7]
        if m not in by_month:
            by_month[m] = {"total": 0, "count": 0}
        by_month[m]["total"] += g["value"]
        by_month[m]["count"] += 1
    by_type = {}
    for g in gratifications:
        gtype = g["gratification_type"]
        if gtype not in by_type:
            by_type[gtype] = {"total": 0, "count": 0}
        by_type[gtype]["total"] += g["value"]
        by_type[gtype]["count"] += 1
    return {"year": year, "total_gratifications": total, "gratification_count": count, "by_month": by_month, "by_type": by_type}

@api_router.get("/stats/comparison")
async def get_comparison_stats(user: User = Depends(get_current_user)):
    today = datetime.now()
    months_data = []
    for i in range(6):
        month_date = today - timedelta(days=30 * i)
        month_str = month_date.strftime("%Y-%m")
        gratifications = await db.gratifications.find({"user_id": user.user_id, "date": {"$regex": f"^{month_str}"}}, {"_id": 0}).to_list(1000)
        total = sum(g["value"] for g in gratifications)
        months_data.append({"month": month_str, "total": total, "count": len(gratifications)})
    return {"months": list(reversed(months_data))}

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    current_year = str(datetime.now().year)
    current_month = datetime.now().strftime("%Y-%m")
    monthly_grats = await db.gratifications.find({"user_id": user.user_id, "date": {"$regex": f"^{current_month}"}}, {"_id": 0}).to_list(1000)
    monthly_total = sum(g["value"] for g in monthly_grats)
    yearly_grats = await db.gratifications.find({"user_id": user.user_id, "date": {"$regex": f"^{current_year}"}}, {"_id": 0}).to_list(1000)
    yearly_total = sum(g["value"] for g in yearly_grats)
    return {"monthly_total": monthly_total, "yearly_total": yearly_total, "current_month": current_month, "current_year": current_year}

# ==================== OCCURRENCE MODELS ====================

class PersonInOccurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    photos: List[str] = []
    notes: Optional[str] = None

class Occurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    time: Optional[str] = None
    location: str
    description: str
    classification: str
    status: str = "rascunho"
    photos: List[str] = []
    suspects: List[PersonInOccurrence] = []
    witnesses: List[PersonInOccurrence] = []
    victims: List[PersonInOccurrence] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

_MAX_PHOTOS = 5
_MAX_PHOTO_CHARS = 3_000_000  # ~2 MB raw before base64 encoding

class OccurrenceCreate(BaseModel):
    date: str
    time: Optional[str] = None
    location: str
    description: str
    classification: str
    status: Optional[str] = "rascunho"
    photos: Optional[List[str]] = []

    @validator('photos')
    def validate_photos(cls, v):
        if v and len(v) > _MAX_PHOTOS:
            raise ValueError(f"Máximo de {_MAX_PHOTOS} fotos permitidas")
        if v:
            for photo in v:
                if len(photo) > _MAX_PHOTO_CHARS:
                    raise ValueError("Cada foto não pode exceder 2 MB")
        return v

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

    @validator('photos')
    def validate_photos(cls, v):
        if v and len(v) > _MAX_PHOTOS:
            raise ValueError(f"Máximo de {_MAX_PHOTOS} fotos permitidas")
        if v:
            for photo in v:
                if len(photo) > _MAX_PHOTO_CHARS:
                    raise ValueError("Cada foto não pode exceder 2 MB")
        return v

# ==================== OCCURRENCE ENDPOINTS ====================

@api_router.post("/occurrences/reset")
async def reset_all_occurrences(user: User = Depends(require_header_auth)):
    result = await db.occurrences.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} occurrences"}

@api_router.get("/occurrences", response_model=List[dict])
async def get_occurrences(status: Optional[str] = None, classification: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if status:
        query["status"] = status
    if classification:
        query["classification"] = classification
    occurrences = await db.occurrences.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return occurrences

@api_router.get("/occurrences/{occurrence_id}")
async def get_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    occurrence = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id}, {"_id": 0})
    if not occurrence:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    return occurrence

@api_router.post("/occurrences", response_model=dict)
async def create_occurrence(occ_data: OccurrenceCreate, user: User = Depends(get_current_user)):
    occurrence = Occurrence(user_id=user.user_id, date=occ_data.date, time=occ_data.time, location=occ_data.location, description=occ_data.description, classification=occ_data.classification, status=occ_data.status or "rascunho", photos=occ_data.photos or [])
    await db.occurrences.insert_one(occurrence.model_dump())
    return occurrence.model_dump()

@api_router.put("/occurrences/{occurrence_id}", response_model=dict)
async def update_occurrence(occurrence_id: str, occ_data: OccurrenceUpdate, user: User = Depends(get_current_user)):
    existing = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    update_data = {k: v for k, v in occ_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    if update_data:
        await db.occurrences.update_one({"id": occurrence_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id}, {"_id": 0})
    return updated

@api_router.delete("/occurrences/{occurrence_id}")
async def delete_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    result = await db.occurrences.delete_one({"id": occurrence_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    return {"message": "Occurrence deleted successfully"}

@api_router.post("/occurrences/{occurrence_id}/persons", response_model=dict)
async def add_person_to_occurrence(occurrence_id: str, person_data: PersonCreate, user: User = Depends(get_current_user)):
    existing = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    person = PersonInOccurrence(role=person_data.role, full_name=person_data.full_name, address=person_data.address, phone=person_data.phone, email=person_data.email, tax_id=person_data.tax_id, document_type=person_data.document_type, document_number=person_data.document_number, document_issue_date=person_data.document_issue_date, document_expiry_date=person_data.document_expiry_date, photos=person_data.photos or [], notes=person_data.notes)
    role_map = {"suspeito": "suspects", "testemunha": "witnesses", "lesado": "victims"}
    array_name = role_map.get(person_data.role, "suspects")
    await db.occurrences.update_one({"id": occurrence_id, "user_id": user.user_id}, {"$push": {array_name: person.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc)}})
    updated = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id}, {"_id": 0})
    return updated

@api_router.delete("/occurrences/{occurrence_id}/persons/{person_id}")
async def remove_person_from_occurrence(occurrence_id: str, person_id: str, user: User = Depends(get_current_user)):
    existing = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    await db.occurrences.update_one({"id": occurrence_id, "user_id": user.user_id}, {"$pull": {"suspects": {"id": person_id}, "witnesses": {"id": person_id}, "victims": {"id": person_id}}, "$set": {"updated_at": datetime.now(timezone.utc)}})
    return {"message": "Person removed successfully"}

@api_router.post("/occurrences/{occurrence_id}/photos")
async def add_photo_to_occurrence(occurrence_id: str, photo_data: dict, user: User = Depends(get_current_user)):
    existing = await db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    photo_base64 = photo_data.get("photo")
    if not photo_base64:
        raise HTTPException(status_code=400, detail="Photo data required")
    await db.occurrences.update_one({"id": occurrence_id, "user_id": user.user_id}, {"$push": {"photos": photo_base64}, "$set": {"updated_at": datetime.now(timezone.utc)}})
    return {"message": "Photo added successfully"}

# ==================== SHIFT TYPES ====================

@api_router.get("/shift-types", response_model=List[dict])
async def get_shift_types(current_user: User = Depends(get_current_user)):
    cursor = db.shift_types.find({"user_id": current_user.user_id}, {"_id": 0})
    result = await cursor.to_list(length=500)
    for doc in result:
        if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
    return result

@api_router.post("/shift-types", response_model=dict)
async def create_shift_type(data: CustomShiftTypeCreate, current_user: User = Depends(get_current_user)):
    short_name = data.short_name or data.name[:3].upper()
    shift_type = CustomShiftType(user_id=current_user.user_id, name=data.name, short_name=short_name, color=data.color, start_time=data.start_time, end_time=data.end_time, is_working=data.is_working, order=data.order)
    doc = shift_type.model_dump()
    await db.shift_types.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return doc

@api_router.put("/shift-types/{shift_type_id}", response_model=dict)
async def update_shift_type(shift_type_id: str, data: CustomShiftTypeUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
    result = await db.shift_types.find_one_and_update({"id": shift_type_id, "user_id": current_user.user_id}, {"$set": update_data}, return_document=True, projection={"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de turno não encontrado.")
    if "created_at" in result and hasattr(result["created_at"], "isoformat"):
        result["created_at"] = result["created_at"].isoformat()
    return result

@api_router.delete("/shift-types/{shift_type_id}")
async def delete_shift_type(shift_type_id: str, current_user: User = Depends(get_current_user)):
    result = await db.shift_types.delete_one({"id": shift_type_id, "user_id": current_user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de turno não encontrado.")
    return {"message": "Tipo de turno eliminado."}

# ==================== HEALTH & ROOT ====================

@api_router.get("/health")
async def health_check():
    try:
        await client.admin.command('ping')
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status, "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/cleanup/all-data")
async def cleanup_all_data(user: User = Depends(require_header_auth)):
    try:
        user_filter = {"user_id": user.user_id}
        shifts_deleted = await db.shifts.delete_many(user_filter)
        cycles_deleted = await db.cycles.delete_many(user_filter)
        occurrences_deleted = await db.occurrences.delete_many(user_filter)
        gratifications_deleted = await db.gratifications.delete_many(user_filter)
        gratified_entries_deleted = await db.gratified_entries.delete_many(user_filter)
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

# ==================== REPORTS ====================

class ReportPersonItem(BaseModel):
    nome: str
    matricula: Optional[str] = ""

class ReportExpedienteItem(BaseModel):
    tipificacao: str
    npp: Optional[str] = ""
    nome: Optional[str] = ""
    matricula: Optional[str] = ""
    hora: Optional[str] = ""
    nuipc: Optional[str] = ""
    local: Optional[str] = ""

class ReportGenerateRequest(BaseModel):
    report_date: str
    report_hour: str
    graduado_nome: str
    graduado_matricula: str
    graduado_radio: Optional[str] = ""
    efetivo_oficiais: int = 0
    efetivo_chefes: int = 0
    efetivo_agentes: int = 0
    servico_remunerado: str = "Não"
    justificacao: Optional[str] = ""
    observacao: Optional[str] = ""
    expediente_efetuado: List[ReportExpedienteItem] = []
    contactados: List[ReportPersonItem] = []
    demais_efetivo: List[ReportPersonItem] = []
    format: str = "docx"  # "docx" or "pdf"

@api_router.post("/reports/generate")
@limiter.limit(_REPORT_RATE)
async def generate_report(data: ReportGenerateRequest, request: Request, _user: User = Depends(get_current_user)):
    from reporting.generator import render_docx, convert_to_pdf
    context = {
        "report_date": data.report_date,
        "report_hour": data.report_hour,
        "generated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
        "graduado_nome": data.graduado_nome,
        "graduado_matricula": data.graduado_matricula,
        "graduado_radio": data.graduado_radio or "",
        "efetivo_oficiais": data.efetivo_oficiais,
        "efetivo_chefes": data.efetivo_chefes,
        "efetivo_agentes": data.efetivo_agentes,
        "servico_remunerado": data.servico_remunerado,
        "justificacao": data.justificacao or "",
        "observacao": data.observacao or "",
        "expediente_efetuado": [e.model_dump() for e in data.expediente_efetuado],
        "contactados": [p.model_dump() for p in data.contactados],
        "demais_efetivo": [p.model_dump() for p in data.demais_efetivo],
    }
    try:
        docx_bytes = render_docx(context)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar documento: {exc}")

    if data.format == "pdf":
        try:
            pdf_bytes = convert_to_pdf(docx_bytes)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="relatorio_{data.report_date}.pdf"'},
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc))

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="relatorio_{data.report_date}.docx"'},
    )

@api_router.get("/")
async def root():
    return {"message": "ShiftExtra API", "version": "1.0.0"}

app.include_router(api_router)

@app.on_event("startup")
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.shifts.create_index([("user_id", 1), ("date", 1)])
    await db.occurrences.create_index("user_id")
    await db.gratifications.create_index([("user_id", 1), ("date", 1)])
    await db.shift_types.create_index("user_id")
    await db.cycles.create_index("user_id")
    await db.gratified_entries.create_index([("user_id", 1), ("date", 1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()