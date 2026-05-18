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


async def _dedupe_users_by_email(collection):
    """Remove duplicate users sharing an email before building the unique index.

    For each email with >1 document, keep the one with the most recent
    ``created_at`` (falling back to ``_id``, which is monotonic by insert
    time, when ``created_at`` is missing/null) and delete the rest.
    """
    pipeline = [
        {"$group": {"_id": "$email", "ids": {"$push": "$_id"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    async for group in collection.aggregate(pipeline):
        email = group["_id"]
        docs = await collection.find(
            {"email": email}, {"_id": 1, "created_at": 1}
        ).to_list(None)

        def _sort_key(doc):
            created = doc.get("created_at")
            # Docs with a created_at sort above those without; among those
            # without, the ObjectId (monotonic) acts as the tie-breaker.
            return (created is not None, created, doc["_id"])

        docs.sort(key=_sort_key)
        keep = docs[-1]["_id"]
        to_delete = [d["_id"] for d in docs if d["_id"] != keep]
        if to_delete:
            await collection.delete_many({"_id": {"$in": to_delete}})


@asynccontextmanager
async def lifespan(app):
    await _dedupe_users_by_email(db.users)
    await _ensure_index(db.users, "email", unique=True)
    await _ensure_index(db.user_sessions, "session_token", unique=True)
    await _ensure_index(db.shifts, [("user_id", 1), ("date", 1)])
    await _ensure_index(db.occurrences, "user_id")
    await _ensure_index(db.gratifications, [("user_id", 1), ("date", 1)])
    await _ensure_index(db.shift_types, "user_id")
    await _ensure_index(db.cycles, "user_id")
    await _ensure_index(db.gratified_entries, [("user_id", 1), ("date", 1)])
    yield
    client.close()
