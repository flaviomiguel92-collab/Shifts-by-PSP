from typing import Dict, Any, List
from datetime import datetime
from .schemas import ServicoRemuneradoData


def _non_empty_rows(items: List[Dict[str, Any]], required_key: str) -> List[Dict[str, Any]]:
    rows = [item for item in items if str(item.get(required_key, "")).strip()]
    return rows


def build_servico_remunerado_context(data: ServicoRemuneradoData) -> Dict[str, Any]:
    report_date_display = data.reportDate or ""
    try:
        if data.reportDate:
            report_date_display = datetime.strptime(data.reportDate, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        report_date_display = data.reportDate or ""

    demais_rows = _non_empty_rows(
        [item.model_dump() for item in data.demaisEfetivo],
        required_key="nome",
    )
    expediente_rows = _non_empty_rows(
        [item.model_dump() for item in data.expedienteEfetuado],
        required_key="npp",
    )
    contactados_rows = _non_empty_rows(
        [item.model_dump() for item in data.contactados],
        required_key="nome",
    )

    if not demais_rows:
        demais_rows = [{"posto": "", "nome": "", "matricula": ""}]

    normalized_demais = []
    for row in demais_rows:
        matricula = str(row.get("matricula", "")).strip()
        if matricula and not matricula.upper().startswith("M/"):
            matricula = f"M/{matricula}"
        normalized_demais.append(
            {
                "posto": str(row.get("posto", "")).strip(),
                "nome": str(row.get("nome", "")).strip(),
                "matricula": matricula,
            }
        )

    normalized_expediente = []
    for row in expediente_rows:
        normalized_expediente.append(
            {
                "npp": str(row.get("npp", "")).strip() or "/",
                "nuipc": str(row.get("nuipc", "")).strip() or "/",
                "tipificacao": str(row.get("tipificacao", "")).strip() or "/",
            }
        )

    normalized_contactados = []
    for row in contactados_rows:
        normalized_contactados.append(
            {
                "hora": str(row.get("hora", "")).strip(),
                "nome": str(row.get("nome", "")).strip(),
                "local": str(row.get("local", "")).strip(),
            }
        )

    graduado_matricula = str(data.graduadoMatricula or "").strip()
    if graduado_matricula and not graduado_matricula.upper().startswith("M/"):
        graduado_matricula = f"M/{graduado_matricula}"

    observacoes_text = "\n".join(
        [line.strip() for line in (data.observacoes or []) if str(line).strip()]
    )
    justificacoes_text = "\n".join(
        [line.strip() for line in (data.justificacoes or []) if str(line).strip()]
    )

    return {
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "report_date": report_date_display,
        "report_hour": data.reportHour or "",
        "remunerated_name": data.remuneratedName or "",
        "service_type": data.serviceType or "",
        "service_location": data.serviceLocation or "",
        "service_reference": data.serviceReference or "",
        "efetivo_total": data.efetivoTotal or "",
        "oficiais_count": data.oficiaisCount or "",
        "chefes_count": data.chefesCount or "",
        "agentes_count": data.agentesCount or "",
        "graduado_posto": data.graduadoPosto or "",
        "graduado_nome": data.graduadoNome or "",
        "graduado_matricula": graduado_matricula,
        "graduado_comando": data.graduadoComando or "",
        "observacoes": observacoes_text,
        "justificacoes": justificacoes_text,
        "demais_efetivo": normalized_demais,
        "contactados": normalized_contactados,
        "expediente_efetuado": normalized_expediente,
    }
