import * as React from "react";
import { useUiStore } from "@/stores/ui";

/**
 * Atalhos globais do aplicativo:
 * - Ctrl+K: busca global
 * - Ctrl+N: nova anotação
 * - Ctrl+D: novo registro diário
 * - Ctrl+T: nova tarefa
 */
export function useGlobalShortcuts() {
  const toggleSearch = useUiStore((s) => s.toggleSearch);
  const openQuickCreate = useUiStore((s) => s.openQuickCreate);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        toggleSearch();
      } else if (key === "n") {
        e.preventDefault();
        openQuickCreate("note");
      } else if (key === "d") {
        e.preventDefault();
        openQuickCreate("activity");
      } else if (key === "t") {
        e.preventDefault();
        openQuickCreate("task");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSearch, openQuickCreate]);
}
