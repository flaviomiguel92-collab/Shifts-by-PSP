import { ServicoRemuneradoFormData } from './reportTypes';

export interface ReportValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateServicoRemunerado = (data: ServicoRemuneradoFormData): ReportValidationResult => {
  const errors: string[] = [];

  if (!data.reportDate.trim()) errors.push('Data do relatório em falta.');
  if (!data.reportHour.trim()) errors.push('Horário em falta.');
  if (data.ordemMissaoCumprida === null) errors.push('Resposta sobre Ordem de Missão em falta.');

  data.efetivoPolicial.forEach((item, index) => {
    if (!item.nome.trim() && !item.matricula.trim()) return;
    if (!item.nome.trim()) errors.push(`Efetivo #${index + 1}: nome em falta.`);
    if (!item.matricula.trim()) errors.push(`Efetivo #${index + 1}: matrícula em falta.`);
  });

  return { isValid: errors.length === 0, errors };
};
