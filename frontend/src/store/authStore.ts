import { create } from 'zustand';
import { storage } from '../utils/storage';
import { User } from '../types';
import { useDataStore } from './dataStore';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.error('[auth] ERRO: EXPO_PUBLIC_API_URL não definida. Configure no .env');
}
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

function assertJsonResponse(response: Response): void {
  if (!API_URL) {
    throw new Error('Configuração inválida: EXPO_PUBLIC_API_URL não definida.');
  }
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`Resposta inesperada do servidor (${response.status}). Verifique a variável EXPO_PUBLIC_API_URL no Vercel.`);
  }
}

function extractDetail(error: { detail?: unknown }): string {
  const d = error?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e: { msg?: string }) => e?.msg).filter(Boolean).join(', ');
  return '';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionToken: (token: string | null) => void;
  checkAuth: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  exchangeSession: (sessionId: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

/** Valida a password no frontend antes de enviar ao servidor */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'A password deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'A password deve conter pelo menos uma letra maiúscula';
  if (!/\d/.test(password)) return 'A password deve conter pelo menos um número';
  return null;
}

async function initializeData(): Promise<void> {
  useDataStore.getState().clearSyncedCollections();
  try {
    await useDataStore.getState().loadData();
  } catch (e) {
    console.warn('[auth] loadData error:', e);
  }
  try {
    await useDataStore.getState().fetchShiftTypes();
  } catch (e) {
    console.warn('[auth] fetchShiftTypes error:', e);
  }
  try {
    await useDataStore.getState().fetchCycles();
  } catch (e) {
    console.warn('[auth] fetchCycles error:', e);
  }
  try {
    await useDataStore.getState().fetchGratifiedEntries();
  } catch (e) {
    console.warn('[auth] fetchGratifiedEntries error:', e);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  sessionToken: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  setSessionToken: (sessionToken) => set({ sessionToken }),

  checkAuth: async () => {
    try {
      set({ isLoading: true });

      const storedToken = await storage.getItem('session_token');

      if (!storedToken) {
        useDataStore.getState().clearSyncedCollections();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        // Token genuinamente inválido — limpar
        await storage.removeItem('session_token');
        useDataStore.getState().clearSyncedCollections();
        set({ user: null, isAuthenticated: false, isLoading: false, sessionToken: null });
        return false;
      }

      if (!response.ok) {
        // Erro do servidor (503, 502, etc.) — cold start ou indisponibilidade temporária
        console.warn(`[checkAuth] Server error ${response.status} — a manter sessão`);
        set({ isAuthenticated: true, isLoading: false, sessionToken: storedToken });
        return true;
      }

      const userData = await response.json();
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        sessionToken: storedToken,
      });
      return true;
    } catch (error) {
      // Erro de rede (offline, timeout) — manter token, não deslogar
      console.warn('[checkAuth] Network error — a manter sessão:', error);
      const storedToken = await storage.getItem('session_token');
      if (storedToken) {
        set({ isAuthenticated: true, isLoading: false, sessionToken: storedToken });
        return true;
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      assertJsonResponse(response);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(extractDetail(error) || 'Falha no login');
      }

      const data = await response.json();

      // Store session token
      await storage.setItem('session_token', data.session_token);
      await initializeData();

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        sessionToken: data.session_token
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    // Validar password no frontend antes de enviar
    const pwError = validatePassword(password);
    if (pwError) {
      set({ isLoading: false });
      throw new Error(pwError);
    }

    try {
      set({ isLoading: true });

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });

      assertJsonResponse(response);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(extractDetail(error) || 'Falha no registo');
      }

      const data = await response.json();

      // Store session token
      await storage.setItem('session_token', data.session_token);
      await initializeData();

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        sessionToken: data.session_token
      });

      return true;
    } catch (error) {
      console.error('Register error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  exchangeSession: async (sessionId: string) => {
    try {
      set({ isLoading: true });

      const response = await fetch(`${API_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
        credentials: 'include',
      });

      assertJsonResponse(response);

      if (!response.ok) {
        set({ isLoading: false });
        return false;
      }

      const data = await response.json();

      // Store session token
      await storage.setItem('session_token', data.session_token);
      await initializeData();

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        sessionToken: data.session_token
      });

      return true;
    } catch (error) {
      console.error('Session exchange error:', error);
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      const storedToken = await storage.getItem('session_token');

      // Fire backend logout without awaiting — don't block on cold start / slow network.
      if (storedToken) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${storedToken}` },
          credentials: 'include',
          signal: controller.signal,
        })
          .catch(() => {})
          .finally(() => clearTimeout(t));
      }

      // Clear local state immediately — never wait for the server.
      await storage.removeItem('session_token');
      await storage.removeItem('device_id');
      useDataStore.getState().clearSyncedCollections();
      set({ user: null, isAuthenticated: false, sessionToken: null });
    } catch (error) {
      console.error('[auth] Logout error:', error);
      try {
        await storage.removeItem('session_token');
        await storage.removeItem('device_id');
        useDataStore.getState().clearSyncedCollections();
        set({ user: null, isAuthenticated: false, sessionToken: null });
      } catch (e) {
        console.error('[auth] Failed to clear storage:', e);
      }
      throw error;
    }
  },
}));