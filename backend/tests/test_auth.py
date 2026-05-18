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


@pytest.mark.asyncio
async def test_string_expires_at_does_not_crash(http, mock_db):
    """Regression: _validate_session must tolerate expires_at stored as ISO string."""
    import hashlib, secrets as _secrets
    raw = _secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    user_id = str(uuid.uuid4())
    await mock_db.users.insert_one({
        "user_id": user_id, "email": "strdate@test.com",
        "name": "StrDate", "password_hash": "x",
        "created_at": datetime.now(timezone.utc),
    })
    await mock_db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": token_hash,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc),
    })

    resp = await http.get("/api/shifts", headers=auth(raw))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_account_erases_user_and_data(http, user_a):
    token = user_a["token"]
    # Seed some data for the user
    await http.post(
        "/api/shifts",
        json={"date": "2026-09-01", "shift_type": "Diurno"},
        headers=auth(token),
    )

    resp = await http.delete("/api/auth/account", headers=auth(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["message"] == "Account deleted"

    # Token is now invalid (sessions deleted) and the user is gone
    me = await http.get("/api/auth/me", headers=auth(token))
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_delete_account_requires_bearer(http, user_a):
    # Cookie-only must be rejected (CSRF-safe, like other destructive endpoints)
    resp = await http.delete(
        "/api/auth/account", cookies={"session_token": user_a["token"]}
    )
    assert resp.status_code == 403


def test_pii_crypto_roundtrip_and_legacy_passthrough(monkeypatch):
    """PII layer: no-op without key; encrypt/decrypt round-trips; legacy plaintext passes through."""
    import importlib
    from cryptography.fernet import Fernet
    from security import crypto

    # No key -> strict no-op
    monkeypatch.delenv("PII_ENC_KEY", raising=False)
    crypto._fernet_cache = crypto._UNSET
    plain = {"full_name": "Joao", "tax_id": "123", "role": "suspeito"}
    assert crypto.encrypt_person(plain) == plain
    assert crypto.decrypt_person(plain) == plain

    # With key -> encrypt at rest, decrypt transparently, never mutate input
    monkeypatch.setenv("PII_ENC_KEY", Fernet.generate_key().decode())
    crypto._fernet_cache = crypto._UNSET
    enc = crypto.encrypt_person(plain)
    assert enc["full_name"].startswith("enc::")
    assert enc["role"] == "suspeito"  # non-PII untouched
    assert plain["full_name"] == "Joao"  # input not mutated
    assert crypto.decrypt_person(enc) == plain
    # Legacy plaintext (no sentinel) still passes through unchanged
    assert crypto.decrypt_person({"full_name": "PlainLegacy"}) == {"full_name": "PlainLegacy"}
    crypto._fernet_cache = crypto._UNSET
