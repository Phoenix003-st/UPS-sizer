import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import { createProject, runSizing } from '../../engine';
import { DEFAULT_SETTINGS, type ScenarioId } from '../../settings/schema';
import { buildRoom3D } from '../room-3d/model';

function room3d(scenario: ScenarioId, tweak?: (p: ReturnType<typeof createProject>) => void) {
  const p = createProject(scenario, DEFAULT_SETTINGS, { id: 't', now: '2026-01-01' });
  tweak?.(p);
  const option = runSizing(p, DEFAULT_CATALOGS, DEFAULT_SETTINGS).options[0]!;
  return buildRoom3D(option, DEFAULT_CATALOGS, { ...p.room, sector: p.scenario });
}

describe('câblage de la vue 3D', () => {
  it('arrivée réseau → tableau → UPS → batteries → tableau ondulé', () => {
    const room = room3d('server');
    const kinds = room.cabling.cables.map((c) => c.kind);
    expect(kinds).toContain('mains');
    const ups = room.items.filter((i) => i.kind.startsWith('ups') || i.kind === 'modular-frame');
    expect(kinds.filter((k) => k === 'input')).toHaveLength(ups.length);
    const cabinets = room.items.filter((i) => i.kind === 'battery-cabinet' || i.kind === 'ebm');
    expect(kinds.filter((k) => k === 'battery')).toHaveLength(cabinets.length);
    expect(kinds).toContain('output');
    // Les sections calculées sont reprises sur les liaisons.
    expect(room.cabling.cables.find((c) => c.kind === 'input')?.section).toMatch(/mm²$/);
    expect(room.cabling.trays.length).toBeGreaterThan(0);
  });

  it('chaque secteur alimente ses charges depuis le tableau ondulé', () => {
    const to = (sc: ScenarioId) => new Set(room3d(sc).cabling.cables.map((c) => c.to));
    expect(to('elevator').has('lift-controller')).toBe(true);
    expect(to('elevator').has('lift-machine')).toBe(true);
    expect(to('medical').has('medical-panel')).toBe(true);
    expect(to('industrial').has('plc-cabinet')).toBe(true);
    expect(to('enterprise').has('open-rack')).toBe(true);
    expect(to('airport').has('access-panel')).toBe(true);
  });

  it('2N : une entrée et une sortie par système', () => {
    const room = room3d('airport');
    for (const s of ['A', 'B'] as const) {
      expect(room.cabling.cables.some((c) => c.kind === 'input' && c.system === s)).toBe(true);
      expect(room.cabling.cables.some((c) => c.kind === 'output' && c.system === s)).toBe(true);
    }
  });

  it('les câbles restent dans le local et suivent des tronçons droits', () => {
    for (const sc of ['server', 'office', 'datacenter', 'elevator', 'enterprise'] as const) {
      const room = room3d(sc);
      for (const c of room.cabling.cables) {
        for (const p of c.points) {
          expect(p.x, `${sc} ${c.id}`).toBeGreaterThanOrEqual(-1e-6);
          expect(p.z).toBeGreaterThanOrEqual(-1e-6);
          expect(p.x).toBeLessThanOrEqual(room.length + 1e-6);
          expect(p.z).toBeLessThanOrEqual(room.width + 1e-6);
          expect(p.y).toBeLessThanOrEqual(room.height + 1e-6);
        }
        for (let i = 1; i < c.points.length; i++) {
          const a = c.points[i - 1]!;
          const b = c.points[i]!;
          const moved = [a.x !== b.x, a.y !== b.y, a.z !== b.z].filter(Boolean).length;
          expect(moved, `${sc} ${c.id}`).toBe(1);
        }
      }
    }
  });

  it('au bureau, liaisons en goulotte au ras du sol depuis une prise murale', () => {
    const room = room3d('office');
    const mains = room.cabling.cables.find((c) => c.kind === 'mains')!;
    expect(Math.max(...mains.points.map((p) => p.y))).toBeLessThan(1);
    expect(room.cabling.cables.some((c) => c.to === 'desk')).toBe(true);
  });
});
