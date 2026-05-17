"""User isolation: shifts, occurrences and cleanup must be scoped to user_id."""
import pytest

from tests.conftest import auth


# ─── Shifts ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_shifts_are_isolated(http, user_a, user_b):
    # Verify the two users are genuinely different
    me_a = await http.get("/api/auth/me", headers=auth(user_a["token"]))
    me_b = await http.get("/api/auth/me", headers=auth(user_b["token"]))
    uid_a = me_a.json()["user_id"]
    uid_b = me_b.json()["user_id"]
    assert uid_a != uid_b, f"Both tokens resolve to the same user_id: {uid_a}"

    # user_a creates a shift
    create = await http.post(
        "/api/shifts",
        json={"date": "2026-06-01", "shift_type": "Manhã"},
        headers=auth(user_a["token"]),
    )
    assert create.status_code == 200
    shift = create.json()
    assert shift["user_id"] == uid_a, (
        f"Shift stored with wrong user_id: got {shift['user_id']}, want {uid_a}"
    )

    # user_b cannot see it
    resp = await http.get("/api/shifts?month=2026-06", headers=auth(user_b["token"]))
    assert resp.status_code == 200
    shifts_b = resp.json()
    wrong = [s for s in shifts_b if s["user_id"] != uid_b]
    assert not wrong, (
        f"user_b (uid={uid_b}) saw {len(wrong)} foreign shift(s): "
        f"user_ids={[s['user_id'] for s in wrong]}"
    )
    assert shifts_b == []


@pytest.mark.asyncio
async def test_user_cannot_delete_other_users_shift(http, user_a, user_b):
    create = await http.post(
        "/api/shifts",
        json={"date": "2026-06-02", "shift_type": "Tarde"},
        headers=auth(user_a["token"]),
    )
    assert create.status_code == 200
    shift_id = create.json()["id"]

    resp = await http.delete(f"/api/shifts/{shift_id}", headers=auth(user_b["token"]))
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"

    # shift still exists for user_a
    resp = await http.get("/api/shifts?month=2026-06", headers=auth(user_a["token"]))
    assert any(s["id"] == shift_id for s in resp.json())


@pytest.mark.asyncio
async def test_user_cannot_update_other_users_shift(http, user_a, user_b):
    create = await http.post(
        "/api/shifts",
        json={"date": "2026-06-03", "shift_type": "Manhã"},
        headers=auth(user_a["token"]),
    )
    assert create.status_code == 200
    shift_id = create.json()["id"]

    resp = await http.put(
        f"/api/shifts/{shift_id}",
        json={"shift_type": "Noite"},
        headers=auth(user_b["token"]),
    )
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"


# ─── Cleanup ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cleanup_only_deletes_own_data(http, user_a, user_b):
    # Both users create a shift on the same date
    await http.post(
        "/api/shifts",
        json={"date": "2026-07-01", "shift_type": "Manhã"},
        headers=auth(user_a["token"]),
    )
    await http.post(
        "/api/shifts",
        json={"date": "2026-07-01", "shift_type": "Tarde"},
        headers=auth(user_b["token"]),
    )

    # user_a runs cleanup
    resp = await http.post("/api/cleanup/all-data", headers=auth(user_a["token"]))
    assert resp.status_code == 200

    # user_a's shift is gone
    resp_a = await http.get("/api/shifts?month=2026-07", headers=auth(user_a["token"]))
    assert resp_a.json() == []

    # user_b's shift is still there
    resp_b = await http.get("/api/shifts?month=2026-07", headers=auth(user_b["token"]))
    assert len(resp_b.json()) == 1


# ─── Occurrences ──────────────────────────────────────────────────────────────

_OCC_BODY = {
    "date": "2026-06-10",
    "location": "Posto Norte",
    "description": "Detalhe do incidente",
    "classification": "Geral",
}


@pytest.mark.asyncio
async def test_occurrences_are_isolated(http, user_a, user_b):
    create = await http.post(
        "/api/occurrences",
        json=_OCC_BODY,
        headers=auth(user_a["token"]),
    )
    assert create.status_code == 200, create.text

    resp = await http.get("/api/occurrences", headers=auth(user_b["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_user_cannot_delete_other_users_occurrence(http, user_a, user_b):
    create = await http.post(
        "/api/occurrences",
        json={**_OCC_BODY, "date": "2026-06-11"},
        headers=auth(user_a["token"]),
    )
    assert create.status_code == 200, create.text
    occ_id = create.json()["id"]

    resp = await http.delete(f"/api/occurrences/{occ_id}", headers=auth(user_b["token"]))
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"

    # still exists for user_a
    resp = await http.get("/api/occurrences", headers=auth(user_a["token"]))
    assert any(o["id"] == occ_id for o in resp.json())
