import { storage } from '../utils/storage';
import { ShiftTypeConfig, Shift, Gratification } from '../types';
import { Occurrence } from '../types/occurrence';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.error('[api] ERRO: EXPO_PUBLIC_API_URL não definida. Configure no .env');
}
const API_ROOT = process.env.EXPO_PUBLIC_API_URL || '';
const API_BASE_URL = API_ROOT + '/api';

const getHeaders = async () => {
  const token = await storage.getItem('session_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleUnauthorized = async (): Promise<void> => {
  console.warn('[api] 401 Unauthorized - clearing token');
  await storage.removeItem('session_token');
};

const apiFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const headers = { ...(init.headers || {}), ...(await getHeaders()) };
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    await handleUnauthorized();
  }
  return response;
};

export const createOccurrence = async (data: Partial<Occurrence>): Promise<Occurrence> => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences`, { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Erro ao criar ocorrência: ${response.statusText}`);
  return response.json();
};

export const getOccurrences = async (status?: string, classification?: string) => {
  let url = `${API_BASE_URL}/occurrences`;
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (classification) params.append('classification', classification);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`Erro ao obter ocorrências: ${response.statusText}`);
  return response.json();
};

export const updateOccurrence = async (id: string, data: Partial<Occurrence>): Promise<Occurrence> => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Erro ao atualizar ocorrência: ${response.statusText}`);
  return response.json();
};

export const deleteOccurrence = async (id: string) => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Erro ao eliminar ocorrência: ${response.statusText}`);
  return response.json();
};

export const getShifts = async (month?: string) => {
  let url = `${API_BASE_URL}/shifts`;
  if (month) url += `?month=${month}`;
  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch shifts: ${response.statusText}`);
  return response.json();
};

export const createShift = async (data: Omit<Shift, 'id' | 'user_id' | 'created_at'>): Promise<Shift> => {
  const response = await apiFetch(`${API_BASE_URL}/shifts`, { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to create shift: ${response.statusText}`);
  return response.json();
};

export const updateShift = async (id: string, data: Partial<Shift>): Promise<Shift> => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to update shift: ${response.statusText}`);
  return response.json();
};

export const deleteShift = async (id: string) => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete shift: ${response.statusText}`);
  return response.json();
};

export const resetShifts = async () => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/reset`, { method: 'POST' });
  if (!response.ok) throw new Error(`Failed to reset shifts: ${response.statusText}`);
  return response.json();
};

export const resetCycles = async () => {
  const response = await apiFetch(`${API_BASE_URL}/cycles/reset`, { method: 'POST' });
  if (!response.ok) throw new Error(`Failed to reset cycles: ${response.statusText}`);
  return response.json();
};

export const resetGratifiedEntries = async () => {
  const response = await apiFetch(`${API_BASE_URL}/gratified-entries/reset`, { method: 'POST' });
  if (!response.ok) throw new Error(`Failed to reset gratified entries: ${response.statusText}`);
  return response.json();
};

export const resetOccurrences = async () => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/reset`, { method: 'POST' });
  if (!response.ok) throw new Error(`Failed to reset occurrences: ${response.statusText}`);
  return response.json();
};

export type BulkShiftItem = { date: string; shift_type: string; start_time?: string | null; end_time?: string | null };

export const bulkUpsertShifts = async (shifts: BulkShiftItem[]): Promise<{ created?: number; updated?: number; total?: number; message?: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/bulk`, { method: 'POST', body: JSON.stringify({ shifts }) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to bulk upsert shifts: ${response.statusText}`);
  }
  return response.json();
};

export const getGratifications = async (month?: string, year?: string) => {
  let url = `${API_BASE_URL}/gratifications`;
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (year) params.append('year', year);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch gratifications: ${response.statusText}`);
  return response.json();
};

export const createGratification = async (data: Omit<Gratification, 'id' | 'user_id' | 'created_at'>): Promise<Gratification> => {
  const response = await apiFetch(`${API_BASE_URL}/gratifications`, { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to create gratification: ${response.statusText}`);
  return response.json();
};

export const updateGratification = async (id: string, data: Partial<Gratification>): Promise<Gratification> => {
  const response = await apiFetch(`${API_BASE_URL}/gratifications/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to update gratification: ${response.statusText}`);
  return response.json();
};

export const deleteGratification = async (id: string) => {
  const response = await apiFetch(`${API_BASE_URL}/gratifications/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete gratification: ${response.statusText}`);
  return response.json();
};

export const getMonthlyStats = async (month: string) => {
  const response = await apiFetch(`${API_BASE_URL}/stats/monthly/${month}`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch monthly stats: ${response.statusText}`);
  return response.json();
};

export const getYearlyStats = async (year: string) => {
  const response = await apiFetch(`${API_BASE_URL}/stats/yearly/${year}`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch yearly stats: ${response.statusText}`);
  return response.json();
};

export const getDashboardStats = async () => {
  const response = await apiFetch(`${API_BASE_URL}/stats/dashboard`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
  return response.json();
};

export const getComparisonStats = async () => {
  const response = await apiFetch(`${API_BASE_URL}/stats/comparison`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch comparison stats: ${response.statusText}`);
  return response.json();
};

// ==================== SHIFT TYPES ====================

export const getShiftTypes = async (): Promise<ShiftTypeConfig[]> => {
  const response = await apiFetch(`${API_BASE_URL}/shift-types`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch shift types: ${response.statusText}`);
  return response.json();
};

export const createShiftTypeApi = async (data: { name: string; color: string; start_time?: string; end_time?: string; is_working?: boolean; order?: number }): Promise<ShiftTypeConfig> => {
  const response = await apiFetch(`${API_BASE_URL}/shift-types`, { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to create shift type: ${response.statusText}`);
  return response.json();
};

export const deleteShiftTypeApi = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/shift-types/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) throw new Error(`Failed to delete shift type: ${response.statusText}`);
};

export const updateShiftTypeApi = async (
  id: string,
  data: { name?: string; color?: string; start_time?: string | null; end_time?: string | null; is_working?: boolean; order?: number }
): Promise<ShiftTypeConfig> => {
  const response = await apiFetch(`${API_BASE_URL}/shift-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update shift type: ${response.statusText}`);
  return response.json();
};

// ==================== AUTH SESSIONS ====================

export interface SessionInfo {
  session_id: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export const getSessions = async (): Promise<SessionInfo[]> => {
  const response = await apiFetch(`${API_BASE_URL}/auth/sessions`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  return response.json();
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to revoke session: ${response.statusText}`);
};

export const deleteAccount = async (): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/auth/account`, { method: 'DELETE' });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch { /* ignore parse error */ }
    throw new Error(`[${response.status}] ${detail}`);
  }
};

// ==================== CYCLES ====================

export interface CycleApi {
  id: string;
  name: string;
  pattern: string[];
  created_at?: string;
}

export const getCycles = async (): Promise<CycleApi[]> => {
  const response = await apiFetch(`${API_BASE_URL}/cycles`, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch cycles: ${response.statusText}`);
  return response.json();
};

export const createCycleApi = async (data: { name: string; pattern: string[] }): Promise<CycleApi> => {
  const response = await apiFetch(`${API_BASE_URL}/cycles`, { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to create cycle: ${response.statusText}`);
  return response.json();
};

export const updateCycleApi = async (id: string, data: { name?: string; pattern?: string[] }): Promise<CycleApi> => {
  const response = await apiFetch(`${API_BASE_URL}/cycles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to update cycle: ${response.statusText}`);
  return response.json();
};

export const deleteCycleApi = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/cycles/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) throw new Error(`Failed to delete cycle: ${response.statusText}`);
};

// ==================== GRATIFIED CALENDAR ENTRIES ====================

export interface GratifiedEntryApi {
  id: string;
  date: string;
  name: string;
  start_time?: string;
  end_time?: string;
  value?: number;
  subtotal?: number;
  discount_percent?: number;
  is_holiday_or_weekend?: boolean;
  note?: string;
  created_at?: string;
}

export const getGratifiedEntries = async (month?: string): Promise<GratifiedEntryApi[]> => {
  const url = month
    ? `${API_BASE_URL}/gratified-entries?month=${encodeURIComponent(month)}`
    : `${API_BASE_URL}/gratified-entries`;
  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch gratified entries: ${response.statusText}`);
  return response.json();
};

export const createGratifiedEntryApi = async (data: Omit<GratifiedEntryApi, 'id'>): Promise<GratifiedEntryApi> => {
  const response = await apiFetch(`${API_BASE_URL}/gratified-entries`, { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch { /* ignore parse error */ }
    throw new Error(`[${response.status}] ${detail}`);
  }
  return response.json();
};

export const deleteGratifiedEntryApi = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/gratified-entries/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) throw new Error(`Failed to delete gratified entry: ${response.statusText}`);
};

// ==================== REPORTS ====================

export interface ReportPersonItem { nome: string; matricula?: string }
export interface ReportExpedienteItem {
  tipificacao: string;
  npp?: string;
  nome?: string;
  matricula?: string;
  hora?: string;
  nuipc?: string;
  local?: string;
}

export interface GenerateReportRequest {
  report_date: string;
  report_hour: string;
  graduado_nome: string;
  graduado_matricula: string;
  graduado_radio?: string;
  efetivo_oficiais?: number;
  efetivo_chefes?: number;
  efetivo_agentes?: number;
  servico_remunerado?: string;
  justificacao?: string;
  observacao?: string;
  expediente_efetuado?: ReportExpedienteItem[];
  contactados?: ReportPersonItem[];
  demais_efetivo?: ReportPersonItem[];
  format?: 'docx' | 'pdf';
}

export const generateReport = async (data: GenerateReportRequest): Promise<Blob> => {
  const response = await apiFetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    body: JSON.stringify({ ...data, format: data.format ?? 'docx' }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Erro ao gerar relatório: ${response.statusText}`);
  }
  return response.blob();
};
