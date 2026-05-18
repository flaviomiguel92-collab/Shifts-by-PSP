"""Tests for occurrences CRUD and person management."""
import pytest


@pytest.mark.asyncio
async def test_create_occurrence(http, user_a):
    resp = await http.post(
        "/api/occurrences",
        json={
            "date": "2025-01-15",
            "location": "Rua XX, Lisboa",
            "description": "Teste de ocorrência",
            "classification": "furto",
        },
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["location"] == "Rua XX, Lisboa"
    assert data["status"] == "rascunho"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_occurrences(http, user_a):
    await http.post(
        "/api/occurrences",
        json={"date": "2025-01-15", "location": "Rua A", "description": "Teste", "classification": "furto"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = await http.get(
        "/api/occurrences",
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_add_person_to_occurrence(http, user_a):
    create_resp = await http.post(
        "/api/occurrences",
        json={"date": "2025-01-15", "location": "Rua B", "description": "Teste", "classification": "furto"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    occ_id = create_resp.json()["id"]

    resp = await http.post(
        f"/api/occurrences/{occ_id}/persons",
        json={
            "role": "suspeito",
            "full_name": "João Teste",
            "document_type": "CC",
            "document_number": "12345678",
        },
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["suspects"]) == 1
    assert data["suspects"][0]["full_name"] == "João Teste"


@pytest.mark.asyncio
async def test_unauthorized_occurrence_access(http):
    resp = await http.get("/api/occurrences")
    assert resp.status_code == 401

    resp = await http.post("/api/occurrences", json={"date": "2025-01-01", "location": "Test", "description": "Test", "classification": "test"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_occurrence_update(http, user_a):
    create_resp = await http.post(
        "/api/occurrences",
        json={"date": "2025-02-01", "location": "Rua C", "description": "Original", "classification": "dano"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    occ_id = create_resp.json()["id"]

    resp = await http.put(
        f"/api/occurrences/{occ_id}",
        json={"status": "concluido", "description": "Atualizado"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "concluido"
    assert data["description"] == "Atualizado"