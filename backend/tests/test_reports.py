"""Testes para o endpoint /api/reports/generate."""
import pytest
from unittest.mock import patch

from tests.conftest import auth

_VALID_PAYLOAD = {
    "report_date": "2026-05-01",
    "report_hour": "08:00",
    "graduado_nome": "Agente Silva",
    "graduado_matricula": "12345",
    "efetivo_oficiais": 1,
    "efetivo_chefes": 2,
    "efetivo_agentes": 5,
    "format": "docx",
}

_FAKE_DOCX = b"PK\x03\x04fake-docx-bytes"  # minimal non-empty bytes


@pytest.mark.asyncio
async def test_generate_report_unauthenticated(http):
    resp = await http.post("/api/reports/generate", json=_VALID_PAYLOAD)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_generate_report_docx(http, user_a):
    with patch("reporting.generator.render_docx", return_value=_FAKE_DOCX):
        resp = await http.post(
            "/api/reports/generate",
            json=_VALID_PAYLOAD,
            headers=auth(user_a["token"]),
        )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert "relatorio_2026-05-01.docx" in resp.headers.get("content-disposition", "")


@pytest.mark.asyncio
async def test_generate_report_pdf_fallback_when_libreoffice_missing(http, user_a):
    """When LibreOffice is not installed, /reports/generate with format=pdf returns 503."""
    with patch("reporting.generator.render_docx", return_value=_FAKE_DOCX), \
         patch("reporting.generator.convert_to_pdf", side_effect=RuntimeError("LibreOffice not found")):
        resp = await http.post(
            "/api/reports/generate",
            json={**_VALID_PAYLOAD, "format": "pdf"},
            headers=auth(user_a["token"]),
        )
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_generate_report_pdf_success(http, user_a):
    fake_pdf = b"%PDF-1.4 fake"
    with patch("reporting.generator.render_docx", return_value=_FAKE_DOCX), \
         patch("reporting.generator.convert_to_pdf", return_value=fake_pdf):
        resp = await http.post(
            "/api/reports/generate",
            json={**_VALID_PAYLOAD, "format": "pdf"},
            headers=auth(user_a["token"]),
        )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "relatorio_2026-05-01.pdf" in resp.headers.get("content-disposition", "")


@pytest.mark.asyncio
async def test_generate_report_render_error_returns_500(http, user_a):
    with patch("reporting.generator.render_docx", side_effect=Exception("template error")):
        resp = await http.post(
            "/api/reports/generate",
            json=_VALID_PAYLOAD,
            headers=auth(user_a["token"]),
        )
    assert resp.status_code == 500


@pytest.mark.asyncio
async def test_generate_report_with_lists(http, user_a):
    payload = {
        **_VALID_PAYLOAD,
        "expediente_efetuado": [{"tipificacao": "Patrulhamento", "hora": "08:00"}],
        "contactados": [{"nome": "João", "matricula": "111"}],
        "demais_efetivo": [{"nome": "Maria", "matricula": "222"}],
    }
    with patch("reporting.generator.render_docx", return_value=_FAKE_DOCX):
        resp = await http.post(
            "/api/reports/generate",
            json=payload,
            headers=auth(user_a["token"]),
        )
    assert resp.status_code == 200
