"""MongoDB connection and lifespan handler."""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'shiftextra_db')]


@asynccontextmanager
async def lifespan(app):
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.shifts.create_index([("user_id", 1), ("date", 1)])
    await db.occurrences.create_index("user_id")
    await db.gratifications.create_index([("user_id", 1), ("date", 1)])
    await db.shift_types.create_index("user_id")
    await db.cycles.create_index("user_id")
    await db.gratified_entries.create_index([("user_id", 1), ("date", 1)])
    yield
    client.close()
