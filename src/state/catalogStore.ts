/** Catalogues (UPS, batteries, équipements), modifiables et sauvegardés dans le navigateur. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_CATALOGS, defaultCatalogs } from '../catalog';
import { EDITION } from '../catalog/edition';
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
      name: `ups-sizer:catalogs:${EDITION.id}`,
      version: 2,
      storage: createJSONStorage(() => browserStorage),
      partialize: (s) => ({ catalogs: s.catalogs }),
      // v1 → v2 : nouveaux secteurs. Les équipements livrés absents de la bibliothèque enregistrée
      // y sont ajoutés, et le contrôleur d'accès passe dans la famille « Contrôle d'accès ».
      migrate: (persisted, version) => {
        const st = persisted as { catalogs?: { equipment?: unknown } } | undefined;
        const saved = st?.catalogs?.equipment;
        if (version < 2 && Array.isArray(saved)) {
          const items = saved as { id?: unknown; category?: unknown }[];
          for (const it of items)
            if (it.id === 'access-control' && it.category === 'building') it.category = 'access';
          const ids = new Set(items.map((it) => it.id));
          items.push(
            ...DEFAULT_CATALOGS.equipment.filter((e) => !ids.has(e.id)).map((e) => ({ ...e })),
          );
        }
        return st as { catalogs: Catalogs };
      },
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
