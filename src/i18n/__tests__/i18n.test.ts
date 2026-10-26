import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import { createProject, runSizing } from '../../engine';
import { DEFAULT_SETTINGS, SCENARIOS } from '../../settings/schema';
import en from '../en.json';
import fr from '../fr.json';

type Dict = { [k: string]: string | Dict };
function keys(d: Dict, prefix = ''): string[] {
  return Object.entries(d).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  );
}
function has(d: Dict, key: string): boolean {
  const v = key.split('.').reduce<unknown>((acc, k) => (acc as Dict | undefined)?.[k], d);
  return typeof v === 'string';
}

describe('traductions', () => {
  it('le français et l’anglais ont les mêmes clés', () => {
    expect(keys(en as Dict).sort()).toEqual(keys(fr as Dict).sort());
  });

  it('toutes les alertes et étapes de calcul produites par le moteur sont traduites', () => {
    const codes = new Set<string>();
    const labels = new Set<string>();
    const variants = SCENARIOS.flatMap((sc) => {
      const base = createProject(sc, DEFAULT_SETTINGS, { id: sc, now: '2026-01-01' });
      const hot = structuredClone(base);
      hot.room = {
        ...hot.room,
        ambientC: 45,
        humidityPct: 99,
        altitudeM: 2500,
        lengthMm: 1000,
        floorLoadKgM2: 100,
        hvac: { present: false, kW: 0 },
      };
      hot.installation.generator = true;
      hot.advanced.phases = 1;
      const li = structuredClone(base);
      li.advanced.batteryChemistry = 'LI';
      const none = structuredClone(base);
      none.load.value = 0;
      const tooBig = structuredClone(base);
      tooBig.load.value = 1e5;
      return [base, hot, li, none, tooBig];
    });
    for (const p of variants) {
      const r = runSizing(p, DEFAULT_CATALOGS, DEFAULT_SETTINGS);
      r.globalAlerts.forEach((a) => codes.add(a.code));
      Object.values(r.traces).forEach(
        (t) => (labels.add(t.title), t.steps.forEach((s) => labels.add(s.label))),
      );
      for (const o of r.options) {
        o.alerts.forEach((a) => codes.add(a.code));
        Object.values(o.traces).forEach(
          (t) => (labels.add(t.title), t.steps.forEach((s) => labels.add(s.label))),
        );
        o.bom.forEach((l) => labels.add(l.labelKey));
      }
    }
    expect(codes.size).toBeGreaterThan(10);
    for (const d of [fr, en] as Dict[]) {
      for (const c of codes) expect(has(d, `alert.${c}`), `alert.${c}`).toBe(true);
      for (const l of labels) expect(has(d, l), l).toBe(true);
    }
  });
});
