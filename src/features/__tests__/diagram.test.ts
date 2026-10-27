import { describe, expect, it } from 'vitest';
import { SAMPLE_CATALOGS } from '../../catalog/samples';
import { createProject, runSizing } from '../../engine';
import { DEFAULT_SETTINGS } from '../../settings/schema';
import { buildSingleLine, type DiagramLabels } from '../single-line/diagram';

const labels: DiagramLabels = {
  mains: 'Réseau',
  generator: 'GE',
  system: (s) => `Système ${s}`,
  board: 'Tableau',
  maintenanceBypass: 'Bypass',
  battery: 'Batteries',
  feeder: 'Départs',
  modules: (n, kw) => `${n} × ${kw} kW`,
  units: (n) => `${n} unités`,
};

function diagramFor(
  scenario: Parameters<typeof createProject>[0],
  tweak?: (p: ReturnType<typeof createProject>) => void,
) {
  const p = createProject(scenario, DEFAULT_SETTINGS, { id: 't', now: '2026-01-01' });
  tweak?.(p);
  const o = runSizing(p, SAMPLE_CATALOGS, DEFAULT_SETTINGS).options[0]!;
  const model = SAMPLE_CATALOGS.ups.models.find((m) => m.id === o.ups.modelId);
  return { o, d: buildSingleLine(o, model, p.installation, 4, labels) };
}

describe('schéma unifilaire', () => {
  it('système simple : réseau, entrées redresseur et bypass, sortie, batterie, départs', () => {
    // Marge de 20 % : UPS triphasé avec batteries externes (disjoncteur batterie Q4).
    const { o, d } = diagramFor('server', (p) => void (p.advanced.growthMargin = 0.2));
    const breakers = d.elements.filter((e) => e.type === 'breaker');
    // Q1 redresseur, Q2 bypass, Q3 sortie, Q4 batterie, 4 départs (pas de bypass externe par défaut)
    expect(breakers).toHaveLength(4 + 4);
    const rect = o.electrical.circuits.find((c) => c.id === 'rectifier')!;
    expect(breakers[0]).toMatchObject({ tag: 'Q1', rating: `${rect.breakerA} A 4P` });
    expect(d.elements.some((e) => e.type === 'symbol' && e.kind === 'battery')).toBe(true);
    expect(d.elements.some((e) => e.type === 'symbol' && e.kind === 'generator')).toBe(false);
  });

  it('2N avec groupe électrogène et bypass de maintenance : deux systèmes', () => {
    const { d } = diagramFor('airport', (p) => {
      p.installation.generator = true;
      p.installation.externalMaintenanceBypass = true;
    });
    const texts = d.elements
      .filter((e) => e.type === 'text')
      .map((e) => (e as { text: string }).text);
    expect(texts).toEqual(expect.arrayContaining(['Système A', 'Système B']));
    expect(d.elements.filter((e) => e.type === 'symbol' && e.kind === 'ats')).toHaveLength(2);
    expect(d.elements.filter((e) => e.type === 'symbol' && e.kind === 'source')).toHaveLength(2);
    expect(d.width).toBeGreaterThan(800);
  });

  it('modulaire : nombre de modules affiché dans le châssis', () => {
    const { o, d } = diagramFor('datacenter', (p) => {
      p.settingsOverrides = { scenarios: { datacenter: { technologies: ['modular'] } } };
    });
    const box = d.elements.find((e) => e.type === 'box') as { sub?: string };
    expect(box.sub).toContain(String(o.ups.modulesPerFrame![0]));
  });

  it('plus de trois unités : les suivantes sont résumées', () => {
    const { d } = diagramFor('custom', (p) => {
      p.load.value = 700;
      p.advanced.redundancy = 'N+1';
      p.settingsOverrides = {
        scenarios: { custom: { technologies: ['online_double_conversion'] } },
        selection: { maxOversizeFactor: 1 },
      };
      p.room = {
        ...p.room,
        lengthMm: 30000,
        widthMm: 15000,
        door: { ...p.room.door, widthMm: 3000, heightMm: 3000 },
      };
    });
    expect(d.elements.filter((e) => e.type === 'box')).toHaveLength(3);
    expect(d.elements.some((e) => e.type === 'text' && e.text === '4 unités')).toBe(true);
  });
});
