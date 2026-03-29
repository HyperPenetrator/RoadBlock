import { create } from 'zustand';

export type SheetSnap = 0 | 1 | 2; // 0=closed, 1=half, 2=full

interface UIState {
  sheetSnap: SheetSnap;
  sidebarOpen: boolean;
  setSheetSnap: (s: SheetSnap) => void;
  setSidebarOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sheetSnap: 0,
  sidebarOpen: false,
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
