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
  if (!response.ok) throw new Error(`Failed to create occurrence: ${response.statusText}`);
  return response.json();
};

export const getOccurrences = async (status?: string, classification?: string) => {
  let url = `${API_BASE_URL}/occurrences`;
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (classification) params.append('classification', classification);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`Failed to fetch occurrences: ${response.statusText}`);
  return response.json();
};

export const updateOccurrence = async (id: string, data: Partial<Occurrence>): Promise<Occurrence> => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Failed to update occurrence: ${response.statusText}`);
  return response.json();
};

export const deleteOccurrence = async (id: string) => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete occurrence: ${response.statusText}`);
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

// ==================== REPORTS ====================

export const generateReport = async (data: Record<string, unknown>, template_id = 'default'): Promise<{ file_name: string; mime_type: string; pdf_base64: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    body: JSON.stringify({ template_id, data }),
  });
  if (!response.ok) throw new Error(`Failed to generate report: ${response.statusText}`);
  return response.json();
};