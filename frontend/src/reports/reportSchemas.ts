import { ReportTemplateDefinition, ServicoRemuneradoFormData } from './reportTypes';

const createDemaisEfetivoItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  posto: '',
  nome: '',
  matricula: '',
});

export const SERVICO_REMUNERADO_TEMPLATE: ReportTemplateDefinition<ServicoRemuneradoFormData> = {
  id: 'servico_remunerado',
  title: 'Relatório de Serviço Remunerado',
  description: 'Modelo base para serviço remunerado com exportação automática em PDF.',
  version: 'v1',
  createInitialData: () => ({
    reportDate: '',
    reportHour: '',
    remuneratedName: '',
    serviceType: '',
    serviceLocation: '',
    serviceReference: '',
    efetivoTotal: '',
    chefesCount: '',
    agentesCount: '',
    graduadoPosto: '',
    graduadoNome: '',
    graduadoMatricula: '',
    graduadoComando: '',
    observacoes: '',
    justificacoes: '',
    demaisEfetivo: [createDemaisEfetivoItem()],
    expedienteEfetuado: [],
  }),
};

export const reportTemplatesCatalog = [SERVICO_REMUNERADO_TEMPLATE];

export const makeDemaisEfetivoItem = createDemaisEfetivoItem;

export const makeExpedienteItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  descricao: '',
  referencia: '',
});
