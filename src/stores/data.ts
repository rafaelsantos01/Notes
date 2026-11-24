import { create } from "zustand";
import { projects as projectsService } from "@/services";
import type { ID, Project } from "@/types/domain";

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
}

/**
 * Cache compartilhado de projetos: usado em chips, seletores e filtros.
 * Mutações devem chamar load(true) para invalidar.
 */
export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  loaded: false,

  load: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;
    set({ loading: true });
    try {
      const list = await projectsService.list();
      set({ projects: list, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
}));

export function useProjectById(id: ID | null | undefined): Project | undefined {
  return useProjectsStore((s) => s.projects.find((p) => p.id === id));
}
