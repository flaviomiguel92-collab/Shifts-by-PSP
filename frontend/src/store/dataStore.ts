import { create } from 'zustand';
import * as api from '../services/api';
import { storage } from '../utils/storage';
import { ShiftTypeConfig } from '../types';

const STORAGE_KEY = 'app_data';

/** Keys persisted locally only (never trust disk for server-backed entities — avoids “ghost” rows). */
const persistLocalSlice = (state: Record<string, unknown>) => ({
  shiftTypes: state.shiftTypes,
  cycles: state.cycles,  shifts: state.shifts,
  gratifications: state.gratifications,  gratifiedConfig: state.gratifiedConfig,
  gratifiedTemplates: state.gratifiedTemplates,
  gratifiedEntries: state.gratifiedEntries,
});
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

export const useDataStore = create<any>((set, get) => ({
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

  /** Clears lists synced with the API — call on logout / session invalid / login to avoid cross-user or stale UI. */
  clearSyncedCollections: () =>
    set({
      shifts: [],
      gratifications: [],
      occurrences: [],
    }),

  // ==================== OCCURRENCES ====================

  createOccurrence: async (data) => {
    try {
      const result = await api.createOccurrence(data);
      set((state) => ({
        occurrences: [result, ...state.occurrences],
      }));
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
      return result;
    } catch (error) {
      console.error('Error creating shift:', error);
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
      return result;
    } catch (error) {
      console.error('Error updating shift:', error);
      throw error;
    }
  },

  deleteShift: async (id) => {
    await api.deleteShift(id);
    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== id),
    }));
  },

  bulkUpsertShifts: async (items: api.BulkShiftItem[]) => {
    return api.bulkUpsertShifts(items);
  },

  // ==================== GRATIFICATIONS ====================

  fetchGratifications: async (month, year) => {
    try {
      const result = await api.getGratifications(month, year);
      set({ gratifications: result });
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
      return result;
    } catch (error) {
      console.error('Error creating gratification:', error);
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
    if (!data) return;
    const parsed = JSON.parse(data);
    set({
      shiftTypes: parsed?.shiftTypes ?? [],
      cycles: parsed?.cycles ?? [],
      shifts: parsed?.shifts ?? [],
      gratifications: parsed?.gratifications ?? [],
      gratifiedConfig: parsed?.gratifiedConfig ?? get().gratifiedConfig,
      gratifiedTemplates: parsed?.gratifiedTemplates ?? [],
      gratifiedEntries: parsed?.gratifiedEntries ?? [],
    });
    await get().saveData();
  },

  saveData: async () => {
    const state = get();
    await storage.setItem(STORAGE_KEY, JSON.stringify(persistLocalSlice(state)));
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
    try {
      await api.resetShifts();
    } catch (error) {
      console.error('Error resetting shifts on backend:', error);
      throw error;
    }
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

  fetchShiftTypes: async () => {
    try {
      const serverResult: ShiftTypeConfig[] = await api.getShiftTypes();
      const local: ShiftTypeConfig[] = get().shiftTypes;

      if (serverResult.length === 0 && local.length > 0) {
        // Server has nothing but we have local data — push local entries to server.
        // This covers: shift types created while backend was in cold start (local-... IDs)
        // and the first login after migrating from a local-only version.
        const synced: ShiftTypeConfig[] = [];
        for (const st of local) {
          try {
            const created = await api.createShiftTypeApi({
              name: st.name,
              color: st.color,
              start_time: st.start_time || st.startTime,
              end_time: st.end_time || st.endTime,
              is_working: st.is_working,
              order: st.order,
            });
            synced.push(created);
          } catch {
            synced.push(st); // keep local entry if push fails
          }
        }
        const finalList = synced.length > 0 ? synced : local;
        set({ shiftTypes: finalList });
        get().saveData();
        return finalList;
      }

      // Server has data (or both are empty) — server is authoritative.
      set({ shiftTypes: serverResult });
      get().saveData();
      return serverResult;
    } catch (error) {
      console.warn('[dataStore] fetchShiftTypes failed (keeping local cache):', error);
      return get().shiftTypes;
    }
  },

  createShiftType: async (shiftType) => {
    try {
      const created: ShiftTypeConfig = await api.createShiftTypeApi({
        name: shiftType.name,
        color: shiftType.color,
        start_time: shiftType.start_time || shiftType.startTime,
        end_time: shiftType.end_time || shiftType.endTime,
        is_working: shiftType.is_working,
        order: shiftType.order,
      });
      set((state) => ({
        shiftTypes: [...state.shiftTypes, created],
      }));
      get().saveData();
    } catch (error) {
      // Fallback: keep local if API fails
      console.warn('[dataStore] createShiftType API failed, using local fallback:', error);
      const localFallback: ShiftTypeConfig = {
        ...shiftType,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };
      set((state) => ({
        shiftTypes: [...state.shiftTypes, localFallback],
      }));
      get().saveData();
    }
  },

  deleteShiftType: async (id: string) => {
    set((state) => ({
      shiftTypes: state.shiftTypes.filter((s) => s.id !== id),
    }));
    get().saveData();
    try {
      await api.deleteShiftTypeApi(id);
    } catch (error) {
      console.warn('[dataStore] deleteShiftType API failed (local already updated):', error);
    }
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
    await api.deleteGratification(id);
    set((state) => ({
      gratifications: state.gratifications.filter((g) => g.id !== id),
    }));
  },
}));
