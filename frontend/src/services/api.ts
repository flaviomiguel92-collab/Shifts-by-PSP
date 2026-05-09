import { storage } from '../utils/storage';

const API_ROOT = process.env.EXPO_PUBLIC_API_URL || 'https://shift-olama-backend.onrender.com';
const API_BASE_URL = API_ROOT + '/api';

const getHeaders = async () => {
  const token = await storage.getItem('session_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// On 401, clear the invalid token. User should log in again.
const handleUnauthorized = async (): Promise<void> => {
  console.warn('[api] 401 Unauthorized - clearing token');
  await storage.removeItem('session_token');
};

// Wrapper around fetch that clears invalid tokens on 401.
const apiFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const headers = { ...(init.headers || {}), ...(await getHeaders()) };
  const response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    await handleUnauthorized();
  }

  return response;
};

export const createOccurrence = async (data) => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create occurrence: ${response.statusText}`);
  }

  return response.json();
};

export const getOccurrences = async (status, classification) => {
  let url = `${API_BASE_URL}/occurrences`;
  const params = new URLSearchParams();

  if (status) params.append('status', status);
  if (classification) params.append('classification', classification);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Failed to fetch occurrences: ${response.statusText}`);
  }

  return response.json();
};

export const updateOccurrence = async (id, data) => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update occurrence: ${response.statusText}`);
  }

  return response.json();
};

export const deleteOccurrence = async (id) => {
  const response = await apiFetch(`${API_BASE_URL}/occurrences/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete occurrence: ${response.statusText}`);
  }

  return response.json();
};

export const getShifts = async (month) => {
  let url = `${API_BASE_URL}/shifts`;
  if (month) {
    url += `?month=${month}`;
  }

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Failed to fetch shifts: ${response.statusText}`);
  }

  return response.json();
};

export const createShift = async (data) => {
  const response = await apiFetch(`${API_BASE_URL}/shifts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create shift: ${response.statusText}`);
  }

  return response.json();
};

export const updateShift = async (id, data) => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update shift: ${response.statusText}`);
  }

  return response.json();
};

export const deleteShift = async (id) => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete shift: ${response.statusText}`);
  }

  return response.json();
};

export const resetShifts = async () => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/reset`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to reset shifts: ${response.statusText}`);
  }

  return response.json();
};

export type BulkShiftItem = {
  date: string;
  shift_type: string;
  start_time?: string | null;
  end_time?: string | null;
};

export const bulkUpsertShifts = async (
  shifts: BulkShiftItem[]
): Promise<{ created?: number; updated?: number; total?: number; message?: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/shifts/bulk`, {
    method: 'POST',
    body: JSON.stringify({ shifts }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to bulk upsert shifts: ${response.statusText}`);
  }

  return response.json();
};

export const getGratifications = async (month, year) => {
  let url = `${API_BASE_URL}/gratifications`;
  const params = new URLSearchParams();

  if (month) params.append('month', month);
  if (year) params.append('year', year);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Failed to fetch gratifications: ${response.statusText}`);
  }

  return response.json();
};

export const createGratification = async (data) => {
  const response = await apiFetch(`${API_BASE_URL}/gratifications`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create gratification: ${response.statusText}`);
  }

  return response.json();
};

export const deleteGratification = async (id) => {
  const response = await apiFetch(`${API_BASE_URL}/gratifications/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete gratification: ${response.statusText}`);
  }

  return response.json();
};

export const getMonthlyStats = async (month) => {
  const response = await apiFetch(`${API_BASE_URL}/stats/monthly/${month}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch monthly stats: ${response.statusText}`);
  }

  return response.json();
};

export const getYearlyStats = async (year) => {
  const response = await apiFetch(`${API_BASE_URL}/stats/yearly/${year}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch yearly stats: ${response.statusText}`);
  }

  return response.json();
};

export const getDashboardStats = async () => {
  const response = await apiFetch(`${API_BASE_URL}/stats/dashboard`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
  }

  return response.json();
};

export const getComparisonStats = async () => {
  const response = await apiFetch(`${API_BASE_URL}/stats/comparison`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comparison stats: ${response.statusText}`);
  }

  return response.json();
};
