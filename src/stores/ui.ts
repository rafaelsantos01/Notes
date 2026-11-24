import { create } from "zustand";
import type { EntityType, ID } from "@/types/domain";

export type QuickCreateType = "note" | "activity" | "task" | "project" | "link" | "reminder";

interface UiState {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  quickCreate: QuickCreateType | null;
  openQuickCreate: (type: QuickCreateType | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),

  quickCreate: null,
  openQuickCreate: (type) => set({ quickCreate: type }),
}));

// ---------------------------------------------------------------------------
// Focus queue: entidades que devem ser abertas/destacadas após navegação
// (usado pela busca global e pela criação rápida).
// ---------------------------------------------------------------------------

interface FocusState {
  pending: { type: EntityType; id: ID } | null;
  requestFocus: (type: EntityType, id: ID) => void;
  consumeFocus: () => { type: EntityType; id: ID } | null;
}

export const useFocusStore = create<FocusState>()((set, get) => ({
  pending: null,
  requestFocus: (type, id) => set({ pending: { type, id } }),
  consumeFocus: () => {
    const pending = get().pending;
    if (pending) set({ pending: null });
    return pending;
  },
}));
