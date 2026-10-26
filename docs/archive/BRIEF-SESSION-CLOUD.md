# Brief à coller dans la session cloud

Contexte : application web de pré-dimensionnement d'onduleurs (UPS) d'intérieur.
Le cahier des charges complet est le prompt d'origine (à coller aussi). L'architecture
proposée est dans `ARCHITECTURE.md` (à déposer dans le dépôt).

## Décisions déjà prises
- Architecture `ARCHITECTURE.md` : validée comme base de travail.
- **Identité neutre, sans aucune marque** pour l'instant (pas de logo ni de couleurs Infosec).
  Nom générique, palette sobre, mention « Pré-dimensionnement indicatif – à valider par un
  bureau d'études avant installation » sur chaque livrable.
- **Catalogues d'exemple** : s'inspirer des fiches techniques publiques Infosec, APC et Eaton
  (puissances, dimensions, poids, rendements, nombre de blocs batteries, modules), mais avec
  des **noms de modèles génériques**. Chaque fiche garde `"sample": true` et un champ
  `source` qui cite la fiche publique utilisée.
- **Accès pour tout le monde** : application gratuite, sans compte, sans serveur, qui
  s'ouvre par un simple lien (site statique ou page unique) et fonctionne sur PC, tablette
  et mobile. Viser aussi l'accessibilité (contraste, clavier, lecteurs d'écran).
- Stack : React + TypeScript + Vite, Vitest pour tous les calculs, build en fichier unique
  possible.

## Ordre de travail
a. Moteur de calcul + catalogues d'exemple + tests unitaires
b. Parcours utilisateur (FR/EN, puis AR en RTL)
c. Plan d'implantation et schéma unifilaire SVG
d. Exports PDF et Excel/CSV, puis publication en ligne
