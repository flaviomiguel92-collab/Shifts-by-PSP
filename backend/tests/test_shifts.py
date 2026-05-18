"""Tests for shifts CRUD, bulk operations, and data isolation between users."""
import pytest


@pytest.mark.asyncio
async def test_create_shift(http, user_a):
    resp = await http.post(
        "/api/shifts",
        json={"date": "2025-01-15", "shift_type": "Diurno", "start_time": "08:00", "end_time": "20:00"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == "2025-01-15"
    assert data["shift_type"] == "Diurno"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_shift_duplicate(http, user_a):
    await http.post(
        "/api/shifts",
        json={"date": "2025-01-15", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = await http.post(
        "/api/shifts",
        json={"date": "2025-01-15", "shift_type": "Noturno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_shifts(http, user_a):
    # Create 2 shifts first
    await http.post(
        "/api/shifts",
        json={"date": "2025-01-15", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    await http.post(
        "/api/shifts",
        json={"date": "2025-01-16", "shift_type": "Noturno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = await http.get(
        "/api/shifts",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_get_shifts_by_month(http, user_a):
    await http.post(
        "/api/shifts",
        json={"date": "2025-02-01", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    await http.post(
        "/api/shifts",
        json={"date": "2025-02-15", "shift_type": "Noturno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = await http.get(
        "/api/shifts?month=2025-02",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_data_isolation_between_users(http, user_a, user_b):
    # User A creates a shift
    await http.post(
        "/api/shifts",
        json={"date": "2025-03-01", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    # User B should see no shifts
    resp = await http.get(
        "/api/shifts",
        headers={"Authorization": f"Bearer {user_b['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # User B's shifts should be empty (or at least not contain user A's shift)
    for shift in data:
        assert shift["date"] != "2025-03-01"


@pytest.mark.asyncio
async def test_update_shift(http, user_a):
    create_resp = await http.post(
        "/api/shifts",
        json={"date": "2025-04-01", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    shift_id = create_resp.json()["id"]

    resp = await http.put(
        f"/api/shifts/{shift_id}",
        json={"shift_type": "Noturno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["shift_type"] == "Noturno"


@pytest.mark.asyncio
async def test_delete_shift(http, user_a):
    create_resp = await http.post(
        "/api/shifts",
        json={"date": "2025-05-01", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    shift_id = create_resp.json()["id"]

    resp = await http.delete(
        f"/api/shifts/{shift_id}",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200

    # Verify it's gone
    get_resp = await http.get(
        f"/api/shifts/2025-05-01",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert get_resp.status_code == 200
    assert get_resp.json() is None


@pytest.mark.asyncio
async def test_bulk_upsert_shifts(http, user_a):
    shifts = [
        {"date": "2025-06-01", "shift_type": "Diurno"},
        {"date": "2025-06-02", "shift_type": "Noturno"},
        {"date": "2025-06-03", "shift_type": "Diurno"},
    ]
    resp = await http.post(
        "/api/shifts/bulk",
        json={"shifts": shifts},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 3


@pytest.mark.asyncio
async def test_shift_unauthorized(http):
    resp = await http.get("/api/shifts")
    assert resp.status_code == 401

    resp = await http.post("/api/shifts", json={"date": "2025-01-01", "shift_type": "Test"})
    assert resp.status_code == 401

    resp = await http.put("/api/shifts/fake-id", json={"shift_type": "Test"})
    assert resp.status_code == 401

    resp = await http.delete("/api/shifts/fake-id")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_shift_by_date(http, user_a):
    await http.post(
        "/api/shifts",
        json={"date": "2025-07-01", "shift_type": "Diurno"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = await http.get(
        "/api/shifts/2025-07-01",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None
    assert data["date"] == "2025-07-01"