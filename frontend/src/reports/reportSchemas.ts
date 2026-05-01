import { ReportTemplateDefinition, ServicoRemuneradoFormData } from './reportTypes';

export const makeEfetivoItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  matricula: '',
  categoria: 'Agente' as const,
  nome: '',
  radio: '',
  isMaisAntigo: false,
});

export const makeExpedienteItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  npp: '',
  nuipc: '',
  tipificacao: '',
});

export const SERVICO_REMUNERADO_TEMPLATE: ReportTemplateDefinition<ServicoRemuneradoFormData> = {
  id: 'servico_remunerado',
  title: 'Relatório de Serviço Remunerado',
  description: 'Modelo base para serviço remunerado com exportação automática em PDF.',
  version: 'v1',
  createInitialData: () => ({
    servicoRemunerado: '',
    reportDate: '',
    reportHour: '',
    efetivoPolicial: [makeEfetivoItem()],
    expedienteEfetuado: [],
    ordemMissaoCumprida: null,
    justificacao: '',
    observacao: '',
  }),
};

export const reportTemplatesCatalog = [SERVICO_REMUNERADO_TEMPLATE];
