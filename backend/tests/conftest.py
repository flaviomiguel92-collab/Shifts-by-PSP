"""
Shared fixtures for integration tests.

Uses a real Motor/MongoDB connection with a dedicated test database so tests
never touch the production DB. Teardown uses synchronous PyMongo to avoid
"event loop is closed" errors from pytest-asyncio fixture teardown.
"""
import os
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

import server

_TEST_DB = f"test_shifts_{uuid.uuid4().hex[:8]}"
_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")


@pytest.fixture(scope="session", autouse=True)
def _drop_test_db_after_session():
    """Drop the entire test database once all tests finish (synchronous)."""
    yield
    sync = MongoClient(_MONGO_URL)
    sync.drop_database(_TEST_DB)
    sync.close()


@pytest_asyncio.fixture(autouse=True)
async def mock_db():
    """Point server.db at the test database.

    Uses direct attribute assignment (not monkeypatch) to avoid edge-cases with
    async fixtures. Wipes every collection after the test via synchronous PyMongo
    so teardown doesn't run inside a closed event loop.
    """
    motor_client = AsyncIOMotorClient(_MONGO_URL)
    test_db = motor_client[_TEST_DB]
    _orig = server.db
    server.db = test_db

    yield test_db

    server.db = _orig
    motor_client.close()
    # Synchronous wipe — no async operations in teardown
    sync = MongoClient(_MONGO_URL)
    sync_db = sync[_TEST_DB]
    for name in sync_db.list_collection_names():
        sync_db.drop_collection(name)
    sync.close()


@pytest_asyncio.fixture
async def http():
    """httpx AsyncClient wired to the FastAPI ASGI app."""
    async with AsyncClient(
        transport=ASGITransport(app=server.app), base_url="http://test"
    ) as client:
        yield client


async def _register(
    http: AsyncClient,
    email: str,
    password: str = "Password1",
    name: str = "User",
) -> dict:
    resp = await http.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return {"token": data["session_token"], "user": data["user"]}


@pytest_asyncio.fixture
async def user_a(http):
    return await _register(http, "user_a@test.com")


@pytest_asyncio.fixture
async def user_b(http):
    return await _register(http, "user_b@test.com")


def auth(token: str) -> dict:
    """Return Authorization header dict for Bearer token."""
    return {"Authorization": f"Bearer {token}"}
