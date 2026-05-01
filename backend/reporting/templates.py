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

    if not demais_rows:
        demais_rows = [{"categoria": "", "nome": "", "matricula": ""}]

    normalized_demais = []
    for row in demais_rows:
        matricula = str(row.get("matricula", "")).strip()
        if matricula and not matricula.upper().startswith("M/"):
            matricula = f"M/{matricula}"
        normalized_demais.append(
            {
                "categoria": str(row.get("categoria", "")).strip(),
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

    graduado_matricula = str(data.graduadoMatricula or "").strip()
    if graduado_matricula and not graduado_matricula.upper().startswith("M/"):
        graduado_matricula = f"M/{graduado_matricula}"

    # Contar efetivo por categoria
    efetivo_count = {}
    for item in data.efetivoPolicial:
        cat = str(item.categoria or "").strip()
        if cat:
            efetivo_count[cat] = efetivo_count.get(cat, 0) + 1

    return {
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "servico_remunerado": data.servicoRemunerado or "",
        "report_date": report_date_display,
        "report_hour": data.reportHour or "",
        "graduado_nome": data.graduadoNome or "",
        "graduado_categoria": data.graduadoCategoria or "Agente",
        "graduado_matricula": graduado_matricula,
        "graduado_radio": data.graduadoRadio or "",
        "efetivo_agentes": efetivo_count.get("Agente", 0),
        "efetivo_chefes": efetivo_count.get("Chefe", 0),
        "efetivo_oficiais": efetivo_count.get("Oficial", 0),
        "ordem_missao_cumprida": "Sim" if data.ordemMissaoCumprida else ("Não" if data.ordemMissaoCumprida is False else "Não respondido"),
        "justificacao": data.justificacao or "",
        "observacao": data.observacao or "",
        "demais_efetivo": normalized_demais,
        "expediente_efetuado": normalized_expediente,
    }
