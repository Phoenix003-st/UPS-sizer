/**
 * Catalogues livrés avec l'application, validés au chargement.
 *
 * Site principal : UPS génériques, sans marque ni référence produit (generic.json, généré par
 * `npm run catalogs:generic`). Les éditions /infosec/ et /concurrents/ livrent les catalogues de
 * marque.
 */
import batteriesJson from './batteries.json';
import equipmentJson from './equipment.json';
import genericJson from './generic.json';
import {
  batteryCatalogSchema,
  equipmentLibrarySchema,
  upsCatalogSchema,
  type Catalogs,
} from './schemas';

/** Sans la source des fiches génériques, qui cite les fiches constructeur ayant servi de modèle. */
const withoutSource = <T extends { source?: unknown }>({ source: _source, ...rest }: T) => rest;
const genericBatteries = batteryCatalogSchema.parse(batteriesJson);

export const DEFAULT_CATALOGS: Catalogs = {
  ups: upsCatalogSchema.parse({ meta: genericJson.meta, models: genericJson.models }),
  batteries: batteryCatalogSchema.parse({
    meta: genericBatteries.meta,
    blocks: genericBatteries.blocks.map(withoutSource),
    // Armoires génériques, puis modules batteries génériques des UPS (sans doublon d'identifiant).
    cabinets: [
      ...genericBatteries.cabinets.map(withoutSource),
      ...genericJson.cabinets.filter((c) => !genericBatteries.cabinets.some((o) => o.id === c.id)),
    ],
  }),
  equipment: equipmentLibrarySchema.parse(equipmentJson),
};

/** Marques présentes dans le catalogue UPS livré (aucune sur le site principal). */
export const DEFAULT_BRANDS: string[] = [
  ...new Set(DEFAULT_CATALOGS.ups.models.map((m) => m.brand).filter(Boolean)),
];

export function defaultCatalogs(): Catalogs {
  return structuredClone(DEFAULT_CATALOGS);
}
