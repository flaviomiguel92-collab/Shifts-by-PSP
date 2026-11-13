import { create } from 'zustand';
import { session } from '../services/session';
import { storage } from '../utils/storage';
import { User } from '../types';
import { useDataStore } from './dataStore';
import { deleteAccount as apiDeleteAccount } from '../services/api';

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
  status: 'checking' | 'authenticated' | 'anonymous' | 'unavailable';
  sessionError: string | null;
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
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/** Valida a password no frontend antes de enviar ao servidor */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'A password deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'A password deve conter pelo menos uma letra maiúscula';
  if (!/\d/.test(password)) return 'A password deve conter pelo menos um número';
  return null;
}

let authCheck: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'checking',
  sessionError: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  sessionToken: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  setSessionToken: (sessionToken) => set({ sessionToken }),

  checkAuth: () => {
    if (authCheck) return authCheck;
    const revision = session.revision;
    authCheck = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        set({ isLoading: true, sessionError: null });
        const token = await session.read();
        if (revision !== session.revision) return get().isAuthenticated;
        if (!token) {
          useDataStore.getState().clearSyncedCollections();
          set({ user: null, isAuthenticated: false, sessionToken: null, status: 'anonymous' });
          return false;
        }
        // Restore the app shell from local credentials immediately. Every data
        // request is still authenticated by the server; no private data is cached.
        if (get().sessionToken !== token) {
          useDataStore.getState().clearSyncedCollections();
          set({ user: null, sessionToken: token, isAuthenticated: true });
        }
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (revision !== session.revision) return get().isAuthenticated;
        if (response.status === 401) {
          await session.invalidate(token);
          return get().isAuthenticated;
        }
        if (!response.ok) throw new Error('Servidor temporariamente indisponível.');
        assertJsonResponse(response);
        const user = await response.json();
        if (!user?.user_id) throw new Error('Resposta de sessão inválida.');
        if (revision !== session.revision) return get().isAuthenticated;
        set({ user, sessionToken: token, isAuthenticated: true, status: 'authenticated', sessionError: null });
        return true;
      } catch {
        if (revision === session.revision) {
          // A slow/offline backend must not send a remembered session back to
          // the recovery screen. The layout retries validation automatically.
          set({ status: 'unavailable', sessionError: 'A ligação ao servidor está indisponível. A tentar novamente automaticamente…' });
        }
        return get().isAuthenticated;
      } finally {
        clearTimeout(timeout);
        set({ isLoading: false });
      }
    })().finally(() => { authCheck = null; });
    return authCheck;
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      assertJsonResponse(response);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(extractDetail(error) || 'Falha no login');
      }

      const data = await response.json();

      // Always store the session token for Bearer auth on every platform.
      // Web uses localStorage (persists across tabs/restarts); native uses AsyncStorage.
      await session.save(data.session_token);
      useDataStore.getState().clearSyncedCollections();

      set({
        status: 'authenticated',
        sessionError: null,
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
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      assertJsonResponse(response);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(extractDetail(error) || 'Falha no registo');
      }

      const data = await response.json();

      // Always store the session token for Bearer auth on every platform.
      await session.save(data.session_token);
      useDataStore.getState().clearSyncedCollections();

      set({
        status: 'authenticated',
        sessionError: null,
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
          signal: controller.signal,
        })
          .catch(() => {})
          .finally(() => clearTimeout(t));
      }

      // Clear local state immediately — never wait for the server.
      const token = get().sessionToken || await session.read();
      if (token) await session.invalidate(token);
      await storage.removeItem('device_id');
      useDataStore.getState().clearSyncedCollections();
      set({ user: null, isAuthenticated: false, sessionToken: null, status: 'anonymous', sessionError: null });
    } catch (error) {
      console.error('[auth] Logout error:', error);
      try {
        const token = get().sessionToken || await session.read();
        if (token) await session.invalidate(token);
        await storage.removeItem('device_id');
        useDataStore.getState().clearSyncedCollections();
        set({ user: null, isAuthenticated: false, sessionToken: null, status: 'anonymous', sessionError: null });
      } catch (e) {
        console.error('[auth] Failed to clear storage:', e);
      }
      throw error;
    }
  },

  deleteAccount: async () => {
    // Must succeed server-side before clearing local state, so the user
    // gets a real error if erasure failed (unlike fire-and-forget logout).
    await apiDeleteAccount();
    const token = get().sessionToken || await session.read();
    if (token) await session.invalidate(token);
    await storage.removeItem('device_id');
    useDataStore.getState().clearSyncedCollections();
    set({ user: null, isAuthenticated: false, sessionToken: null, status: 'anonymous', sessionError: null });
  },
}));

session.subscribe(() => {
  useDataStore.getState().clearSyncedCollections();
  useAuthStore.setState({ user: null, isAuthenticated: false, sessionToken: null, status: 'anonymous', sessionError: null, isLoading: false });
});
