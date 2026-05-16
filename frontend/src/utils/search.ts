import { create } from 'zustand';

interface SearchStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}));

export const search = {
  open: () => useSearchStore.getState().open(),
  close: () => useSearchStore.getState().close(),
};
