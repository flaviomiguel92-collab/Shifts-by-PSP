import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_data';

export const useDataStore = create((set, get) => ({
  shifts: [],
  shiftTypes: [],
  gratifications: [],
  cycles: [],
  gratifiedConfig: {
    baseSmall4h: 52.73,
    baseLarge4h: 75.89,
    fractionSmallPerHour: 13.4,
    fractionLargePerHour: 19.74,
    discountPercent: 10,
    smallStart: '06:01',
    smallEnd: '17:59',
    largeStart: '18:00',
    largeEnd: '06:00',
  },
  gratifiedTemplates: [],
  gratifiedEntries: [],
  currentMonth: new Date().toISOString().slice(0, 7),
  currentYear: new Date().getFullYear().toString(),

  setCurrentMonth: (month) => set({ currentMonth: month }),
  setCurrentYear: (year) => set({ currentYear: year }),

  // 🔥 FUNÇÕES VAZIAS (para evitar erros)
  fetchShifts: async () => {},
  fetchGratifications: async () => {},
  fetchMonthlyStats: async () => {},
  fetchComparisonStats: async () => {},

  // 🔥 LOAD DATA
  loadData: async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      set({
        ...parsed,
        cycles: parsed?.cycles ?? [],
        shifts: parsed?.shifts ?? [],
        shiftTypes: parsed?.shiftTypes ?? [],
        gratifications: parsed?.gratifications ?? [],
        gratifiedConfig: parsed?.gratifiedConfig ?? get().gratifiedConfig,
        gratifiedTemplates: parsed?.gratifiedTemplates ?? [],
        gratifiedEntries: parsed?.gratifiedEntries ?? [],
      });
    }
  },

  // 🔥 SAVE DATA
  saveData: async () => {
    const state = get();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        shifts: state.shifts,
        shiftTypes: state.shiftTypes,
        gratifications: state.gratifications,
        cycles: state.cycles,
        gratifiedConfig: state.gratifiedConfig,
        gratifiedTemplates: state.gratifiedTemplates,
        gratifiedEntries: state.gratifiedEntries,
      })
    );
  },

  resetData: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({
      shifts: [],
      shiftTypes: [],
      gratifications: [],
      cycles: [],
      gratifiedTemplates: [],
      gratifiedEntries: [],
    });
  },

  // SHIFTS
  createShift: async (shift) => {
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
},

// SHIFT TYPES (turnos personalizados)
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

// CYCLES (sequências definidas pelo utilizador)
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

// GRATIFIED CONFIG / TEMPLATES / ENTRIES
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

  updateShift: async (id, data) => {
    set((state) => ({
      shifts: state.shifts.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    }));
    get().saveData();
  },

  deleteShiftType: async (id) => {
  set((state) => ({
    shiftTypes: state.shiftTypes.filter((s) => s.id !== id),
  }));

  get().saveData();
},

  deleteShift: async (id) => {
    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== id),
    }));
    get().saveData();
  },

  // GRATIFICATIONS
  createGratification: async (data) => {
    const newItem = { ...data, id: Date.now().toString() };
    set((state) => ({
      gratifications: [newItem, ...state.gratifications],
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