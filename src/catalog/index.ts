/** Catalogues d'exemple livrés avec l'application, validés au chargement. */
import batteriesJson from './batteries.json';
import equipmentJson from './equipment.json';
import {
  batteryCatalogSchema,
  equipmentLibrarySchema,
  upsCatalogSchema,
  type Catalogs,
} from './schemas';
import upsJson from './ups.json';

export const DEFAULT_CATALOGS: Catalogs = {
  ups: upsCatalogSchema.parse(upsJson),
  batteries: batteryCatalogSchema.parse(batteriesJson),
  equipment: equipmentLibrarySchema.parse(equipmentJson),
};

export function defaultCatalogs(): Catalogs {
  return structuredClone(DEFAULT_CATALOGS);
}
