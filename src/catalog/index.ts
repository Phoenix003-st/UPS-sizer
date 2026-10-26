/**
 * Catalogues livrés avec l'application, validés au chargement.
 *
 * Édition InfoSec + concurrents : UPS des catalogues INFOSEC, APC et Eaton (références produit des
 * constructeurs) ; la sélection choisit parmi toutes les marques. Les batteries (blocs et armoires)
 * restent génériques : les catalogues ne les détaillent pas.
 */
import batteriesJson from './batteries.json';
import apcJson from './brands/apc.json';
import eatonJson from './brands/eaton.json';
import infosecJson from './brands/infosec.json';
import equipmentJson from './equipment.json';
import {
  batteryCatalogSchema,
  equipmentLibrarySchema,
  upsCatalogSchema,
  type Catalogs,
} from './schemas';

/** Catalogues de marque inclus dans cette édition de l'application. */
interface BrandCatalogJson {
  meta: { catalogVersion: string };
  models: unknown[];
  cabinets: { id: string }[];
}
const BRAND_CATALOGS: BrandCatalogJson[] = [infosecJson, apcJson, eatonJson];

const genericBatteries = batteryCatalogSchema.parse(batteriesJson);

export const DEFAULT_CATALOGS: Catalogs = {
  ups: upsCatalogSchema.parse({
    meta: {
      ...BRAND_CATALOGS[0]!.meta,
      catalogVersion: BRAND_CATALOGS.map((b) => b.meta.catalogVersion).join('+'),
    },
    models: BRAND_CATALOGS.flatMap((b) => b.models),
  }),
  batteries: batteryCatalogSchema.parse({
    meta: genericBatteries.meta,
    blocks: genericBatteries.blocks,
    // Armoires génériques, puis modules batteries des marques (sans doublon d'identifiant).
    cabinets: [
      ...genericBatteries.cabinets,
      ...BRAND_CATALOGS.flatMap((b) => b.cabinets).filter(
        (c, i, all) => all.findIndex((o) => o.id === c.id) === i,
      ),
    ],
  }),
  equipment: equipmentLibrarySchema.parse(equipmentJson),
};

/** Marques présentes dans le catalogue UPS livré, dans l'ordre d'apparition. */
export const DEFAULT_BRANDS: string[] = [
  ...new Set(DEFAULT_CATALOGS.ups.models.map((m) => m.brand).filter(Boolean)),
];

export function defaultCatalogs(): Catalogs {
  return structuredClone(DEFAULT_CATALOGS);
}
