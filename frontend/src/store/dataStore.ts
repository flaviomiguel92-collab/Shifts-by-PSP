import { create } from 'zustand';
import * as api from '../services/api';
import { storage } from '../utils/storage';

const STORAGE_KEY = 'app_data';
const DEFAULT_GRATIFIED_CONFIG = {
  baseSmall4h: 52.73,
  baseLarge4h: 75.89,
  fractionSmallPerHour: 13.4,
  fractionLargePerHour: 19.74,
  discountPercent: 10,
  smallStart: '06:01',
  smallEnd: '17:59',
  largeStart: '18:00',
  largeEnd: '06:00',
};

export const useDataStore = create((set, get) => ({
  shifts: [],
  shiftTypes: [],
  gratifications: [],
  cycles: [],
  occurrences: [],
  gratifiedConfig: DEFAULT_GRATIFIED_CONFIG,
  gratifiedTemplates: [],
  gratifiedEntries: [],
  currentMonth: new Date().toISOString().slice(0, 7),
  currentYear: new Date().getFullYear().toString(),

  setCurrentMonth: (month) => set({ currentMonth: month }),
  setCurrentYear: (year) => set({ currentYear: year }),

  // ==================== OCCURRENCES ====================

  createOccurrence: async (data) => {
    try {
      const result = await api.createOccurrence(data);
      set((state) => ({
        occurrences: [result, ...state.occurrences],
      }));
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error creating occurrence:', error);
      throw error;
    }
  },

  fetchOccurrences: async (status, classification) => {
    try {
      const result = await api.getOccurrences(status, classification);
      set({ occurrences: result });
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error fetching occurrences:', error);
      throw error;
    }
  },

  updateOccurrence: async (id, data) => {
    try {
      const result = await api.updateOccurrence(id, data);
      set((state) => ({
        occurrences: state.occurrences.map((o) =>
          o.id === id ? result : o
        ),
      }));
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error updating occurrence:', error);
      throw error;
    }
  },

  deleteOccurrence: async (id) => {
    try {
      await api.deleteOccurrence(id);
      set((state) => ({
        occurrences: state.occurrences.filter((o) => o.id !== id),
      }));
      get().saveData();
    } catch (error) {
      console.error('Error deleting occurrence:', error);
      throw error;
    }
  },

  // ==================== SHIFTS ====================

  fetchShifts: async (month) => {
    try {
      const result = await api.getShifts(month);
      set({ shifts: result });
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error fetching shifts:', error);
      return get().shifts;
    }
  },

  createShift: async (shift) => {
    try {
      const result = await api.createShift(shift);
      set((state) => {
        const existingIndex = state.shifts.findIndex((s) => s.date === shift.date);
        if (existingIndex >= 0) {
          const updated = [...state.shifts];
          updated[existingIndex] = result;
          return { shifts: updated };
        }
        return { shifts: [...state.shifts, result] };
      });
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error creating shift:', error);
      const newShift = {
        ...shift,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };
      set((state) => {
        const existingIndex = state.shifts.findIndex((s) => s.date === shift.date);
        if (existingIndex >= 0) {
          const updated = [...state.shifts];
          updated[existingIndex] = { ...updated[existingIndex], ...shift };
          return { shifts: updated };
        }
        return { shifts: [...state.shifts, newShift] };
      });
      get().saveData();
      throw error;
    }
  },

  updateShift: async (id, data) => {
    try {
      const result = await api.updateShift(id, data);
      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === id ? result : s
        ),
      }));
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error updating shift:', error);
      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
      }));
      get().saveData();
      throw error;
    }
  },

  deleteShift: async (id) => {
    try {
      await api.deleteShift(id);
      set((state) => ({
        shifts: state.shifts.filter((s) => s.id !== id),
      }));
      get().saveData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      set((state) => ({
        shifts: state.shifts.filter((s) => s.id !== id),
      }));
      get().saveData();
      throw error;
    }
  },

  // ==================== GRATIFICATIONS ====================

  fetchGratifications: async (month, year) => {
    try {
      const result = await api.getGratifications(month, year);
      set({ gratifications: result });
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error fetching gratifications:', error);
      return get().gratifications;
    }
  },

  createGratification: async (data) => {
    try {
      const result = await api.createGratification(data);
      set((state) => ({
        gratifications: [result, ...state.gratifications],
      }));
      get().saveData();
      return result;
    } catch (error) {
      console.error('Error creating gratification:', error);
      const newItem = { ...data, id: Date.now().toString() };
      set((state) => ({
        gratifications: [newItem, ...state.gratifications],
      }));
      get().saveData();
      throw error;
    }
  },

  // ==================== STATISTICS ====================

  fetchMonthlyStats: async (month) => {
    try {
      return await api.getMonthlyStats(month);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      throw error;
    }
  },

  fetchYearlyStats: async (year) => {
    try {
      return await api.getYearlyStats(year);
    } catch (error) {
      console.error('Error fetching yearly stats:', error);
      throw error;
    }
  },

  fetchDashboardStats: async () => {
    try {
      return await api.getDashboardStats();
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  fetchComparisonStats: async () => {
    try {
      return await api.getComparisonStats();
    } catch (error) {
      console.error('Error fetching comparison stats:', error);
      throw error;
    }
  },

  // ==================== LOCAL STORAGE ====================

  loadData: async () => {
    const data = await storage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      set({
        ...parsed,
        cycles: parsed?.cycles ?? [],
        shifts: parsed?.shifts ?? [],
        shiftTypes: parsed?.shiftTypes ?? [],
        gratifications: parsed?.gratifications ?? [],
        occurrences: parsed?.occurrences ?? [],
        gratifiedConfig: parsed?.gratifiedConfig ?? get().gratifiedConfig,
        gratifiedTemplates: parsed?.gratifiedTemplates ?? [],
        gratifiedEntries: parsed?.gratifiedEntries ?? [],
      });
    }
  },

  saveData: async () => {
    const state = get();
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        shifts: state.shifts,
        shiftTypes: state.shiftTypes,
        gratifications: state.gratifications,
        cycles: state.cycles,
        occurrences: state.occurrences,
        gratifiedConfig: state.gratifiedConfig,
        gratifiedTemplates: state.gratifiedTemplates,
        gratifiedEntries: state.gratifiedEntries,
      })
    );
  },

  resetData: async () => {
    await storage.removeItem(STORAGE_KEY);
    set({
      shifts: [],
      shiftTypes: [],
      gratifications: [],
      cycles: [],
      occurrences: [],
      gratifiedConfig: { ...DEFAULT_GRATIFIED_CONFIG },
      gratifiedTemplates: [],
      gratifiedEntries: [],
    });
  },

  resetCalendarData: async () => {
    set({
      shifts: [],
      shiftTypes: [],
      cycles: [],
    });
    await get().saveData();
  },

  resetGratifiedData: async () => {
    set({
      gratifications: [],
      gratifiedTemplates: [],
      gratifiedEntries: [],
      gratifiedConfig: { ...DEFAULT_GRATIFIED_CONFIG },
    });
    await get().saveData();
  },

  resetOccurrencesData: async () => {
    set({ occurrences: [] });
    await get().saveData();
  },

  // ==================== SHIFT TYPES ====================

  createShiftType: async (shiftType) => {
    const newShiftType = {
      ...shiftType,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    set((state) => ({
      shiftTypes: [...state.shiftTypes, newShiftType],
    }));
    get().saveData();
  },

  deleteShiftType: async (id) => {
    set((state) => ({
      shiftTypes: state.shiftTypes.filter((s) => s.id !== id),
    }));
    get().saveData();
  },

  // ==================== CYCLES ====================

  createCycle: async (cycle) => {
    const newCycle = {
      ...cycle,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pattern: Array.isArray(cycle?.pattern) ? cycle.pattern : [],
    };
    set((state) => ({
      cycles: [newCycle, ...(state.cycles || [])],
    }));
    get().saveData();
  },

  deleteCycle: async (id) => {
    set((state) => ({
      cycles: (state.cycles || []).filter((c) => c.id !== id),
    }));
    get().saveData();
  },

  // ==================== GRATIFIED CONFIG ====================

  setGratifiedConfig: async (partial) => {
    set((state) => ({
      gratifiedConfig: { ...state.gratifiedConfig, ...(partial || {}) },
    }));
    get().saveData();
  },

  upsertGratifiedTemplate: async (template) => {
    const name = (template?.name || '').trim();
    if (!name) return;
    set((state) => {
      const existingIndex = (state.gratifiedTemplates || []).findIndex((t) => t.name === name);
      const next = [...(state.gratifiedTemplates || [])];
      const item = { ...template, name };
      if (existingIndex >= 0) {
        next[existingIndex] = { ...next[existingIndex], ...item };
        return { gratifiedTemplates: next };
      }
      return { gratifiedTemplates: [item, ...next] };
    });
    get().saveData();
  },

  deleteGratifiedTemplate: async (name) => {
    set((state) => ({
      gratifiedTemplates: (state.gratifiedTemplates || []).filter((t) => t.name !== name),
    }));
    get().saveData();
  },

  createGratifiedEntry: async (entry) => {
    const newItem = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    set((state) => ({
      gratifiedEntries: [newItem, ...(state.gratifiedEntries || [])],
    }));
    get().saveData();
  },

  deleteGratifiedEntry: async (id) => {
    set((state) => ({
      gratifiedEntries: (state.gratifiedEntries || []).filter((e) => e.id !== id),
    }));
    get().saveData();
  },

  updateGratification: async (id, data) => {
    set((state) => ({
      gratifications: state.gratifications.map((g) =>
        g.id === id ? { ...g, ...data } : g
      ),
    }));
    get().saveData();
  },

  deleteGratification: async (id) => {
    set((state) => ({
      gratifications: state.gratifications.filter((g) => g.id !== id),
    }));
    get().saveData();
  },
}));
