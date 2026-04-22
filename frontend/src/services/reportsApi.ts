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
    let parsedMessage = '';

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText) as {
          detail?: string;
          message?: string;
          error?: string;
        };
        parsedMessage = parsed.detail || parsed.message || parsed.error || responseText;
      } catch {
        parsedMessage = responseText;
      }
    }

    throw new Error(parsedMessage || `Falha ao gerar relatório (${response.status})`);
  }

  return response.json();
};
