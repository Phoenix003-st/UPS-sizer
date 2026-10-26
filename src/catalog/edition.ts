/**
 * Édition de l'application : chaque branche livre son propre jeu de catalogues de marque.
 * L'identifiant sert aussi de clé de sauvegarde des catalogues dans le navigateur, pour qu'une
 * édition ne reprenne pas les catalogues enregistrés par une autre.
 */
export const EDITION = { id: 'infosec-concurrents', labelKey: 'app.edition' } as const;
