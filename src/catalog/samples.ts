/**
 * Catalogues d'EXEMPLE (fiches arrondies inspirées de données publiques, marquées « EXEMPLE »).
 * Ils ne sont plus livrés dans l'application : ils servent aux tests du moteur, qui ont besoin d'une
 * gamme couvrant toutes les technologies et toutes les puissances (jusqu'à 1 600 kVA en parallèle).
 */
import batteriesJson from './batteries.json';
import equipmentJson from './equipment.json';
import {
  batteryCatalogSchema,
  equipmentLibrarySchema,
  upsCatalogSchema,
  type Catalogs,
} from './schemas';
import upsJson from './ups.json';

export const SAMPLE_CATALOGS: Catalogs = {
  ups: upsCatalogSchema.parse(upsJson),
  batteries: batteryCatalogSchema.parse(batteriesJson),
  equipment: equipmentLibrarySchema.parse(equipmentJson),
};
