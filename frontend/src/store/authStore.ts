import { create } from 'zustand';
import { storage } from '../utils/storage';
import { User } from '../types';
import { useDataStore } from './dataStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://shift-olama-backend.onrender.com';

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
        // Token genuinely invalid — clear it
        await storage.removeItem('session_token');
        useDataStore.getState().clearSyncedCollections();
        set({ user: null, isAuthenticated: false, isLoading: false, sessionToken: null });
        return false;
      }

      if (!response.ok) {
        // Server error (503, 502, etc.) — backend cold start or temporary outage.
        // Keep the token and treat as authenticated so the user isn't logged out.
        console.warn(`[checkAuth] Server error ${response.status} — keeping session`);
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
      // Network error (offline, timeout) — keep the token, don't log out.
      console.warn('[checkAuth] Network error — keeping session:', error);
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();

      // Store session token
      await storage.setItem('session_token', data.session_token);
      useDataStore.getState().clearSyncedCollections();
      try {
        await useDataStore.getState().loadData();
      } catch (e) {
        console.warn('[auth] loadData after login:', e);
      }
      try {
        await useDataStore.getState().fetchShiftTypes();
      } catch (e) {
        console.warn('[auth] fetchShiftTypes after login:', e);
      }

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();

      // Store session token
      await storage.setItem('session_token', data.session_token);
      useDataStore.getState().clearSyncedCollections();
      try {
        await useDataStore.getState().loadData();
      } catch (e) {
        console.warn('[auth] loadData after register:', e);
      }
      try {
        await useDataStore.getState().fetchShiftTypes();
      } catch (e) {
        console.warn('[auth] fetchShiftTypes after register:', e);
      }

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

      if (!response.ok) {
        set({ isLoading: false });
        return false;
      }

      const data = await response.json();
      
      // Store session token
      await storage.setItem('session_token', data.session_token);
      useDataStore.getState().clearSyncedCollections();
      try {
        await useDataStore.getState().loadData();
      } catch (e) {
        console.warn('[auth] loadData after session exchange:', e);
      }
      try {
        await useDataStore.getState().fetchShiftTypes();
      } catch (e) {
        console.warn('[auth] fetchShiftTypes after session exchange:', e);
      }

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
