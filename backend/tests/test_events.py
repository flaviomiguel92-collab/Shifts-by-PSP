"""Tests for the Event entity: CRUD, month filter, user isolation, auth."""
import pytest

from tests.conftest import auth


@pytest.mark.asyncio
async def test_create_event(http, user_a):
    resp = await http.post(
        "/api/events",
        json={"date": "2026-09-01", "title": "Tribunal", "start_time": "14:00", "end_time": "15:30", "location": "Lisboa"},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["title"] == "Tribunal"
    assert data["date"] == "2026-09-01"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_event_invalid_date(http, user_a):
    resp = await http.post(
        "/api/events",
        json={"date": "01-09-2026", "title": "X"},
        headers=auth(user_a["token"]),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_events_by_month(http, user_a):
    await http.post("/api/events", json={"date": "2026-09-02", "title": "A"}, headers=auth(user_a["token"]))
    await http.post("/api/events", json={"date": "2026-10-02", "title": "B"}, headers=auth(user_a["token"]))
    resp = await http.get("/api/events?month=2026-09", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert [e["title"] for e in data] == ["A"]


@pytest.mark.asyncio
async def test_update_event(http, user_a):
    create = await http.post(
        "/api/events", json={"date": "2026-09-03", "title": "Antigo"}, headers=auth(user_a["token"])
    )
    eid = create.json()["id"]
    resp = await http.put(
        f"/api/events/{eid}", json={"title": "Novo", "note": "n"}, headers=auth(user_a["token"])
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Novo"
    assert resp.json()["note"] == "n"


@pytest.mark.asyncio
async def test_delete_event(http, user_a):
    create = await http.post(
        "/api/events", json={"date": "2026-09-04", "title": "Apagar"}, headers=auth(user_a["token"])
    )
    eid = create.json()["id"]
    resp = await http.delete(f"/api/events/{eid}", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    again = await http.delete(f"/api/events/{eid}", headers=auth(user_a["token"]))
    assert again.status_code == 404


@pytest.mark.asyncio
async def test_events_isolated_between_users(http, user_a, user_b):
    await http.post("/api/events", json={"date": "2026-09-05", "title": "DeA"}, headers=auth(user_a["token"]))
    resp = await http.get("/api/events", headers=auth(user_b["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_events_unauthorized(http):
    assert (await http.get("/api/events")).status_code == 401
    assert (await http.post("/api/events", json={"date": "2026-09-01", "title": "X"})).status_code == 401


@pytest.mark.asyncio
async def test_events_reset_requires_header_auth(http, user_a):
    resp = await http.post("/api/events/reset", cookies={"session_token": user_a["token"]})
    assert resp.status_code == 403
