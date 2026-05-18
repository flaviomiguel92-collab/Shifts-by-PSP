import { create } from 'zustand';
import * as api from '../services/api';
import { storage } from '../utils/storage';
import { ShiftTypeConfig, Shift, Gratification, CalendarEvent } from '../types';
import { Occurrence } from '../types/occurrence';

const STORAGE_KEY = 'app_data';

// ─── Local vs. server boundary ───────────────────────────────────────────────
//
// LOCAL-ONLY (persisted to AsyncStorage, no server counterpart):
//   • gratifiedConfig   — user-defined calculation parameters
//   • gratifiedTemplates — saved report header presets
//
// SERVER-BACKED (fetched fresh on login; never persisted locally):
//   • shifts, gratifications, occurrences, cycles, gratifiedEntries
//
// BOTH (server-authoritative but also cached locally for offline bootstrap):
//   • shiftTypes — migrated to server on first sync; local fallback allowed
//
// IDs starting with "local-" were created while the server was unreachable.
// They are only valid for shiftTypes (which are persisted locally).  For all
// other entities the local fallback is intentionally absent — a failed API
// call surfaces immediately so the user is never shown phantom data.
// ─────────────────────────────────────────────────────────────────────────────

const isLocalId = (id: string) => id.startsWith('local-');

export interface GratifiedConfig {
  baseSmall4h: number;
  baseLarge4h: number;
  fractionSmallPerHour: number;
  fractionLargePerHour: number;
  discountPercent: number;
  smallStart: string;
  smallEnd: string;
  largeStart: string;
  largeEnd: string;
}

export interface Cycle {
  id: string;
  name?: string;
  pattern: string[];
  startDate?: string;
  color?: string;
}

export interface GratifiedTemplate {
  name: string;
  posto?: string;
  nome?: string;
  matricula?: string;
  comando?: string;
  [key: string]: unknown;
}

export interface GratifiedEntry {
  id: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  type?: string;
  value?: number;
  note?: string;
  [key: string]: unknown;
}

interface DataStore {
  shifts: Shift[];
  shiftTypes: ShiftTypeConfig[];
  gratifications: Gratification[];
  cycles: Cycle[];
  events: CalendarEvent[];
  occurrences: Occurrence[];
  gratifiedConfig: GratifiedConfig;
  gratifiedTemplates: GratifiedTemplate[];
  gratifiedEntries: GratifiedEntry[];
  currentMonth: string;
  currentYear: string;

  setCurrentMonth: (month: string) => void;
  setCurrentYear: (year: string) => void;
  clearSyncedCollections: () => void;

  createOccurrence: (data: Partial<Occurrence>) => Promise<Occurrence>;
  fetchOccurrences: (status?: string, classification?: string) => Promise<Occurrence[]>;
  updateOccurrence: (id: string, data: Partial<Occurrence>) => Promise<Occurrence>;
  deleteOccurrence: (id: string) => Promise<void>;

  fetchShifts: (month?: string) => Promise<Shift[]>;
  createShift: (shift: Omit<Shift, 'id' | 'user_id' | 'created_at'>) => Promise<Shift>;
  updateShift: (id: string, data: Partial<Shift>) => Promise<Shift>;
  deleteShift: (id: string) => Promise<void>;
  bulkUpsertShifts: (items: api.BulkShiftItem[]) => Promise<{ created?: number; updated?: number; total?: number; message?: string }>;

  fetchGratifications: (month?: string, year?: string) => Promise<Gratification[]>;
  createGratification: (data: Omit<Gratification, 'id' | 'user_id' | 'created_at'>) => Promise<Gratification>;
  updateGratification: (id: string, data: Partial<Gratification>) => Promise<void>;
  deleteGratification: (id: string) => Promise<void>;

  fetchMonthlyStats: (month: string) => Promise<unknown>;
  fetchYearlyStats: (year: string) => Promise<unknown>;
  fetchDashboardStats: () => Promise<unknown>;
  fetchComparisonStats: () => Promise<unknown>;

  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  resetData: () => Promise<void>;
  resetCalendarData: () => Promise<void>;
  resetGratifiedData: () => Promise<void>;
  resetOccurrencesData: () => Promise<void>;
  restoreFromBackup: (payload: Record<string, unknown>) => Promise<void>;

  fetchShiftTypes: () => Promise<ShiftTypeConfig[]>;
  createShiftType: (shiftType: Partial<ShiftTypeConfig>) => Promise<void>;
  deleteShiftType: (id: string) => Promise<void>;
  updateShiftType: (id: string, data: Partial<ShiftTypeConfig>) => Promise<void>;

  fetchCycles: () => Promise<void>;
  createCycle: (cycle: Omit<Cycle, 'id'>) => Promise<void>;
  updateCycle: (id: string, data: { name?: string; pattern?: string[] }) => Promise<void>;
  deleteCycle: (id: string) => Promise<void>;

  fetchEvents: (month?: string) => Promise<void>;
  createEvent: (data: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => Promise<CalendarEvent>;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  setGratifiedConfig: (partial: Partial<GratifiedConfig>) => Promise<void>;
  upsertGratifiedTemplate: (template: GratifiedTemplate) => Promise<void>;
  deleteGratifiedTemplate: (name: string) => Promise<void>;
  fetchGratifiedEntries: (month?: string) => Promise<void>;
  createGratifiedEntry: (entry: Omit<GratifiedEntry, 'id'>) => Promise<void>;
  deleteGratifiedEntry: (id: string) => Promise<void>;
}

/** Keys persisted locally only (server-backed entities are excluded to avoid ghost rows). */
const persistLocalSlice = (state: DataStore) => ({
  shiftTypes: state.shiftTypes,
  gratifiedConfig: state.gratifiedConfig,
  gratifiedTemplates: state.gratifiedTemplates,
});

const DEFAULT_GRATIFIED_CONFIG: GratifiedConfig = {
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

export const useDataStore = create<DataStore>((set, get) => ({
  shifts: [],
  shiftTypes: [],
  gratifications: [],
  cycles: [],
  events: [],
  occurrences: [],
  gratifiedConfig: DEFAULT_GRATIFIED_CONFIG,
  gratifiedTemplates: [],
  gratifiedEntries: [],
  currentMonth: new Date().toISOString().slice(0, 7),
  currentYear: new Date().getFullYear().toString(),

  setCurrentMonth: (month) => set({ currentMonth: month }),
  setCurrentYear: (year) => set({ currentYear: year }),

  clearSyncedCollections: () =>
    set({ shifts: [], gratifications: [], occurrences: [], cycles: [], events: [], gratifiedEntries: [] }),

  // ==================== OCCURRENCES ====================

  createOccurrence: async (data) => {
    const result: Occurrence = await api.createOccurrence(data);
    set((state) => ({ occurrences: [result, ...state.occurrences] }));
    return result;
  },

  fetchOccurrences: async (status, classification) => {
    const result: Occurrence[] = await api.getOccurrences(status, classification);
    set({ occurrences: result });
    return result;
  },

  updateOccurrence: async (id, data) => {
    const result: Occurrence = await api.updateOccurrence(id, data);
    set((state) => ({
      occurrences: state.occurrences.map((o) => (o.id === id ? result : o)),
    }));
    return result;
  },

  deleteOccurrence: async (id) => {
    await api.deleteOccurrence(id);
    set((state) => ({
      occurrences: state.occurrences.filter((o) => o.id !== id),
    }));
  },

  // ==================== SHIFTS ====================

  fetchShifts: async (month) => {
    try {
      const result: Shift[] = await api.getShifts(month);
      set({ shifts: result });
      return result;
    } catch (error) {
      console.error('Error fetching shifts:', error);
      return get().shifts;
    }
  },

  createShift: async (shift) => {
    const result: Shift = await api.createShift(shift);
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
  },

  updateShift: async (id, data) => {
    const result: Shift = await api.updateShift(id, data);
    set((state) => ({
      shifts: state.shifts.map((s) => (s.id === id ? result : s)),
    }));
    return result;
  },

  deleteShift: async (id) => {
    await api.deleteShift(id);
    set((state) => ({ shifts: state.shifts.filter((s) => s.id !== id) }));
  },

  bulkUpsertShifts: (items) => api.bulkUpsertShifts(items),

  // ==================== GRATIFICATIONS ====================

  fetchGratifications: async (month, year) => {
    try {
      const result: Gratification[] = await api.getGratifications(month, year);
      set({ gratifications: result });
      return result;
    } catch (error) {
      console.error('Error fetching gratifications:', error);
      return get().gratifications;
    }
  },

  createGratification: async (data) => {
    const result: Gratification = await api.createGratification(data);
    set((state) => ({ gratifications: [result, ...state.gratifications] }));
    return result;
  },

  updateGratification: async (id, data) => {
    await api.updateGratification(id, data);
    set((state) => ({
      gratifications: state.gratifications.map((g) =>
        g.id === id ? { ...g, ...data } : g
      ),
    }));
  },

  deleteGratification: async (id) => {
    await api.deleteGratification(id);
    set((state) => ({
      gratifications: state.gratifications.filter((g) => g.id !== id),
    }));
  },

  // ==================== STATISTICS ====================

  fetchMonthlyStats: (month) => api.getMonthlyStats(month),
  fetchYearlyStats: (year) => api.getYearlyStats(year),
  fetchDashboardStats: () => api.getDashboardStats(),
  fetchComparisonStats: () => api.getComparisonStats(),

  // ==================== LOCAL STORAGE ====================

  loadData: async () => {
    const data = await storage.getItem(STORAGE_KEY);
    if (!data) return;
    const parsed = JSON.parse(data) as Partial<DataStore>;
    set({
      shiftTypes: parsed?.shiftTypes ?? [],
      gratifiedConfig: parsed?.gratifiedConfig ?? get().gratifiedConfig,
      gratifiedTemplates: parsed?.gratifiedTemplates ?? [],
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
    await Promise.all([api.resetShifts(), api.resetCycles(), api.resetEvents()]);
    set({ shifts: [], shiftTypes: [], cycles: [], events: [] });
    await get().saveData();
  },

  resetGratifiedData: async () => {
    await api.resetGratifiedEntries();
    set({
      gratifications: [],
      gratifiedTemplates: [],
      gratifiedEntries: [],
      gratifiedConfig: { ...DEFAULT_GRATIFIED_CONFIG },
    });
    await get().saveData();
  },

  resetOccurrencesData: async () => {
    await api.resetOccurrences();
    set({ occurrences: [] });
    await get().saveData();
  },

  restoreFromBackup: async (payload) => {
    set({
      shiftTypes: Array.isArray(payload.shiftTypes) ? payload.shiftTypes as ShiftTypeConfig[] : get().shiftTypes,
      cycles: Array.isArray(payload.cycles) ? payload.cycles as Cycle[] : get().cycles,
      gratifiedConfig: payload.gratifiedConfig ? { ...get().gratifiedConfig, ...(payload.gratifiedConfig as GratifiedConfig) } : get().gratifiedConfig,
      gratifiedTemplates: Array.isArray(payload.gratifiedTemplates) ? payload.gratifiedTemplates as GratifiedTemplate[] : get().gratifiedTemplates,
      gratifiedEntries: Array.isArray(payload.gratifiedEntries) ? payload.gratifiedEntries as GratifiedEntry[] : get().gratifiedEntries,
      shifts: Array.isArray(payload.shifts) ? payload.shifts as Shift[] : get().shifts,
      gratifications: Array.isArray(payload.gratifications) ? payload.gratifications as Gratification[] : get().gratifications,
    });
    await get().saveData();
  },

  // ==================== SHIFT TYPES ====================

  fetchShiftTypes: async () => {
    try {
      const serverResult: ShiftTypeConfig[] = await api.getShiftTypes();
      const local: ShiftTypeConfig[] = get().shiftTypes;

      if (serverResult.length === 0 && local.length > 0) {
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
            synced.push(st);
          }
        }
        const finalList = synced.length > 0 ? synced : local;
        set({ shiftTypes: finalList });
        get().saveData();
        return finalList;
      }

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
        name: shiftType.name ?? '',
        color: shiftType.color ?? '#6B7280',
        start_time: shiftType.start_time || shiftType.startTime,
        end_time: shiftType.end_time || shiftType.endTime,
        is_working: shiftType.is_working,
        order: shiftType.order,
      });
      set((state) => ({ shiftTypes: [...state.shiftTypes, created] }));
      get().saveData();
    } catch (error) {
      console.warn('[dataStore] createShiftType API failed, using local fallback:', error);
      const localFallback: ShiftTypeConfig = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: shiftType.name ?? '',
        color: shiftType.color ?? '#6B7280',
        ...shiftType,
      };
      set((state) => ({ shiftTypes: [...state.shiftTypes, localFallback] }));
      get().saveData();
    }
  },

  deleteShiftType: async (id) => {
    set((state) => ({
      shiftTypes: state.shiftTypes.filter((s) => s.id !== id),
    }));
    get().saveData();
    if (isLocalId(id)) return;
    try {
      await api.deleteShiftTypeApi(id);
    } catch (error) {
      console.warn('[dataStore] deleteShiftType API failed (local already updated):', error);
    }
  },

  updateShiftType: async (id, data) => {
    set((state) => ({
      shiftTypes: state.shiftTypes.map((st) => (st.id === id ? { ...st, ...data } : st)),
    }));
    get().saveData();
    if (isLocalId(id)) return;
    try {
      await api.updateShiftTypeApi(id, {
        name: data.name,
        color: data.color,
        start_time: data.start_time ?? data.startTime ?? null,
        end_time: data.end_time ?? data.endTime ?? null,
        is_working: data.is_working,
        order: data.order,
      });
    } catch (error) {
      console.warn('[dataStore] updateShiftType API failed (local already updated):', error);
    }
  },

  // ==================== CYCLES ====================

  fetchCycles: async () => {
    try {
      const result = await api.getCycles();
      set({ cycles: result as unknown as Cycle[] });
    } catch (error) {
      console.warn('[dataStore] fetchCycles failed:', error);
    }
  },

  createCycle: async (cycle) => {
    const created = await api.createCycleApi({
      name: cycle.name || 'Ciclo',
      pattern: Array.isArray(cycle.pattern) ? cycle.pattern : [],
    });
    set((state) => ({ cycles: [created as unknown as Cycle, ...state.cycles] }));
  },

  updateCycle: async (id, data) => {
    set((state) => ({
      cycles: state.cycles.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    if (isLocalId(id)) return;
    try {
      await api.updateCycleApi(id, data);
    } catch (error) {
      console.warn('[dataStore] updateCycle API failed (local already updated):', error);
    }
  },

  deleteCycle: async (id) => {
    set((state) => ({ cycles: state.cycles.filter((c) => c.id !== id) }));
    if (isLocalId(id)) return;
    try {
      await api.deleteCycleApi(id);
    } catch (error) {
      console.warn('[dataStore] deleteCycle API failed (local already removed):', error);
    }
  },

  // ==================== EVENTS ====================

  fetchEvents: async (month) => {
    try {
      const result = await api.getEvents(month);
      set({ events: result });
    } catch (error) {
      console.warn('[dataStore] fetchEvents failed:', error);
    }
  },

  createEvent: async (data) => {
    const created = await api.createEventApi(data);
    set((state) => ({ events: [created, ...state.events] }));
    return created;
  },

  updateEvent: async (id, data) => {
    const updated = await api.updateEventApi(id, data);
    set((state) => ({ events: state.events.map((e) => (e.id === id ? updated : e)) }));
  },

  deleteEvent: async (id) => {
    await api.deleteEventApi(id);
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
  },

  // ==================== GRATIFIED CONFIG ====================

  setGratifiedConfig: async (partial) => {
    set((state) => ({
      gratifiedConfig: { ...state.gratifiedConfig, ...partial },
    }));
    get().saveData();
  },

  upsertGratifiedTemplate: async (template) => {
    const name = (template?.name || '').trim();
    if (!name) return;
    set((state) => {
      const existingIndex = state.gratifiedTemplates.findIndex((t) => t.name === name);
      const next = [...state.gratifiedTemplates];
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
      gratifiedTemplates: state.gratifiedTemplates.filter((t) => t.name !== name),
    }));
    get().saveData();
  },

  fetchGratifiedEntries: async (month?: string) => {
    try {
      const result = await api.getGratifiedEntries(month);
      set({ gratifiedEntries: result as unknown as GratifiedEntry[] });
    } catch (error) {
      console.warn('[dataStore] fetchGratifiedEntries failed:', error);
    }
  },

  createGratifiedEntry: async (entry) => {
    const created = await api.createGratifiedEntryApi(entry as Parameters<typeof api.createGratifiedEntryApi>[0]);
    set((state) => ({ gratifiedEntries: [created as unknown as GratifiedEntry, ...state.gratifiedEntries] }));
  },

  deleteGratifiedEntry: async (id) => {
    set((state) => ({
      gratifiedEntries: state.gratifiedEntries.filter((e) => e.id !== id),
    }));
    if (isLocalId(id)) return;
    try {
      await api.deleteGratifiedEntryApi(id);
    } catch (error) {
      console.warn('[dataStore] deleteGratifiedEntry API failed (local already removed):', error);
    }
  },
}));
