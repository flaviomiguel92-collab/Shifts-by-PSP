import argparse
import base64
import json
from pathlib import Path

import requests


def build_payload() -> dict:
    return {
        "template_id": "servico_remunerado",
        "data": {
            "reportDate": "2026-04-22",
            "reportHour": "10:30",
            "remuneratedName": "Teste Local",
            "serviceType": "Patrulha",
            "serviceLocation": "Centro",
            "serviceReference": "REF-123",
            "efetivoTotal": "2",
            "chefesCount": "1",
            "agentesCount": "1",
            "graduadoPosto": "Sargento",
            "graduadoNome": "Joao Silva",
            "graduadoMatricula": "123456",
            "graduadoComando": "Comando X",
            "observacoes": "Obs teste",
            "justificacoes": "Just teste",
            "demaisEfetivo": [
                {"posto": "Agente", "nome": "Maria", "matricula": "654321"}
            ],
            "expedienteEfetuado": [{"descricao": "Ronda", "referencia": "BO-9"}],
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Teste rapido da geracao de relatorio PDF."
    )
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="URL base da API (default: http://127.0.0.1:8000)",
    )
    parser.add_argument(
        "--output-dir",
        default=".",
        help="Pasta onde o PDF gerado sera salvo (default: pasta atual)",
    )
    args = parser.parse_args()

    endpoint = f"{args.base_url.rstrip('/')}/api/reports/generate"
    payload = build_payload()

    response = requests.post(endpoint, json=payload, timeout=120)
    if response.status_code != 200:
        raise RuntimeError(
            f"Falha no endpoint ({response.status_code}): {response.text[:500]}"
        )

    body = response.json()
    file_name = body.get("file_name", "report.pdf")
    pdf_base64 = body.get("pdf_base64")
    if not pdf_base64:
        raise RuntimeError("Resposta sem campo pdf_base64.")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / file_name
    output_file.write_bytes(base64.b64decode(pdf_base64))

    print("OK: PDF gerado com sucesso")
    print(f"Ficheiro: {output_file.resolve()}")
    print(
        "Resposta resumida:",
        json.dumps(
            {"file_name": file_name, "mime_type": body.get("mime_type")},
            ensure_ascii=True,
        ),
    )


if __name__ == "__main__":
    main()
