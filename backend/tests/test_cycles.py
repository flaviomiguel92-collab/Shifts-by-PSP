"""Tests for cycles CRUD."""
import pytest


@pytest.mark.asyncio
async def test_create_cycle(http, user_a):
    resp = await http.post(
        "/api/cycles",
        json={"name": "Ciclo A", "pattern": ["D", "N", "F"]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Ciclo A"
    assert data["pattern"] == ["D", "N", "F"]


@pytest.mark.asyncio
async def test_get_cycles(http, user_a):
    await http.post(
        "/api/cycles",
        json={"name": "Ciclo B", "pattern": ["D", "F"]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = await http.get(
        "/api/cycles",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_update_cycle(http, user_a):
    create_resp = await http.post(
        "/api/cycles",
        json={"name": "Ciclo C", "pattern": ["D", "N"]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    cycle_id = create_resp.json()["id"]

    resp = await http.put(
        f"/api/cycles/{cycle_id}",
        json={"name": "Ciclo Atualizado"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ciclo Atualizado"


@pytest.mark.asyncio
async def test_delete_cycle(http, user_a):
    create_resp = await http.post(
        "/api/cycles",
        json={"name": "Ciclo D", "pattern": ["D"]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    cycle_id = create_resp.json()["id"]

    resp = await http.delete(
        f"/api/cycles/{cycle_id}",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200