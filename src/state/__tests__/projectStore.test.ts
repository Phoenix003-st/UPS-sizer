import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../settings/schema';
import { useProjectStore } from '../projectStore';

describe('projets', () => {
  beforeEach(() => useProjectStore.setState({ projects: {}, currentId: null }));

  it('crée, modifie, duplique, importe et supprime', () => {
    const s = useProjectStore.getState();
    const p = s.create('server', DEFAULT_SETTINGS, 'v1');
    expect(useProjectStore.getState().currentId).toBe(p.id);
    expect(p.catalogVersion).toBe('v1');

    useProjectStore.getState().update((d) => void (d.name = 'Salle A'));
    const updated = useProjectStore.getState().projects[p.id]!;
    expect(updated.name).toBe('Salle A');
    expect(updated.updatedAt >= p.updatedAt).toBe(true);

    useProjectStore.getState().duplicate(p.id, 'Copie');
    expect(
      Object.values(useProjectStore.getState().projects)
        .map((x) => x.name)
        .sort(),
    ).toEqual(['Copie', 'Salle A']);

    // Import d'un projet de même identifiant : nouvel identifiant.
    useProjectStore.getState().importProject(updated);
    expect(Object.keys(useProjectStore.getState().projects)).toHaveLength(3);

    useProjectStore.getState().remove(useProjectStore.getState().currentId!);
    expect(useProjectStore.getState().currentId).toBeNull();
    expect(Object.keys(useProjectStore.getState().projects)).toHaveLength(2);
  });

  it('modifier sans projet courant ne fait rien', () => {
    useProjectStore.getState().update((d) => void (d.name = 'x'));
    expect(useProjectStore.getState().projects).toEqual({});
  });
});
