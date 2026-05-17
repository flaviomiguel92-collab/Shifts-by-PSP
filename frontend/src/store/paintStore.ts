import { create } from 'zustand';

interface PaintStore {
  active: boolean;
  shiftType: string | null;
  setActive: (active: boolean) => void;
  setShiftType: (shiftType: string | null) => void;
}

export const usePaintStore = create<PaintStore>((set) => ({
  active: false,
  shiftType: null,
  setActive: (active) => set({ active }),
  setShiftType: (shiftType) => set({ shiftType }),
}));
