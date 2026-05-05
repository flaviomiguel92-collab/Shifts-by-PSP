import { ReportGeneratePayload, ReportGenerateResponse } from '../reports/reportTypes';
import { storage } from '../utils/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://shift-olama-backend.onrender.com';

const getHeaders = async () => {
  const token = await storage.getItem('session_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const generateReportPdf = async (
  payload: ReportGeneratePayload
): Promise<ReportGenerateResponse> => {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
    method: 'POST',
    headers,
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
