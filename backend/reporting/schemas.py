from typing import List, Optional
from pydantic import BaseModel, Field


class DemaisEfetivoItem(BaseModel):
    posto: Optional[str] = ""
    nome: Optional[str] = ""
    matricula: Optional[str] = ""


class ExpedienteItem(BaseModel):
    descricao: Optional[str] = ""
    referencia: Optional[str] = ""


class ServicoRemuneradoData(BaseModel):
    reportDate: str
    reportHour: str
    remuneratedName: str
    serviceType: Optional[str] = ""
    serviceLocation: Optional[str] = ""
    serviceReference: Optional[str] = ""
    efetivoTotal: Optional[str] = ""
    chefesCount: Optional[str] = ""
    agentesCount: Optional[str] = ""
    graduadoPosto: Optional[str] = ""
    graduadoNome: Optional[str] = ""
    graduadoMatricula: str
    graduadoComando: Optional[str] = ""
    observacoes: Optional[str] = ""
    justificacoes: Optional[str] = ""
    demaisEfetivo: List[DemaisEfetivoItem] = Field(default_factory=list)
    expedienteEfetuado: List[ExpedienteItem] = Field(default_factory=list)
    desired_file_name: Optional[str] = None


class ReportGenerateRequest(BaseModel):
    template_id: str
    data: dict


class ReportGenerateResponse(BaseModel):
    file_name: str
    mime_type: str = "application/pdf"
    pdf_base64: str
