"""Tests for occurrences CRUD and person management."""
import pytest
import base64
import io

from PIL import Image


def photo(color="red", raw=False):
    output = io.BytesIO()
    Image.new("RGB", (16, 12), color).save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode()
    return encoded if raw else "data:image/png;base64," + encoded


async def create_with_photos(http, user):
    response = await http.post("/api/occurrences", headers={"Authorization": f"Bearer {user['token']}"},
        json={"date": "2026-11-13", "location": "Local de teste", "description": "Teste", "classification": "teste", "photos": [photo()]})
    assert response.status_code == 200
    return response.json()


@pytest.mark.asyncio
async def test_photos_persist_replace_remove_and_delete(http, user_a, mock_db):
    occurrence = await create_with_photos(http, user_a)
    url = f"/api/occurrences/{occurrence['id']}"
    headers = {"Authorization": f"Bearer {user_a['token']}"}
    reopened = (await http.get(url, headers=headers)).json()
    assert reopened["photos"] == occurrence["photos"]
    replacement = await http.put(url, headers=headers, json={"photos": [photo("blue")]})
    assert replacement.status_code == 200
    assert replacement.json()["photos"] != reopened["photos"]
    person_response = await http.post(url + "/persons", headers=headers, json={
        "role": "testemunha", "full_name": "Pessoa Teste", "document_type": "cartao_cidadao", "photos": [photo()]})
    person = person_response.json()["witnesses"][0]
    person_url = url + f"/persons/{person['id']}"
    changed_person = await http.put(person_url, headers=headers, json={"photos": [photo("blue")]})
    assert changed_person.status_code == 200
    assert changed_person.json()["photos"] != person["photos"]
    assert (await http.get(url, headers=headers)).json()["witnesses"][0]["photos"] == changed_person.json()["photos"]
    assert (await http.put(person_url, headers=headers, json={"photos": []})).json()["photos"] == []
    assert (await http.put(url, headers=headers, json={"photos": []})).json()["photos"] == []
    await http.put(url, headers=headers, json={"photos": [photo()]})
    await http.put(person_url, headers=headers, json={"photos": [photo()]})
    assert (await http.delete(url, headers=headers)).status_code == 200
    assert await mock_db.occurrences.find_one({"id": occurrence["id"]}) is None
    assert (await http.get(url, headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_photos_cannot_be_changed_or_deleted_by_another_user(http, user_a, user_b):
    occurrence = await create_with_photos(http, user_a)
    url = f"/api/occurrences/{occurrence['id']}"
    headers = {"Authorization": f"Bearer {user_b['token']}"}
    assert (await http.get(url, headers=headers)).status_code == 404
    assert (await http.put(url, headers=headers, json={"photos": []})).status_code == 404
    assert (await http.post(url + "/photos", headers=headers, json={"photo": photo()})).status_code == 404
    assert (await http.delete(url, headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_photo_validation_and_legacy_raw_base64(http, user_a):
    occurrence = await create_with_photos(http, user_a)
    url = f"/api/occurrences/{occurrence['id']}"
    headers = {"Authorization": f"Bearer {user_a['token']}"}
    for invalid in [[photo()] * 6, ["not-an-image"], ["x" * 3_000_001]]:
        assert (await http.put(url, headers=headers, json={"photos": invalid})).status_code == 422
    assert (await http.put(url, headers=headers, json={"photos": [photo(raw=True)]})).status_code == 200
    added = await http.post(url + "/photos", headers=headers, json={"photo": photo()})
    assert added.status_code == 200
    saved = (await http.get(url, headers=headers)).json()["photos"]
    assert len(saved) == 2
    assert all(value.startswith("data:image/png;base64,") for value in saved)


@pytest.mark.asyncio
async def test_photo_update_keeps_person_pii_readable(http, user_a, monkeypatch):
    from cryptography.fernet import Fernet
    from security import crypto

    monkeypatch.setenv("PII_ENC_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(crypto, "_fernet_cache", crypto._UNSET)
    occurrence = await create_with_photos(http, user_a)
    url = f"/api/occurrences/{occurrence['id']}"
    headers = {"Authorization": f"Bearer {user_a['token']}"}
    await http.post(url + "/persons", headers=headers, json={
        "role": "testemunha", "full_name": "Pessoa Teste", "document_type": "cartao_cidadao"})
    response = await http.put(url, headers=headers, json={"photos": [photo("blue")]})
    assert response.status_code == 200
    assert response.json()["witnesses"][0]["full_name"] == "Pessoa Teste"


def test_photo_normalization_removes_exif():
    from security.photos import normalize_photo

    output = io.BytesIO()
    image = Image.new("RGB", (16, 12), "red")
    exif = Image.Exif()
    exif[0x010E] = "private metadata"
    image.save(output, format="JPEG", exif=exif)
    value = normalize_photo(base64.b64encode(output.getvalue()).decode())
    with Image.open(io.BytesIO(base64.b64decode(value.split(",")[1]))) as cleaned:
        assert not cleaned.getexif()


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
