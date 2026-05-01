import { ServicoRemuneradoFormData } from './reportTypes';

export interface ReportValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateServicoRemunerado = (data: ServicoRemuneradoFormData): ReportValidationResult => {
  const errors: string[] = [];

  data.demaisEfetivo.forEach((item, index) => {
    if (!item.nome.trim() && !item.matricula.trim() && !item.posto.trim()) return;
    if (!item.nome.trim()) errors.push(`Demais efetivo #${index + 1}: nome em falta.`);
    if (!item.matricula.trim()) errors.push(`Demais efetivo #${index + 1}: matrícula em falta.`);
  });

  data.expedienteEfetuado.forEach((item, index) => {
    if (!item.descricao.trim() && !item.referencia.trim()) return;
    if (!item.descricao.trim()) errors.push(`Expediente #${index + 1}: descrição em falta.`);
  });

  return { isValid: errors.length === 0, errors };
};
