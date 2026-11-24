import { create } from "zustand";
import { cmd } from "@/services/api";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "notes.theme";

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(mode: ThemeMode) {
  const effective = resolve(mode);
  document.documentElement.classList.toggle("dark", effective === "dark");
}

interface ThemeState {
  mode: ThemeMode;
  init: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",

  init: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const mode: ThemeMode = stored === "light" || stored === "dark" ? stored : "system";
    apply(mode);
    set({ mode });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      // Re-apply when the system theme changes and we're following it.
      const current = localStorage.getItem(STORAGE_KEY);
      if (!current || current === "system") apply("system");
    });
  },

  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    apply(mode);
    set({ mode });
    // Persist to the local database as well (best-effort).
    void cmd("settings_set", { key: "theme", value: mode }).catch(() => {});
  },
}));
