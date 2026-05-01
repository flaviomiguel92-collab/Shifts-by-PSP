import { ReportTemplateDefinition, ServicoRemuneradoFormData } from './reportTypes';

export const makeEfetivoItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  categoria: 'Agente' as const,
});

export const makeDemaisEfetivoItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  categoria: 'Agente' as const,
  nome: '',
  matricula: '',
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
    graduadoMatricula: '',
    graduadoCategoria: 'Agente',
    graduadoNome: '',
    graduadoRadio: '',
    efetivoPolicial: [],
    demaisEfetivo: [makeDemaisEfetivoItem()],
    expedienteEfetuado: [],
    ordemMissaoCumprida: null,
    justificacao: '',
    observacao: '',
  }),
};

export const reportTemplatesCatalog = [SERVICO_REMUNERADO_TEMPLATE];
