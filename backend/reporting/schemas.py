from typing import List, Optional
from pydantic import BaseModel, Field


class EfetivoItem(BaseModel):
    categoria: str  # Agente, Chefe, Oficial


class DemaisEfetivoItem(BaseModel):
    categoria: str  # Agente, Chefe, Oficial
    nome: Optional[str] = ""
    matricula: Optional[str] = ""


class ExpedienteItem(BaseModel):
    npp: Optional[str] = ""
    nuipc: Optional[str] = ""
    tipificacao: Optional[str] = ""


class ServicoRemuneradoData(BaseModel):
    servicoRemunerado: Optional[str] = ""
    reportDate: Optional[str] = ""
    reportHour: Optional[str] = ""
    graduadoMatricula: Optional[str] = ""
    graduadoCategoria: str = "Agente"
    graduadoNome: Optional[str] = ""
    graduadoRadio: Optional[str] = ""
    efetivoPolicial: List[EfetivoItem] = Field(default_factory=list)
    demaisEfetivo: List[DemaisEfetivoItem] = Field(default_factory=list)
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
