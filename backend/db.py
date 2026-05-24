"""MongoDB connection and lifespan handler."""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'shiftextra_db')]


async def _ensure_index(collection, keys, **kwargs):
    """Create index, dropping a conflicting same-name index first if needed.

    Only used in migration mode (RUN_INDEX_MIGRATION=1).  In normal startup
    use _ensure_index_safe instead, which never drops anything.
    """
    from pymongo.errors import OperationFailure
    import re
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as e:
        if e.code != 86:  # IndexKeySpecsConflict
            raise
        index_name = e.details.get("errmsg", "")
        m = re.search(r'name: "([^"]+)"', index_name)
        name = m.group(1) if m else None
        if name:
            await collection.drop_index(name)
        await collection.create_index(keys, **kwargs)


async def _ensure_index_safe(collection, keys, **kwargs):
    """Idempotent index creation — never drops an existing index.

    If the index already exists with a compatible spec this is a no-op.
    If it exists with an incompatible spec (code 86) we log a warning and
    continue so that startup is never blocked.
    """
    from pymongo.errors import OperationFailure
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as e:
        if e.code == 86:  # IndexKeySpecsConflict
            logger.warning(
                "Index spec conflict on %s (keys=%r kwargs=%r) — "
                "skipping drop/recreate in normal startup mode. "
                "Set RUN_INDEX_MIGRATION=1 to fix.",
                collection.name, keys, kwargs,
            )
        else:
            raise


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
            return (created is not None, created, doc["_id"])

        docs.sort(key=_sort_key)
        keep = docs[-1]["_id"]
        to_delete = [d["_id"] for d in docs if d["_id"] != keep]
        if to_delete:
            await collection.delete_many({"_id": {"$in": to_delete}})


@asynccontextmanager
async def lifespan(app):
    if os.environ.get("ENVIRONMENT", "").lower() == "production" and not os.environ.get("PII_ENC_KEY"):
        raise RuntimeError(
            "PII_ENC_KEY é obrigatória em ENVIRONMENT=production. "
            "Gere uma chave com: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\" "
            "e defina a variável de ambiente antes de iniciar o servidor."
        )
    if os.environ.get("RUN_INDEX_MIGRATION") == "1":
        # --- Migration mode: destructive, run once, never on normal deploys ---
        logger.warning(
            "RUN_INDEX_MIGRATION=1 detected: about to delete duplicate user "
            "documents and drop/recreate conflicting indexes. "
            "Do NOT leave this variable set in production."
        )
        await _dedupe_users_by_email(db.users)
        # Unique indexes use the drop+recreate helper to resolve conflicts.
        await _ensure_index(db.users, "email", unique=True)
        await _ensure_index(db.user_sessions, "session_token", unique=True)
        # Non-unique indexes can also go through the safe helper here, but for
        # consistency during an explicit migration run we use _ensure_index.
        await _ensure_index(db.shifts, [("user_id", 1), ("date", 1)], unique=True)
        await _ensure_index(db.occurrences, "user_id")
        await _ensure_index(db.gratifications, [("user_id", 1), ("date", 1)])
        await _ensure_index(db.shift_types, "user_id")
        await _ensure_index(db.cycles, "user_id")
        await _ensure_index(db.gratified_entries, [("user_id", 1), ("date", 1)])
        await _ensure_index(db.events, [("user_id", 1), ("date", 1)])
        await _ensure_index(db.audit_logs, [("user_id", 1), ("ts", -1)])
    else:
        # --- Normal startup: idempotent, never drops anything ---
        await _ensure_index_safe(db.users, "email", unique=True)
        await _ensure_index_safe(db.user_sessions, "session_token", unique=True)
        await _ensure_index_safe(db.shifts, [("user_id", 1), ("date", 1)], unique=True)
        await _ensure_index_safe(db.occurrences, "user_id")
        await _ensure_index_safe(db.gratifications, [("user_id", 1), ("date", 1)])
        await _ensure_index_safe(db.shift_types, "user_id")
        await _ensure_index_safe(db.cycles, "user_id")
        await _ensure_index_safe(db.gratified_entries, [("user_id", 1), ("date", 1)])
        await _ensure_index_safe(db.events, [("user_id", 1), ("date", 1)])
        await _ensure_index_safe(db.audit_logs, [("user_id", 1), ("ts", -1)])
    yield
    client.close()
