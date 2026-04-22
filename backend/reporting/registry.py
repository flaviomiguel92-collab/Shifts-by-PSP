from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Any
import os


@dataclass(frozen=True)
class ReportTemplateDefinition:
    template_id: str
    title: str
    template_docx_path_candidates: list[Path]
    context_builder: Callable[[Any], Dict[str, Any]]


def build_template_registry(context_builder: Callable[[Any], Dict[str, Any]]) -> Dict[str, ReportTemplateDefinition]:
    configured_path = os.environ.get("SERVICO_REMUNERADO_TEMPLATE_PATH", "").strip()
    candidates = [
        Path(configured_path) if configured_path else None,
        Path(r"D:\Relatorios Remunerados\030730DEZ25 - Pingo Doce - 200890.docx"),
        Path(__file__).resolve().parent.parent / "templates" / "relatorio_servico_remunerado.docx",
    ]

    return {
        "servico_remunerado": ReportTemplateDefinition(
            template_id="servico_remunerado",
            title="Relatório de Serviço Remunerado",
            template_docx_path_candidates=[path for path in candidates if path is not None],
            context_builder=context_builder,
        )
    }
