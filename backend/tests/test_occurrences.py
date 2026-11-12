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
            "nacionalidade": "Portuguesa",
            "naturalidade": "Lisboa",
            "profissao": "Operador de logística",
            "habilitacoes_literarias": "Ensino secundário",
            "estado_civil": "Solteiro",
            "document_type": "CC",
            "document_number": "12345678",
            "date_of_birth": "1998-05-12",
            "mother_name": "Maria Teste",
            "father_name": "Pedro Teste",
        },
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["suspects"]) == 1
    person = data["suspects"][0]
    assert person["full_name"] == "João Teste"
    assert person["nacionalidade"] == "Portuguesa"
    assert person["naturalidade"] == "Lisboa"
    assert person["profissao"] == "Operador de logística"
    assert person["habilitacoes_literarias"] == "Ensino secundário"
    assert person["estado_civil"] == "Solteiro"
    assert person["date_of_birth"] == "1998-05-12"
    assert person["mother_name"] == "Maria Teste"
    assert person["father_name"] == "Pedro Teste"


@pytest.mark.asyncio
async def test_update_person_in_occurrence(http, user_a):
    create_resp = await http.post(
        "/api/occurrences",
        json={"date": "2025-01-15", "location": "Rua C", "description": "Teste", "classification": "furto"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    occ_id = create_resp.json()["id"]

    person_resp = await http.post(
        f"/api/occurrences/{occ_id}/persons",
        json={
            "role": "suspeito",
            "full_name": "Maria Silva",
            "address": "Rua Antiga, 10",
            "phone": "912345678",
            "document_type": "CC",
            "document_number": "87654321",
        },
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    person_id = person_resp.json()["suspects"][0]["id"]

    resp = await http.put(
        f"/api/occurrences/{occ_id}/persons/{person_id}",
        json={
            "full_name": "Maria Souza",
            "address": "Rua Nova, 22",
            "phone": "923456789",
            "nacionalidade": "Brasileira",
            "naturalidade": "Porto Alegre",
            "profissao": "Enfermeira",
            "habilitacoes_literarias": "Licenciatura",
            "estado_civil": "Casada",
            "date_of_birth": "1990-03-03",
            "mother_name": "Ana Souza",
            "father_name": "José Souza",
        },
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Maria Souza"
    assert data["address"] == "Rua Nova, 22"
    assert data["phone"] == "923456789"
    assert data["nacionalidade"] == "Brasileira"
    assert data["naturalidade"] == "Porto Alegre"
    assert data["profissao"] == "Enfermeira"
    assert data["habilitacoes_literarias"] == "Licenciatura"
    assert data["estado_civil"] == "Casada"
    assert data["date_of_birth"] == "1990-03-03"
    assert data["mother_name"] == "Ana Souza"
    assert data["father_name"] == "José Souza"


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