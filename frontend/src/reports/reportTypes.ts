export type ReportTemplateId = 'servico_remunerado';
export type Categoria = 'Agente' | 'Chefe' | 'Oficial';

export interface EfetivoItem {
  id: string;
  matricula: string;
  categoria: Categoria;
  nome: string;
  radio: string;
  isMaisAntigo: boolean;
}

export interface ExpedienteItem {
  id: string;
  npp: string;
  nuipc: string;
  tipificacao: string;
}

export interface ServicoRemuneradoFormData {
  servicoRemunerado: string;
  reportDate: string;
  reportHour: string;
  efetivoPolicial: EfetivoItem[];
  expedienteEfetuado: ExpedienteItem[];
  ordemMissaoCumprida: boolean | null;
  justificacao: string;
  observacao: string;
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
