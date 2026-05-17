"""CRUD de gratificações e isolamento entre utilizadores."""
import pytest

from tests.conftest import auth


# ── Gratifications (valores de remuneração) ──────────────────────────────────

@pytest.mark.asyncio
async def test_create_gratification(http, user_a):
    resp = await http.post(
        "/api/gratifications",
        json={"date": "2026-05-01", "gratification_type": "Serviço Remunerado", "value": 50.0},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == "2026-05-01"
    assert data["gratification_type"] == "Serviço Remunerado"
    assert data["value"] == 50.0
    assert "id" in data


@pytest.mark.asyncio
async def test_get_gratifications(http, user_a):
    await http.post(
        "/api/gratifications",
        json={"date": "2026-05-02", "gratification_type": "Horas Extra", "value": 20.0},
        headers=auth(user_a["token"]),
    )
    resp = await http.get("/api/gratifications", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(g["user_id"] == user_a["user"]["user_id"] for g in items)


@pytest.mark.asyncio
async def test_get_gratifications_filter_month(http, user_a):
    await http.post(
        "/api/gratifications",
        json={"date": "2026-04-10", "gratification_type": "SR", "value": 10.0},
        headers=auth(user_a["token"]),
    )
    await http.post(
        "/api/gratifications",
        json={"date": "2026-05-10", "gratification_type": "SR", "value": 15.0},
        headers=auth(user_a["token"]),
    )
    resp = await http.get("/api/gratifications?month=2026-04", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    items = resp.json()
    assert all(g["date"].startswith("2026-04") for g in items)


@pytest.mark.asyncio
async def test_update_gratification(http, user_a):
    create = await http.post(
        "/api/gratifications",
        json={"date": "2026-05-03", "gratification_type": "SR", "value": 30.0},
        headers=auth(user_a["token"]),
    )
    grat_id = create.json()["id"]
    resp = await http.put(
        f"/api/gratifications/{grat_id}",
        json={"value": 45.0, "note": "Atualizado"},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["value"] == 45.0
    assert resp.json()["note"] == "Atualizado"


@pytest.mark.asyncio
async def test_delete_gratification(http, user_a):
    create = await http.post(
        "/api/gratifications",
        json={"date": "2026-05-04", "gratification_type": "SR", "value": 25.0},
        headers=auth(user_a["token"]),
    )
    grat_id = create.json()["id"]
    resp = await http.delete(f"/api/gratifications/{grat_id}", headers=auth(user_a["token"]))
    assert resp.status_code == 200

    listing = await http.get("/api/gratifications", headers=auth(user_a["token"]))
    ids = [g["id"] for g in listing.json()]
    assert grat_id not in ids


@pytest.mark.asyncio
async def test_gratifications_isolated(http, user_a, user_b):
    await http.post(
        "/api/gratifications",
        json={"date": "2026-05-05", "gratification_type": "SR", "value": 99.0},
        headers=auth(user_a["token"]),
    )
    resp_b = await http.get("/api/gratifications", headers=auth(user_b["token"]))
    assert resp_b.status_code == 200
    assert resp_b.json() == []


@pytest.mark.asyncio
async def test_gratification_invalid_date(http, user_a):
    resp = await http.post(
        "/api/gratifications",
        json={"date": "05/01/2026", "gratification_type": "SR", "value": 10.0},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_gratification_negative_value_rejected(http, user_a):
    resp = await http.post(
        "/api/gratifications",
        json={"date": "2026-05-06", "gratification_type": "SR", "value": -5.0},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 422


# ── Gratified entries (calendário de pessoal gratificado) ────────────────────

@pytest.mark.asyncio
async def test_create_gratified_entry(http, user_a):
    resp = await http.post(
        "/api/gratified-entries",
        json={"date": "2026-05-01", "name": "João Silva", "value": 80.0},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "João Silva"
    assert data["date"] == "2026-05-01"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_gratified_entries(http, user_a):
    await http.post(
        "/api/gratified-entries",
        json={"date": "2026-05-07", "name": "Maria Costa"},
        headers=auth(user_a["token"]),
    )
    resp = await http.get("/api/gratified-entries", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) >= 1
    assert all(e["user_id"] == user_a["user"]["user_id"] for e in entries)


@pytest.mark.asyncio
async def test_delete_gratified_entry(http, user_a):
    create = await http.post(
        "/api/gratified-entries",
        json={"date": "2026-05-08", "name": "Para apagar"},
        headers=auth(user_a["token"]),
    )
    entry_id = create.json()["id"]
    resp = await http.delete(f"/api/gratified-entries/{entry_id}", headers=auth(user_a["token"]))
    assert resp.status_code == 200

    listing = await http.get("/api/gratified-entries", headers=auth(user_a["token"]))
    ids = [e["id"] for e in listing.json()]
    assert entry_id not in ids


@pytest.mark.asyncio
async def test_gratified_entries_isolated(http, user_a, user_b):
    await http.post(
        "/api/gratified-entries",
        json={"date": "2026-05-09", "name": "Só de A"},
        headers=auth(user_a["token"]),
    )
    resp_b = await http.get("/api/gratified-entries", headers=auth(user_b["token"]))
    names = [e["name"] for e in resp_b.json()]
    assert "Só de A" not in names


@pytest.mark.asyncio
async def test_gratified_entries_reset_requires_header_auth(http, user_a):
    """Reset endpoint deve rejeitar autenticação apenas por cookie (CSRF protection)."""
    resp = await http.post(
        "/api/gratified-entries/reset",
        cookies={"session_token": user_a["token"]},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_gratified_entry_discount_percent_bounds(http, user_a):
    resp = await http.post(
        "/api/gratified-entries",
        json={"date": "2026-05-10", "name": "Teste", "discount_percent": 150.0},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 422
