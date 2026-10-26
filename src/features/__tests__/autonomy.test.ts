import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import { runSizing } from '../../engine';
import { project, settings } from '../../engine/__tests__/fixtures';
import { SCENARIOS } from '../../settings/schema';
import { autonomyData } from '../autonomy/autonomyData';

describe('autonomie selon la charge', () => {
  for (const sc of SCENARIOS) {
    it(`${sc} : cohérente avec le dimensionnement et décroissante avec la charge`, () => {
      const r = runSizing(project(sc), DEFAULT_CATALOGS, settings);
      for (const o of r.options) {
        const d = autonomyData(o, r.inputs, DEFAULT_CATALOGS)!;
        expect(d).not.toBeNull();
        // À la charge de dimensionnement, on retrouve l'autonomie calculée par le moteur.
        const design =
          d.rows.find((p) => p.mark === 'design') ?? d.rows.find((p) => p.mark === 'load')!;
        expect(design.endOfLifeMin).toBeCloseTo(o.battery.autonomyMin, 6);
        const load = d.rows.find((p) => p.mark === 'load')!;
        expect(load.newMin).toBeCloseTo(o.battery.autonomyNewMin, 6);
        for (let i = 1; i < d.curve.length; i++) {
          expect(d.curve[i]!.endOfLifeMin).toBeLessThanOrEqual(d.curve[i - 1]!.endOfLifeMin + 1e-9);
          expect(d.curve[i]!.newMin).toBeGreaterThanOrEqual(d.curve[i]!.endOfLifeMin - 1e-9);
        }
      }
    });
  }
});
