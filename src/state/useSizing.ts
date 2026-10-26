/** Résultat du moteur pour le projet courant, recalculé à chaque modification. */
import { useMemo } from 'react';
import { runSizing, type SizingResult } from '../engine';
import type { Project } from '../engine/project';
import { useCatalogStore } from './catalogStore';
import { useSettingsStore } from './settingsStore';

export function useSizing(project: Project | null): SizingResult | null {
  const catalogs = useCatalogStore((s) => s.catalogs);
  const settings = useSettingsStore((s) => s.settings);
  return useMemo(
    () => (project ? runSizing(project, catalogs, settings) : null),
    [project, catalogs, settings],
  );
}
