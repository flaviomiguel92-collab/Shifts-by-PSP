import { create } from 'zustand';
import { storage } from '../utils/storage';
import { User } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionToken: (token: string | null) => void;
  checkAuth: () => Promise<boolean>;
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
      
      // Get stored session token
      const storedToken = await storage.getItem('session_token');
      
      if (!storedToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        await storage.removeItem('session_token');
        set({ user: null, isAuthenticated: false, isLoading: false, sessionToken: null });
        return false;
      }

      const userData = await response.json();
      set({ 
        user: userData, 
        isAuthenticated: true, 
        isLoading: false,
        sessionToken: storedToken 
      });
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
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
      
      if (storedToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await storage.removeItem('session_token');
      set({ user: null, isAuthenticated: false, sessionToken: null });
    }
  },
}));
