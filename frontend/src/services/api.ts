const API_BASE_URL = 'https://shifts-by-psp-1.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('session_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const createOccurrence = async (data) => {
  const response = await fetch(`${API_BASE_URL}/occurrences`, {
    method: 'POST',
    headers: getHeaders(),
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

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch occurrences: ${response.statusText}`);
  }

  return response.json();
};

export const updateOccurrence = async (id, data) => {
  const response = await fetch(`${API_BASE_URL}/occurrences/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update occurrence: ${response.statusText}`);
  }

  return response.json();
};

export const deleteOccurrence = async (id) => {
  const response = await fetch(`${API_BASE_URL}/occurrences/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
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

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shifts: ${response.statusText}`);
  }

  return response.json();
};

export const createShift = async (data) => {
  const response = await fetch(`${API_BASE_URL}/shifts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create shift: ${response.statusText}`);
  }

  return response.json();
};

export const updateShift = async (id, data) => {
  const response = await fetch(`${API_BASE_URL}/shifts/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update shift: ${response.statusText}`);
  }

  return response.json();
};

export const deleteShift = async (id) => {
  const response = await fetch(`${API_BASE_URL}/shifts/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
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

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gratifications: ${response.statusText}`);
  }

  return response.json();
};

export const createGratification = async (data) => {
  const response = await fetch(`${API_BASE_URL}/gratifications`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create gratification: ${response.statusText}`);
  }

  return response.json();
};

export const getMonthlyStats = async (month) => {
  const response = await fetch(`${API_BASE_URL}/stats/monthly/${month}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch monthly stats: ${response.statusText}`);
  }

  return response.json();
};

export const getYearlyStats = async (year) => {
  const response = await fetch(`${API_BASE_URL}/stats/yearly/${year}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch yearly stats: ${response.statusText}`);
  }

  return response.json();
};

export const getDashboardStats = async () => {
  const response = await fetch(`${API_BASE_URL}/stats/dashboard`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
  }

  return response.json();
};

export const getComparisonStats = async () => {
  const response = await fetch(`${API_BASE_URL}/stats/comparison`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comparison stats: ${response.statusText}`);
  }

  return response.json();
};
