import { ReportGeneratePayload, ReportGenerateResponse } from '../reports/reportTypes';

const API_BASE_URL = 'https://shifts-by-psp.onrender.com/api';

const getHeaders = () => {
  let token: string | null = null;
  try {
    token = typeof localStorage !== 'undefined' ? localStorage.getItem('session_token') : null;
  } catch {
    token = null;
  }

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const generateReportPdf = async (
  payload: ReportGeneratePayload
): Promise<ReportGenerateResponse> => {
  const response = await fetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(responseText || `Falha ao gerar relatório (${response.status})`);
  }

  return response.json();
};
