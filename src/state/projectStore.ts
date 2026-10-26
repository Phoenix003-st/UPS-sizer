/**
 * Projets : liste, projet courant, création, modification, duplication, import / export.
 * Sauvegarde automatique à chaque modification (IndexedDB), jamais envoyée à un serveur.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createProject, projectSchema, type Project } from '../engine/project';
import type { ScenarioId, Settings } from '../settings/schema';
import { browserStorage } from './storage';

interface ProjectState {
  projects: Record<string, Project>;
  currentId: string | null;
  create: (scenario: ScenarioId, settings: Settings, catalogVersion: string) => Project;
  /** Modifie le projet courant (copie modifiable passée à `fn`). */
  update: (fn: (draft: Project) => void) => void;
  open: (id: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string, name: string) => void;
  importProject: (p: Project) => void;
}

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (setState, getState) => ({
      projects: {},
      currentId: null,
      create: (scenario, settings, catalogVersion) => {
        const p = createProject(scenario, settings, { id: newId() });
        p.catalogVersion = catalogVersion;
        setState((s) => ({ projects: { ...s.projects, [p.id]: p }, currentId: p.id }));
        return p;
      },
      update: (fn) => {
        const { currentId, projects } = getState();
        if (!currentId || !projects[currentId]) return;
        const draft = structuredClone(projects[currentId]);
        fn(draft);
        draft.updatedAt = new Date().toISOString();
        setState({ projects: { ...projects, [currentId]: draft } });
      },
      open: (id) => setState({ currentId: id }),
      remove: (id) =>
        setState((s) => {
          const projects = { ...s.projects };
          delete projects[id];
          return { projects, currentId: s.currentId === id ? null : s.currentId };
        }),
      duplicate: (id, name) =>
        setState((s) => {
          const src = s.projects[id];
          if (!src) return s;
          const now = new Date().toISOString();
          const copy: Project = {
            ...structuredClone(src),
            id: newId(),
            name,
            createdAt: now,
            updatedAt: now,
          };
          return { projects: { ...s.projects, [copy.id]: copy } };
        }),
      importProject: (p) => {
        const copy = withFreshId(p, getState().projects);
        setState((s) => ({ projects: { ...s.projects, [copy.id]: copy }, currentId: copy.id }));
      },
    }),
    {
      name: 'ups-sizer:projects',
      version: 1,
      storage: createJSONStorage(() => browserStorage),
      partialize: (s) => ({ projects: s.projects, currentId: s.currentId }),
      merge: (persisted, current) => {
        const p = persisted as
          { projects?: Record<string, unknown>; currentId?: string | null } | undefined;
        const projects: Record<string, Project> = {};
        for (const [id, raw] of Object.entries(p?.projects ?? {})) {
          const r = projectSchema.safeParse(raw);
          if (r.success) projects[id] = r.data;
        }
        const currentId = p?.currentId && projects[p.currentId] ? p.currentId : null;
        return { ...current, projects, currentId };
      },
    },
  ),
);

/** Un projet importé qui a le même identifiant qu'un projet existant reçoit un nouvel identifiant. */
function withFreshId(p: Project, existing: Record<string, Project>): Project {
  return existing[p.id] ? { ...p, id: newId() } : p;
}

/** Projet courant (ou null). */
export function useCurrentProject(): Project | null {
  return useProjectStore((s) => (s.currentId ? (s.projects[s.currentId] ?? null) : null));
}
