from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
import base64
import re

ROOT_DIR = Path(__file__).parent

# Date format validation helpers (anti-NoSQL-injection)
MONTH_RE = re.compile(r'^\d{4}-(?:0[1-9]|1[0-2])$')
YEAR_RE = re.compile(r'^\d{4}$')
DATE_RE = re.compile(r'^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$')

def validate_month_format(month: str) -> None:
    """Raise HTTPException if month is not valid YYYY-MM."""
    if not MONTH_RE.match(month):
        raise HTTPException(status_code=400, detail=f"Formato de mês inválido: {month}. Use YYYY-MM")

def validate_year_format(year: str) -> None:
    """Raise HTTPException if year is not valid YYYY."""
    if not YEAR_RE.match(year):
        raise HTTPException(status_code=400, detail=f"Formato de ano inválido: {year}. Use YYYY")

def validate_date_format(date: str) -> None:
    """Raise HTTPException if date is not valid YYYY-MM-DD."""
    if not DATE_RE.match(date):
        raise HTTPException(status_code=400, detail=f"Formato de data inválido: {date}. Use YYYY-MM-DD")

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'shiftextra_db')]

# Create the main app

app = FastAPI()

# CORS config (move to env var in production)
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

# Create a router with the /api prefix

api_router = APIRouter(prefix="/api")

# Configure logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

class SessionRequest(BaseModel):
    session_id: str

class RegisterRequest(BaseModel):
    email: str
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
    email: str
    password: str

# Shift Types: Manhã, Tarde, Noite, Férias, Folga, Excesso

class Shift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    shift_type: str
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None

class ShiftUpdate(BaseModel):
    shift_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
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
    short_name: Optional[str] = None  # defaults to first 3 chars of name
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

class ReportGenerateRequest(BaseModel):
    template_id: str
    data: dict = Field(default_factory=dict)

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

@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    """Register a new user with email and password"""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado")

    # Hash password
    password_hash = pwd_context.hash(data.password)

    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc)
    }

    await db.users.insert_one(user)

    # Create session
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }

    await db.user_sessions.insert_one(session)

    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        path="/",
        max_age=30 * 24 * 60 * 60
    )

    return {
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "picture": None,
            "created_at": user["created_at"].isoformat()
        },
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    """Login with email and password"""
    # Find user by email
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # Verify password
    if not user.get("password_hash") or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    user_id = user["user_id"]

    # Delete old sessions
    await db.user_sessions.delete_many({"user_id": user_id})

    # Create new session
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }

    await db.user_sessions.insert_one(session)

    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        path="/",
        max_age=30 * 24 * 60 * 60
    )

    return {
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "created_at": user["created_at"].isoformat()
        },
        "session_token": session_token
    }

@api_router.post("/auth/session")
async def create_session(session_request: SessionRequest, response: Response):
    """Exchange session_id for session_token via Emergent Auth"""
    auth_api_url = os.environ.get(
        'AUTH_API_URL',
        'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data'
    )
    try:
        async with httpx.AsyncClient() as client_http:
            auth_response = await client_http.get(
                auth_api_url,
                headers={"X-Session-ID": session_request.session_id}
            )

            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")

            auth_data = auth_response.json()
    except httpx.RequestError as e:
        # Sanitize: don't log the full error details that could contain sensitive info
        logger.error("Auth service request failed")
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
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

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
        max_age=30 * 24 * 60 * 60
    )

    # Get user data to return
    user_doc = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )

    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return UserPublic(**user.dict())

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user by deleting session"""
    session_token = request.cookies.get("session_token")

    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]

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

class BulkShiftItem(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class BulkShiftsRequest(BaseModel):
    shifts: List[BulkShiftItem]

@api_router.get("/shifts", response_model=List[dict])
async def get_shifts(
    month: Optional[str] = None,  # YYYY-MM format
    user: User = Depends(get_current_user)
):
    """Get all shifts for the current user, optionally filtered by month"""
    query = {"user_id": user.user_id}

    if month:
        validate_month_format(month)
        query["date"] = {"$regex": f"^{month}"}

    shifts = await db.shifts.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return shifts

@api_router.post("/shifts", response_model=dict)
async def create_shift(shift_data: ShiftCreate, user: User = Depends(get_current_user)):
    """Create a new shift"""
    existing = await db.shifts.find_one(
        {"user_id": user.user_id, "date": shift_data.date}
    )

    if existing:
        raise HTTPException(status_code=400, detail="Shift already exists for this date")

    shift = Shift(
        user_id=user.user_id,
        date=shift_data.date,
        shift_type=shift_data.shift_type,
        start_time=shift_data.start_time,
        end_time=shift_data.end_time,
        note=shift_data.note
    )

    await db.shifts.insert_one(shift.dict())
    return shift.dict()

@api_router.post("/shifts/reset")
async def reset_all_shifts(user: User = Depends(get_current_user)):
    """Delete all shifts for current user (reset)"""
    result = await db.shifts.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} shifts"}

@api_router.post("/shifts/bulk", response_model=dict)
async def create_or_update_shifts_bulk(
    bulk_data: BulkShiftsRequest,
    user: User = Depends(get_current_user)
):
    """Create or update multiple shifts at once (for cycle application)"""
    created_count = 0
    updated_count = 0

    for shift_item in bulk_data.shifts:
        existing = await db.shifts.find_one(
            {"user_id": user.user_id, "date": shift_item.date}
        )

        if existing:
            update_fields: dict = {"shift_type": shift_item.shift_type}
            if shift_item.start_time is not None:
                update_fields["start_time"] = shift_item.start_time
            if shift_item.end_time is not None:
                update_fields["end_time"] = shift_item.end_time
            await db.shifts.update_one({"id": existing["id"], "user_id": user.user_id}, {"$set": update_fields})
            updated_count += 1
        else:
            shift = Shift(
                user_id=user.user_id,
                date=shift_item.date,
                shift_type=shift_item.shift_type,
                start_time=shift_item.start_time,
                end_time=shift_item.end_time
            )
            await db.shifts.insert_one(shift.dict())
            created_count += 1

    return {
        "message": "Bulk operation completed",
        "created": created_count,
        "updated": updated_count,
        "total": created_count + updated_count
    }

@api_router.get("/shifts/{date}")
async def get_shift_by_date(date: str, user: User = Depends(get_current_user)):
    """Get shift for a specific date"""
    shift = await db.shifts.find_one(
        {"user_id": user.user_id, "date": date},
        {"_id": 0}
    )
    return shift

@api_router.put("/shifts/{shift_id}", response_model=dict)
async def update_shift(
    shift_id: str,
    shift_data: ShiftUpdate,
    user: User = Depends(get_current_user)
):
    """Update an existing shift"""
    existing = await db.shifts.find_one({"id": shift_id, "user_id": user.user_id})

    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")

    update_data = {k: v for k, v in shift_data.dict().items() if v is not None}

    if update_data:
        await db.shifts.update_one({"id": shift_id, "user_id": user.user_id}, {"$set": update_data})

    updated = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return updated

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: User = Depends(get_current_user)):
    """Delete a shift"""
    result = await db.shifts.delete_one({"id": shift_id, "user_id": user.user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")

    return {"message": "Shift deleted successfully"}

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
        validate_month_format(month)
        query["date"] = {"$regex": f"^{month}"}
    elif year:
        validate_year_format(year)
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
            {"id": grat_id, "user_id": user.user_id},
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

# ==================== STATISTICS ENDPOINTS ====================

@api_router.get("/stats/monthly/{month}")
async def get_monthly_stats(month: str, user: User = Depends(get_current_user)):
    """Get monthly statistics (month format: YYYY-MM)"""
    validate_month_format(month)
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
    validate_year_format(year)
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

    return {
        "year": year,
        "total_gratifications": total,
        "gratification_count": count,
        "by_month": by_month,
        "by_type": by_type
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

    return {
        "monthly_total": monthly_total,
        "yearly_total": yearly_total,
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

# ==================== OCCURRENCE ENDPOINTS ====================

@api_router.get("/occurrences", response_model=List[dict])
async def get_occurrences(
    status: Optional[str] = None,
    classification: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get all occurrences for the current user"""
    query = {"user_id": user.user_id}

    if status:
        query["status"] = status
    if classification:
        query["classification"] = classification

    occurrences = await db.occurrences.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return occurrences

@api_router.get("/occurrences/{occurrence_id}")
async def get_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    """Get a specific occurrence"""
    occurrence = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {"_id": 0}
    )

    if not occurrence:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    return occurrence

@api_router.post("/occurrences", response_model=dict)
async def create_occurrence(occ_data: OccurrenceCreate, user: User = Depends(get_current_user)):
    """Create a new occurrence"""
    occurrence = Occurrence(
        user_id=user.user_id,
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
    occ_data: OccurrenceUpdate,
    user: User = Depends(get_current_user)
):
    """Update an existing occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    update_data = {k: v for k, v in occ_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    if update_data:
        await db.occurrences.update_one(
            {"id": occurrence_id, "user_id": user.user_id},
            {"$set": update_data}
        )

    updated = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {"_id": 0}
    )
    return updated

@api_router.delete("/occurrences/{occurrence_id}")
async def delete_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    """Delete an occurrence"""
    result = await db.occurrences.delete_one(
        {"id": occurrence_id, "user_id": user.user_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    return {"message": "Occurrence deleted successfully"}

# Person management within occurrences

@api_router.post("/occurrences/{occurrence_id}/persons", response_model=dict)
async def add_person_to_occurrence(
    occurrence_id: str,
    person_data: PersonCreate,
    user: User = Depends(get_current_user)
):
    """Add a person (suspect, witness, or victim) to an occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}
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
        {"id": occurrence_id, "user_id": user.user_id},
        {
            "$push": {array_name: person.dict()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    updated = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {"_id": 0}
    )
    return updated

@api_router.delete("/occurrences/{occurrence_id}/persons/{person_id}")
async def remove_person_from_occurrence(
    occurrence_id: str,
    person_id: str,
    user: User = Depends(get_current_user)
):
    """Remove a person from an occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    # Remove from all arrays
    await db.occurrences.update_one(
        {"id": occurrence_id, "user_id": user.user_id},
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
    photo_data: dict,
    user: User = Depends(get_current_user)
):
    """Add a photo to an occurrence"""
    existing = await db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")

    photo_base64 = photo_data.get("photo")
    if not photo_base64:
        raise HTTPException(status_code=400, detail="Photo data required")

    await db.occurrences.update_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {
            "$push": {"photos": photo_base64},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

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
    shift_type = CustomShiftType(
        user_id=current_user.user_id,
        name=data.name,
        short_name=short_name,
        color=data.color,
        start_time=data.start_time,
        end_time=data.end_time,
        is_working=data.is_working,
        order=data.order,
    )
    doc = shift_type.dict()
    await db.shift_types.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.put("/shift-types/{shift_type_id}", response_model=dict)
async def update_shift_type(
    shift_type_id: str,
    data: CustomShiftTypeUpdate,
    current_user: User = Depends(get_current_user),
):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
    result = await db.shift_types.find_one_and_update(
        {"id": shift_type_id, "user_id": current_user.user_id},
        {"$set": update_data},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de turno não encontrado.")
    if "created_at" in result and hasattr(result["created_at"], "isoformat"):
        result["created_at"] = result["created_at"].isoformat()
    return result


@api_router.delete("/shift-types/{shift_type_id}")
async def delete_shift_type(shift_type_id: str, current_user: User = Depends(get_current_user)):
    result = await db.shift_types.delete_one(
        {"id": shift_type_id, "user_id": current_user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de turno não encontrado.")
    return {"message": "Tipo de turno eliminado."}


# ==================== REPORTS ====================

def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_simple_pdf(lines: List[str]) -> bytes:
    text_commands = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"]
    for line in lines[:48]:
        safe_line = _pdf_escape(line[:110])
        text_commands.append(f"({safe_line}) Tj")
        text_commands.append("T*")
    text_commands.append("ET")
    content = "\n".join(text_commands).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


@api_router.post("/reports/generate", response_model=dict)
async def generate_report(report: ReportGenerateRequest, user: User = Depends(get_current_user)):
    """Generate a lightweight PDF report."""
    report_data = report.data or {}
    report_date = str(report_data.get("reportDate") or datetime.now(timezone.utc).date())
    title = "Relatorio de Servico Remunerado"
    lines = [
        title,
        f"Template: {report.template_id}",
        f"Data: {report_date} {report_data.get('reportHour') or ''}".strip(),
        "",
        f"Nome: {report_data.get('remuneratedName') or ''}",
        f"Tipo de servico: {report_data.get('serviceType') or ''}",
        f"Local: {report_data.get('serviceLocation') or ''}",
        f"Referencia: {report_data.get('serviceReference') or ''}",
        f"Efetivo total: {report_data.get('efetivoTotal') or ''}",
        f"Chefes: {report_data.get('chefesCount') or ''}",
        f"Agentes: {report_data.get('agentesCount') or ''}",
        "",
        "Graduado",
        f"Posto: {report_data.get('graduadoPosto') or ''}",
        f"Nome: {report_data.get('graduadoNome') or ''}",
        f"Matricula: {report_data.get('graduadoMatricula') or ''}",
        f"Comando: {report_data.get('graduadoComando') or ''}",
        "",
        f"Observacoes: {report_data.get('observacoes') or ''}",
        f"Justificacoes: {report_data.get('justificacoes') or ''}",
    ]

    demais_efetivo = report_data.get("demaisEfetivo") or []
    if isinstance(demais_efetivo, list) and demais_efetivo:
        lines.extend(["", "Demais efetivo"])
        for item in demais_efetivo[:12]:
            if isinstance(item, dict):
                lines.append(
                    f"- {item.get('posto') or ''} {item.get('nome') or ''} {item.get('matricula') or ''}".strip()
                )

    expediente = report_data.get("expedienteEfetuado") or []
    if isinstance(expediente, list) and expediente:
        lines.extend(["", "Expediente efetuado"])
        for item in expediente[:12]:
            if isinstance(item, dict):
                lines.append(
                    f"- {item.get('descricao') or ''} {item.get('referencia') or ''}".strip()
                )

    pdf_bytes = _build_simple_pdf(lines)
    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in report_date)
    return {
        "file_name": f"relatorio_{safe_name}.pdf",
        "mime_type": "application/pdf",
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
    }


# ==================== HEALTH & ROOT ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring (e.g., Render)."""
    try:
        # Quick MongoDB ping
        await client.admin.command('ping')
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {
        "status": "ok",
        "db": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/cleanup/all-data")
async def cleanup_all_data(user: User = Depends(get_current_user)):
    """Delete all app data for the current authenticated user."""
    try:
        user_filter = {"user_id": user.user_id}
        shifts_deleted = await db.shifts.delete_many(user_filter)
        cycles_deleted = await db.cycles.delete_many(user_filter)
        occurrences_deleted = await db.occurrences.delete_many(user_filter)
        gratifications_deleted = await db.gratifications.delete_many(user_filter)

        return {
            "message": "User data cleaned successfully",
            "shifts_deleted": shifts_deleted.deleted_count,
            "cycles_deleted": cycles_deleted.deleted_count,
            "occurrences_deleted": occurrences_deleted.deleted_count,
            "gratifications_deleted": gratifications_deleted.deleted_count,
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(error)}")

@api_router.get("/")
async def root():
    return {"message": "ShiftExtra API", "version": "1.0.0"}

# Include the router in the main app

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()