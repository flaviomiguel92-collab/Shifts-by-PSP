export type ReportTemplateId = 'servico_remunerado';

export interface DemaisEfetivoItem {
  id: string;
  posto: string;
  nome: string;
  matricula: string;
}

export interface ExpedienteItem {
  id: string;
  npp: string;
  nuipc: string;
  tipificacao: string;
}

export interface ContactadoItem {
  id: string;
  hora: string;
  nome: string;
  local: string;
}

export interface ServicoRemuneradoFormData {
  reportDate: string;
  reportHour: string;
  remuneratedName: string;
  serviceType: string;
  serviceLocation: string;
  serviceReference: string;
  efetivoTotal: string;
  oficiaisCount: string;
  chefesCount: string;
  agentesCount: string;
  graduadoPosto: string;
  graduadoNome: string;
  graduadoMatricula: string;
  graduadoComando: string;
  observacoes: string[];
  justificacoes: string[];
  demaisEfetivo: DemaisEfetivoItem[];
  contactados: ContactadoItem[];
  expedienteEfetuado: ExpedienteItem[];
}

export interface ReportTemplateDefinition<TFormData> {
  id: ReportTemplateId;
  title: string;
  description: string;
  version: string;
  createInitialData: () => TFormData;
}

export interface ReportGeneratePayload {
  template_id: ReportTemplateId;
  data: Record<string, unknown>;
}

export interface ReportGenerateResponse {
  file_name: string;
  mime_type: string;
  pdf_base64: string;
}
