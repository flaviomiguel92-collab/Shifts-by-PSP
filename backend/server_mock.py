"""
Mock Backend Server for Offline Testing
FastAPI server without MongoDB dependency - perfect for development/testing
"""

from fastapi import FastAPI, HTTPException, Response, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid
import json
from pathlib import Path

# ==================== CONFIGURATION ====================

app = FastAPI(title="Shift Olama - Mock Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:19000",  # Expo
        "http://localhost:19001",  # Expo
        "*",  # Allow all for local testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (will reset on restart)
db_storage: Dict = {
    "users": {},
    "sessions": {},
    "shifts": {},
    "gratifications": {},
    "custom_shifts": {},
    "cycles": {},
}

# Storage file path
STORAGE_FILE = Path(__file__).parent / "mock_data.json"

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    excess_hours: Optional[float] = None
    note: Optional[str] = None

class Shift(ShiftCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GratificationCreate(BaseModel):
    date: str
    name: str
    value: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class Gratification(GratificationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomShiftTypeCreate(BaseModel):
    name: str
    color: str
    order: int = 0

class CustomShiftType(CustomShiftTypeCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str

class CycleCreate(BaseModel):
    name: str
    pattern: List[str]

class Cycle(CycleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str

# ==================== STORAGE HELPERS ====================

def load_storage():
    """Load data from file if exists"""
    global db_storage
    if STORAGE_FILE.exists():
        try:
            with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
                db_storage = json.load(f)
                print(f"✓ Loaded data from {STORAGE_FILE}")
        except Exception as e:
            print(f"✗ Error loading storage: {e}")

def save_storage():
    """Save data to file"""
    try:
        with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
            json.dump(db_storage, f, indent=2, default=str)
    except Exception as e:
        print(f"✗ Error saving storage: {e}")

def get_or_create_demo_user():
    """Get or create demo user for testing"""
    demo_user_id = "demo_user_001"
    
    if demo_user_id not in db_storage["users"]:
        demo_user = {
            "user_id": demo_user_id,
            "email": "demo@shifolama.local",
            "name": "Demo User",
            "picture": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db_storage["users"][demo_user_id] = demo_user
        save_storage()
    
    return db_storage["users"][demo_user_id]

def get_demo_session_token():
    """Get or create demo session token"""
    user = get_or_create_demo_user()
    user_id = user["user_id"]
    
    if user_id not in db_storage["sessions"]:
        token = str(uuid.uuid4())
        db_storage["sessions"][user_id] = {
            "session_token": token,
            "user_id": user_id,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }
        save_storage()
    
    return db_storage["sessions"][user_id]["session_token"]

async def get_current_user(request: Request) -> dict:
    """Get current user from session"""
    # For mock, always return demo user
    return get_or_create_demo_user()

# ==================== ROOT ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Shift Olama - Mock Backend (Offline Mode)",
        "status": "running",
        "version": "1.0.0",
        "mode": "MOCK - No Database Required",
        "endpoints": {
            "docs": "/docs",
            "api": "/api",
            "auth": "/api/auth/demo",
            "shifts": "/api/shifts",
            "gratifications": "/api/gratifications",
        }
    }

@app.get("/docs")
async def get_docs():
    """API Documentation"""
    return {"docs": "OpenAPI docs available at /docs"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "mock"}

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/demo")
async def auth_demo(response: Response):
    """Demo authentication - returns session token"""
    user = get_or_create_demo_user()
    token = get_demo_session_token()
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        path="/",
        max_age=30 * 24 * 60 * 60
    )
    
    return {
        "user": user,
        "session_token": token,
        "message": "Demo session created"
    }

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user"""
    return user

# ==================== SHIFTS ENDPOINTS ====================

@app.get("/api/shifts")
async def get_shifts(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all shifts for current user"""
    user_id = user["user_id"]
    
    shifts = [
        s for s in db_storage["shifts"].values() 
        if s["user_id"] == user_id
    ]
    
    if month:
        shifts = [s for s in shifts if s["date"].startswith(month)]
    
    return sorted(shifts, key=lambda x: x["date"])

@app.get("/api/shifts/{date}")
async def get_shift_by_date(date: str, user: dict = Depends(get_current_user)):
    """Get shift for specific date"""
    user_id = user["user_id"]
    
    for shift in db_storage["shifts"].values():
        if shift["user_id"] == user_id and shift["date"] == date:
            return shift
    
    return None

@app.post("/api/shifts")
async def create_shift(shift_data: ShiftCreate, user: dict = Depends(get_current_user)):
    """Create new shift"""
    user_id = user["user_id"]
    
    # Check if shift exists
    for shift in db_storage["shifts"].values():
        if shift["user_id"] == user_id and shift["date"] == shift_data.date:
            raise HTTPException(status_code=400, detail="Shift already exists for this date")
    
    shift_id = str(uuid.uuid4())
    shift = {
        "id": shift_id,
        "user_id": user_id,
        "date": shift_data.date,
        "shift_type": shift_data.shift_type,
        "start_time": shift_data.start_time,
        "end_time": shift_data.end_time,
        "excess_hours": shift_data.excess_hours,
        "note": shift_data.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db_storage["shifts"][shift_id] = shift
    save_storage()
    
    return shift

@app.put("/api/shifts/{shift_id}")
async def update_shift(shift_id: str, shift_data: dict, user: dict = Depends(get_current_user)):
    """Update shift"""
    if shift_id not in db_storage["shifts"]:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift = db_storage["shifts"][shift_id]
    if shift["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    shift.update(shift_data)
    save_storage()
    
    return shift

@app.delete("/api/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: dict = Depends(get_current_user)):
    """Delete shift"""
    if shift_id not in db_storage["shifts"]:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift = db_storage["shifts"][shift_id]
    if shift["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    del db_storage["shifts"][shift_id]
    save_storage()
    
    return {"message": "Shift deleted"}

# ==================== GRATIFICATIONS ENDPOINTS ====================

@app.get("/api/gratifications")
async def get_gratifications(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all gratifications"""
    user_id = user["user_id"]
    
    gratifications = [
        g for g in db_storage["gratifications"].values() 
        if g["user_id"] == user_id
    ]
    
    if month:
        gratifications = [g for g in gratifications if g["date"].startswith(month)]
    
    return sorted(gratifications, key=lambda x: x["date"])

@app.post("/api/gratifications")
async def create_gratification(grat_data: GratificationCreate, user: dict = Depends(get_current_user)):
    """Create gratification"""
    user_id = user["user_id"]
    grat_id = str(uuid.uuid4())
    
    gratification = {
        "id": grat_id,
        "user_id": user_id,
        "date": grat_data.date,
        "name": grat_data.name,
        "value": grat_data.value,
        "start_time": grat_data.start_time,
        "end_time": grat_data.end_time,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db_storage["gratifications"][grat_id] = gratification
    save_storage()
    
    return gratification

@app.delete("/api/gratifications/{grat_id}")
async def delete_gratification(grat_id: str, user: dict = Depends(get_current_user)):
    """Delete gratification"""
    if grat_id not in db_storage["gratifications"]:
        raise HTTPException(status_code=404, detail="Gratification not found")
    
    grat = db_storage["gratifications"][grat_id]
    if grat["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    del db_storage["gratifications"][grat_id]
    save_storage()
    
    return {"message": "Gratification deleted"}

# ==================== CUSTOM SHIFTS ENDPOINTS ====================

@app.get("/api/custom-shifts")
async def get_custom_shifts(user: dict = Depends(get_current_user)):
    """Get custom shift types"""
    user_id = user["user_id"]
    
    shifts = [
        s for s in db_storage["custom_shifts"].values() 
        if s["user_id"] == user_id
    ]
    
    return sorted(shifts, key=lambda x: x.get("order", 0))

@app.post("/api/custom-shifts")
async def create_custom_shift(shift_data: CustomShiftTypeCreate, user: dict = Depends(get_current_user)):
    """Create custom shift type"""
    user_id = user["user_id"]
    shift_id = str(uuid.uuid4())
    
    shift = {
        "id": shift_id,
        "user_id": user_id,
        "name": shift_data.name,
        "color": shift_data.color,
        "order": shift_data.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db_storage["custom_shifts"][shift_id] = shift
    save_storage()
    
    return shift

# ==================== CYCLES ENDPOINTS ====================

@app.get("/api/cycles")
async def get_cycles(user: dict = Depends(get_current_user)):
    """Get cycles"""
    user_id = user["user_id"]
    
    return [
        c for c in db_storage["cycles"].values() 
        if c["user_id"] == user_id
    ]

@app.post("/api/cycles")
async def create_cycle(cycle_data: CycleCreate, user: dict = Depends(get_current_user)):
    """Create cycle"""
    user_id = user["user_id"]
    cycle_id = str(uuid.uuid4())
    
    cycle = {
        "id": cycle_id,
        "user_id": user_id,
        "name": cycle_data.name,
        "pattern": cycle_data.pattern,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db_storage["cycles"][cycle_id] = cycle
    save_storage()
    
    return cycle

@app.delete("/api/cycles/{cycle_id}")
async def delete_cycle(cycle_id: str, user: dict = Depends(get_current_user)):
    """Delete cycle"""
    if cycle_id not in db_storage["cycles"]:
        raise HTTPException(status_code=404, detail="Cycle not found")
    
    cycle = db_storage["cycles"][cycle_id]
    if cycle["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    del db_storage["cycles"][cycle_id]
    save_storage()
    
    return {"message": "Cycle deleted"}

# ==================== STARTUP/SHUTDOWN ====================

@app.on_event("startup")
async def startup():
    """On startup"""
    print("=" * 60)
    print("  SHIFT OLAMA - MOCK BACKEND (OFFLINE MODE)")
    print("=" * 60)
    print()
    print("✓ Backend iniciado com sucesso!")
    print("✓ Modo: MOCK (sem base de dados)")
    print()
    print("URLs Disponíveis:")
    print("  - API Root:       http://localhost:8000")
    print("  - Documentação:   http://localhost:8000/docs")
    print("  - Auth Demo:      POST http://localhost:8000/api/auth/demo")
    print()
    print("Dados serão salvos em: mock_data.json")
    print()
    
    load_storage()
    
    # Create demo user and session
    user = get_or_create_demo_user()
    token = get_demo_session_token()
    
    print(f"Utilizador Demo: {user['name']} ({user['email']})")
    print(f"Token: {token[:20]}...")
    print()
    print("=" * 60)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
