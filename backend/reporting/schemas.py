from typing import List, Optional
from pydantic import BaseModel, Field


class DemaisEfetivoItem(BaseModel):
    posto: Optional[str] = ""
    nome: Optional[str] = ""
    matricula: Optional[str] = ""


class ExpedienteItem(BaseModel):
    npp: Optional[str] = ""
    nuipc: Optional[str] = ""
    tipificacao: Optional[str] = ""


class ContactadoItem(BaseModel):
    hora: Optional[str] = ""
    nome: Optional[str] = ""
    local: Optional[str] = ""


class ServicoRemuneradoData(BaseModel):
    reportDate: Optional[str] = ""
    reportHour: Optional[str] = ""
    remuneratedName: Optional[str] = ""
    serviceType: Optional[str] = ""
    serviceLocation: Optional[str] = ""
    serviceReference: Optional[str] = ""
    efetivoTotal: Optional[str] = ""
    oficiaisCount: Optional[str] = ""
    chefesCount: Optional[str] = ""
    agentesCount: Optional[str] = ""
    graduadoPosto: Optional[str] = ""
    graduadoNome: Optional[str] = ""
    graduadoMatricula: Optional[str] = ""
    graduadoComando: Optional[str] = ""
    observacoes: List[str] = Field(default_factory=list)
    justificacoes: List[str] = Field(default_factory=list)
    demaisEfetivo: List[DemaisEfetivoItem] = Field(default_factory=list)
    contactados: List[ContactadoItem] = Field(default_factory=list)
    expedienteEfetuado: List[ExpedienteItem] = Field(default_factory=list)
    desired_file_name: Optional[str] = None


class ReportGenerateRequest(BaseModel):
    template_id: str
    data: dict


class ReportGenerateResponse(BaseModel):
    file_name: str
    mime_type: str = "application/pdf"
    pdf_base64: str
