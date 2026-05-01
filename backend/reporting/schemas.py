from typing import List, Optional
from pydantic import BaseModel, Field


class EfetivoItem(BaseModel):
    id: str
    categoria: str  # Agente, Chefe, Oficial
    nome: Optional[str] = ""
    matricula: Optional[str] = ""
    isMaisAntigo: bool = False


class ExpedienteItem(BaseModel):
    id: str
    npp: Optional[str] = ""
    nuipc: Optional[str] = ""
    tipificacao: Optional[str] = ""


class ServicoRemuneradoData(BaseModel):
    servicoRemunerado: Optional[str] = ""
    reportDate: Optional[str] = ""
    reportHour: Optional[str] = ""
    efetivoPolicial: List[EfetivoItem] = Field(default_factory=list)
    expedienteEfetuado: List[ExpedienteItem] = Field(default_factory=list)
    ordemMissaoCumprida: Optional[bool] = None
    justificacao: Optional[str] = ""
    observacao: Optional[str] = ""
    desired_file_name: Optional[str] = None


class ReportGenerateRequest(BaseModel):
    template_id: str
    data: dict


class ReportGenerateResponse(BaseModel):
    file_name: str
    mime_type: str = "application/pdf"
    pdf_base64: str
