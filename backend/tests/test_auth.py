"""Auth flow: register, login, logout, token expiry, duplicate email."""
import uuid
from datetime import datetime, timezone, timedelta

import pytest

import server
from tests.conftest import auth, _register



@pytest.mark.asyncio
async def test_register_success(http):
    resp = await http.post(
        "/api/auth/register",
        json={"email": "new@test.com", "password": "Password1", "name": "New"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "session_token" in data
    assert data["user"]["email"] == "new@test.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(http):
    await _register(http, "dupe@test.com")
    resp = await http.post(
        "/api/auth/register",
        json={"email": "dupe@test.com", "password": "Password1", "name": "Dupe"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_weak_password(http):
    resp = await http.post(
        "/api/auth/register",
        json={"email": "weak@test.com", "password": "short", "name": "Weak"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(http):
    await _register(http, "login@test.com", "Password1")
    resp = await http.post(
        "/api/auth/login",
        json={"email": "login@test.com", "password": "Password1"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "session_token" in data
    assert data["user"]["email"] == "login@test.com"


@pytest.mark.asyncio
async def test_login_wrong_password(http):
    await _register(http, "wrong@test.com", "Password1")
    resp = await http.post(
        "/api/auth/login",
        json={"email": "wrong@test.com", "password": "WrongPass1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(http):
    resp = await http.post(
        "/api/auth/login",
        json={"email": "ghost@test.com", "password": "Password1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_authenticated_endpoint_requires_token(http):
    resp = await http.get("/api/shifts")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_authenticated_endpoint_with_valid_token(http, user_a):
    resp = await http.get("/api/shifts", headers=auth(user_a["token"]))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_me(http, user_a):
    resp = await http.get("/api/auth/me", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "user_a@test.com"
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_logout_invalidates_token(http, user_a):
    token = user_a["token"]
    resp = await http.post("/api/auth/logout", headers=auth(token))
    assert resp.status_code == 200

    resp = await http.get("/api/shifts", headers=auth(token))
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_returns_401(http, mock_db):
    # Insert a user and a session that is already expired
    user_id = str(uuid.uuid4())
    token = str(uuid.uuid4())
    await mock_db.users.insert_one({
        "user_id": user_id, "email": "expired@test.com",
        "name": "Expired", "password_hash": "x",
        "created_at": datetime.now(timezone.utc),
    })
    await mock_db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) - timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })

    resp = await http.get("/api/shifts", headers=auth(token))
    assert resp.status_code == 401
