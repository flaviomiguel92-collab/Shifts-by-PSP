from typing import Dict, Any, List
from datetime import datetime
from .schemas import ServicoRemuneradoData


def _non_empty_rows(items: List[Dict[str, Any]], required_key: str) -> List[Dict[str, Any]]:
    rows = [item for item in items if str(item.get(required_key, "")).strip()]
    return rows


def build_servico_remunerado_context(data: ServicoRemuneradoData) -> Dict[str, Any]:
    report_date_display = data.reportDate
    try:
        report_date_display = datetime.strptime(data.reportDate, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        report_date_display = data.reportDate

    demais_rows = _non_empty_rows(
        [item.model_dump() for item in data.demaisEfetivo],
        required_key="nome",
    )
    expediente_rows = _non_empty_rows(
        [item.model_dump() for item in data.expedienteEfetuado],
        required_key="descricao",
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
                "descricao": str(row.get("descricao", "")).strip(),
                "referencia": str(row.get("referencia", "")).strip() or "/",
            }
        )

    return {
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "report_date": report_date_display,
        "report_hour": data.reportHour,
        "remunerated_name": data.remuneratedName,
        "service_type": data.serviceType,
        "service_location": data.serviceLocation,
        "service_reference": data.serviceReference,
        "efetivo_total": data.efetivoTotal,
        "chefes_count": data.chefesCount,
        "agentes_count": data.agentesCount,
        "graduado_posto": data.graduadoPosto,
        "graduado_nome": data.graduadoNome,
        "graduado_matricula": data.graduadoMatricula if data.graduadoMatricula.upper().startswith("M/") else f"M/{data.graduadoMatricula}",
        "graduado_comando": data.graduadoComando,
        "observacoes": data.observacoes,
        "justificacoes": data.justificacoes,
        "demais_efetivo": normalized_demais,
        "expediente_efetuado": normalized_expediente,
    }
