import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

import db as _db
from auth.dependencies import get_current_user
from config import _REPORT_RATE, limiter
from models.auth import User
from models.reports import ReportGenerateRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/reports/generate")
@limiter.limit(_REPORT_RATE)
async def generate_report(data: ReportGenerateRequest, request: Request, _user: User = Depends(get_current_user)):
    from reporting.generator import render_docx, convert_to_pdf
    context = {
        "report_date": data.report_date,
        "report_hour": data.report_hour,
        "generated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
        "graduado_nome": data.graduado_nome,
        "graduado_matricula": data.graduado_matricula,
        "graduado_radio": data.graduado_radio or "",
        "efetivo_oficiais": data.efetivo_oficiais,
        "efetivo_chefes": data.efetivo_chefes,
        "efetivo_agentes": data.efetivo_agentes,
        "servico_remunerado": data.servico_remunerado,
        "justificacao": data.justificacao or "",
        "observacao": data.observacao or "",
        "expediente_efetuado": [e.model_dump() for e in data.expediente_efetuado],
        "contactados": [p.model_dump() for p in data.contactados],
        "demais_efetivo": [p.model_dump() for p in data.demais_efetivo],
    }
    try:
        docx_bytes = render_docx(context)
    except Exception:
        logger.exception("report render failed")
        raise HTTPException(status_code=500, detail="Erro ao gerar o documento.")

    if data.format == "pdf":
        try:
            pdf_bytes = convert_to_pdf(docx_bytes)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="relatorio_{data.report_date}.pdf"'},
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc))

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="relatorio_{data.report_date}.docx"'},
    )
