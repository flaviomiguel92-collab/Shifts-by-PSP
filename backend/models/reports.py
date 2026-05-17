from typing import List, Optional

from pydantic import BaseModel


class ReportPersonItem(BaseModel):
    nome: str
    matricula: Optional[str] = ""


class ReportExpedienteItem(BaseModel):
    tipificacao: str
    npp: Optional[str] = ""
    nome: Optional[str] = ""
    matricula: Optional[str] = ""
    hora: Optional[str] = ""
    nuipc: Optional[str] = ""
    local: Optional[str] = ""


class ReportGenerateRequest(BaseModel):
    report_date: str
    report_hour: str
    graduado_nome: str
    graduado_matricula: str
    graduado_radio: Optional[str] = ""
    efetivo_oficiais: int = 0
    efetivo_chefes: int = 0
    efetivo_agentes: int = 0
    servico_remunerado: str = "Não"
    justificacao: Optional[str] = ""
    observacao: Optional[str] = ""
    expediente_efetuado: List[ReportExpedienteItem] = []
    contactados: List[ReportPersonItem] = []
    demais_efetivo: List[ReportPersonItem] = []
    format: str = "docx"  # "docx" or "pdf"
