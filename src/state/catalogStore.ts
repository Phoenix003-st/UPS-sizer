/** Catalogues (UPS, batteries, équipements), modifiables et sauvegardés dans le navigateur. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultCatalogs } from '../catalog';
import {
  batteryCatalogSchema,
  equipmentLibrarySchema,
  upsCatalogSchema,
  type BatteryCatalog,
  type Catalogs,
  type EquipmentLibrary,
  type UpsCatalog,
} from '../catalog/schemas';
import { browserStorage } from './storage';

interface CatalogState {
  catalogs: Catalogs;
  setUps: (c: UpsCatalog) => void;
  setBatteries: (c: BatteryCatalog) => void;
  setEquipment: (c: EquipmentLibrary) => void;
  reset: (part: keyof Catalogs) => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (setState) => ({
      catalogs: defaultCatalogs(),
      setUps: (ups) => setState((s) => ({ catalogs: { ...s.catalogs, ups } })),
      setBatteries: (batteries) => setState((s) => ({ catalogs: { ...s.catalogs, batteries } })),
      setEquipment: (equipment) => setState((s) => ({ catalogs: { ...s.catalogs, equipment } })),
      reset: (part) =>
        setState((s) => ({ catalogs: { ...s.catalogs, [part]: defaultCatalogs()[part] } })),
    }),
    {
      name: 'ups-sizer:catalogs',
      version: 1,
      storage: createJSONStorage(() => browserStorage),
      partialize: (s) => ({ catalogs: s.catalogs }),
      merge: (persisted, current) => {
        const c = (persisted as { catalogs?: Partial<Record<keyof Catalogs, unknown>> } | undefined)
          ?.catalogs;
        if (!c) return current;
        const ups = upsCatalogSchema.safeParse(c.ups);
        const batteries = batteryCatalogSchema.safeParse(c.batteries);
        const equipment = equipmentLibrarySchema.safeParse(c.equipment);
        return {
          ...current,
          catalogs: {
            ups: ups.success ? ups.data : current.catalogs.ups,
            batteries: batteries.success ? batteries.data : current.catalogs.batteries,
            equipment: equipment.success ? equipment.data : current.catalogs.equipment,
          },
        };
      },
    },
  ),
);
