import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import type { EquipmentCategory } from '../../catalog/schemas';
import { SCENARIOS } from '../../settings/schema';
import { splitCategories } from '../power/sectorCategories';

const available = [
  ...new Set(DEFAULT_CATALOGS.equipment.map((e) => e.category)),
] as EquipmentCategory[];

describe('équipements proposés selon le secteur', () => {
  it('chaque secteur propose ses familles d’abord, les autres restent accessibles', () => {
    for (const sc of SCENARIOS) {
      const { main, others } = splitCategories(sc, available);
      expect(main.length, sc).toBeGreaterThan(0);
      expect(new Set([...main, ...others])).toEqual(new Set(available));
    }
    expect(splitCategories('airport', available).main[0]).toBe('access');
    expect(splitCategories('medical', available).main[0]).toBe('medical');
    expect(splitCategories('industrial', available).main[0]).toBe('industrial');
    expect(splitCategories('elevator', available).main[0]).toBe('elevator');
    expect(splitCategories('enterprise', available).main).toContain('network');
    expect(splitCategories('custom', available).others).toEqual([]);
  });

  it('chaque famille spécifique a des équipements dans la bibliothèque', () => {
    for (const cat of ['access', 'medical', 'industrial', 'elevator'])
      expect(DEFAULT_CATALOGS.equipment.filter((e) => e.category === cat).length).toBeGreaterThan(
        4,
      );
  });
});
