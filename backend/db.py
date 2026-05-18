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


async def _ensure_index(collection, keys, **kwargs):
    """Create index, dropping a conflicting same-name index first if needed."""
    from pymongo.errors import OperationFailure
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as e:
        if e.code != 86:  # IndexKeySpecsConflict
            raise
        index_name = e.details.get("errmsg", "")
        # Extract the index name from the error and drop it
        import re
        m = re.search(r'name: "([^"]+)"', index_name)
        name = m.group(1) if m else None
        if name:
            await collection.drop_index(name)
        await collection.create_index(keys, **kwargs)


@asynccontextmanager
async def lifespan(app):
    await _ensure_index(db.users, "email", unique=True)
    await _ensure_index(db.user_sessions, "session_token", unique=True)
    await db.shifts.create_index([("user_id", 1), ("date", 1)])
    await db.occurrences.create_index("user_id")
    await db.gratifications.create_index([("user_id", 1), ("date", 1)])
    await db.shift_types.create_index("user_id")
    await db.cycles.create_index("user_id")
    await db.gratified_entries.create_index([("user_id", 1), ("date", 1)])
    yield
    client.close()
