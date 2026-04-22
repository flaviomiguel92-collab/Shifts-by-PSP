const PT_MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const normalizeFileSegment = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');

export const buildServicoRemuneradoFileName = (params: {
  reportDate: string;
  reportHour: string;
  remuneratedName: string;
  graduadoMatricula: string;
}) => {
  const date = new Date(`${params.reportDate}T12:00:00`);
  const day = String(date.getDate()).padStart(2, '0');
  const month = PT_MONTH_ABBR[date.getMonth()] || 'JAN';
  const year = String(date.getFullYear()).slice(-2);
  const time = params.reportHour.replace(':', '').padStart(4, '0');

  const remuneratedName = normalizeFileSegment(params.remuneratedName || 'Sem nome');
  const matricula = normalizeFileSegment(params.graduadoMatricula || 'Sem matricula');

  return `${day}${time}${month}${year} - ${remuneratedName} - ${matricula}.pdf`;
};
