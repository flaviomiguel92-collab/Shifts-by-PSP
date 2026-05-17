"""CRUD de cycles e isolamento entre utilizadores."""
import pytest

from tests.conftest import auth


@pytest.mark.asyncio
async def test_create_cycle(http, user_a):
    resp = await http.post(
        "/api/cycles",
        json={"name": "Ciclo Manhã/Tarde", "pattern": ["M", "T", "F"]},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Ciclo Manhã/Tarde"
    assert data["pattern"] == ["M", "T", "F"]
    assert "id" in data


@pytest.mark.asyncio
async def test_get_cycles(http, user_a):
    await http.post(
        "/api/cycles",
        json={"name": "C1", "pattern": ["A", "B"]},
        headers=auth(user_a["token"]),
    )
    resp = await http.get("/api/cycles", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    cycles = resp.json()
    assert len(cycles) >= 1
    assert all(c["user_id"] == user_a["user"]["user_id"] for c in cycles)


@pytest.mark.asyncio
async def test_update_cycle(http, user_a):
    create = await http.post(
        "/api/cycles",
        json={"name": "Original", "pattern": ["X"]},
        headers=auth(user_a["token"]),
    )
    cycle_id = create.json()["id"]
    resp = await http.put(
        f"/api/cycles/{cycle_id}",
        json={"name": "Atualizado", "pattern": ["X", "Y"]},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Atualizado"
    assert resp.json()["pattern"] == ["X", "Y"]


@pytest.mark.asyncio
async def test_delete_cycle(http, user_a):
    create = await http.post(
        "/api/cycles",
        json={"name": "Para apagar", "pattern": ["A"]},
        headers=auth(user_a["token"]),
    )
    cycle_id = create.json()["id"]
    resp = await http.delete(f"/api/cycles/{cycle_id}", headers=auth(user_a["token"]))
    assert resp.status_code == 200

    listing = await http.get("/api/cycles", headers=auth(user_a["token"]))
    ids = [c["id"] for c in listing.json()]
    assert cycle_id not in ids


@pytest.mark.asyncio
async def test_cycles_isolated(http, user_a, user_b):
    await http.post(
        "/api/cycles",
        json={"name": "Só de A", "pattern": ["A"]},
        headers=auth(user_a["token"]),
    )
    resp_b = await http.get("/api/cycles", headers=auth(user_b["token"]))
    names = [c["name"] for c in resp_b.json()]
    assert "Só de A" not in names


@pytest.mark.asyncio
async def test_cycle_reset_requires_header_auth(http, user_a):
    """Reset endpoint deve rejeitar autenticação apenas por cookie (CSRF protection)."""
    resp = await http.post(
        "/api/cycles/reset",
        cookies={"session_token": user_a["token"]},
    )
    assert resp.status_code == 403
