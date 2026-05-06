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

    # Extract the person marked as "Mais Antigo" (most senior)
    mais_antigo = None
    for item in data.efetivoPolicial:
        if item.isMaisAntigo:
            mais_antigo = item
            break

    # Get other efetivo items (excluding the mais antigo)
    demais_rows = _non_empty_rows(
        [item.model_dump() for item in data.efetivoPolicial if not item.isMaisAntigo],
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

    # Get graduado info from the mais antigo item
    graduado_nome = mais_antigo.nome if mais_antigo else ""
    graduado_categoria = mais_antigo.categoria if mais_antigo else "Agente"
    graduado_matricula = str(mais_antigo.matricula or "").strip() if mais_antigo else ""
    graduado_radio = str(mais_antigo.radio or "").strip() if mais_antigo else ""

    if graduado_matricula and not graduado_matricula.upper().startswith("M/"):
        graduado_matricula = f"M/{graduado_matricula}"

    # Count efetivo by category
    efetivo_count = {}
    for item in data.efetivoPolicial:
        cat = str(item.categoria or "").strip()
        if cat:
            efetivo_count[cat] = efetivo_count.get(cat, 0) + 1

    # Build empty contactados structure for 8 fixed lines
    contactados_data = []
    if hasattr(data, 'contactados') and data.contactados:
        contactados_data = [item.model_dump() if hasattr(item, 'model_dump') else item for item in data.contactados]

    return {
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "servico_remunerado": data.servicoRemunerado or "",
        "report_date": report_date_display,
        "report_hour": data.reportHour or "",
        "graduado_nome": graduado_nome,
        "graduado_categoria": graduado_categoria,
        "graduado_matricula": graduado_matricula,
        "graduado_radio": graduado_radio,
        "efetivo_agentes": efetivo_count.get("Agente", 0),
        "efetivo_chefes": efetivo_count.get("Chefe", 0),
        "efetivo_oficiais": efetivo_count.get("Oficial", 0),
        "ordem_missao_cumprida": "Sim" if data.ordemMissaoCumprida else ("Não" if data.ordemMissaoCumprida is False else "Não respondido"),
        "justificacao": data.justificacao or "",
        "observacao": data.observacao or "",
        # Demais efetivo - 4 linhas fixas
        **{f"demais_{i}_matricula": normalized_demais[i]["matricula"] if i < len(normalized_demais) else "" for i in range(4)},
        **{f"demais_{i}_categoria": normalized_demais[i]["categoria"] if i < len(normalized_demais) else "Agente" for i in range(4)},
        **{f"demais_{i}_nome": normalized_demais[i]["nome"] if i < len(normalized_demais) else "" for i in range(4)},
        # Expediente - 4 linhas fixas
        **{f"exp_{i}_npp": normalized_expediente[i]["npp"] if i < len(normalized_expediente) else "/" for i in range(4)},
        **{f"exp_{i}_nuipc": normalized_expediente[i]["nuipc"] if i < len(normalized_expediente) else "" for i in range(4)},
        **{f"exp_{i}_tipificacao": normalized_expediente[i]["tipificacao"] if i < len(normalized_expediente) else "" for i in range(4)},
        # Contactados - 9 linhas fixas
        **{f"contactados_{i}_hora": contactados_data[i].get("hora", "") if i < len(contactados_data) else "" for i in range(9)},
        **{f"contactados_{i}_local": contactados_data[i].get("local", "") if i < len(contactados_data) else "" for i in range(9)},
        **{f"contactados_{i}_nome": contactados_data[i].get("nome", "") if i < len(contactados_data) else "" for i in range(9)},
        **{f"contactados_{i}_matricula": contactados_data[i].get("matricula", "") if i < len(contactados_data) else "" for i in range(9)},
        **{f"contactados_{i}_categoria": contactados_data[i].get("categoria", "") if i < len(contactados_data) else "" for i in range(9)},
    }
