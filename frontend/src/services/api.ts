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

// Request a fresh demo session token. Called on startup and on 401 retry.
const refreshSessionToken = async (): Promise<string | null> => {
  try {
    console.log('[api] Refreshing demo session token...');
    const res = await fetch(`${API_ROOT}/api/auth/demo`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.warn('[api] /api/auth/demo failed with', res.status);
      return null;
    }
    const data = await res.json();
    const token = data?.session_token ?? null;
    if (token) {
      await storage.setItem('session_token', token);
      console.log('[api] session_token refreshed');
    }
    return token;
  } catch (err) {
    console.error('[api] refreshSessionToken error:', err);
    return null;
  }
};

// Wrapper around fetch that auto-retries once with a fresh session token on 401.
const apiFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const headers = { ...(init.headers || {}), ...(await getHeaders()) };
  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    console.warn('[api] 401 from', url, '- attempting token refresh and retry');
    const token = await refreshSessionToken();
    if (token) {
      const retryHeaders = { ...(init.headers || {}), ...(await getHeaders()) };
      response = await fetch(url, { ...init, headers: retryHeaders });
    }
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
