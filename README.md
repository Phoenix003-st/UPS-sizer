# UPS Sizer

Application web gratuite, **sans compte et sans serveur**, de **pré-dimensionnement d'onduleurs (UPS)
d'intérieur**. On choisit un type d'installation et une puissance ; l'application propose jusqu'à
trois solutions (Économique, Recommandée, Performance) avec leurs batteries, montre la place occupée
dans le local et produit le plan, le schéma unifilaire, la note de calcul, la nomenclature et un
rapport PDF.

> **Pré-dimensionnement indicatif – à valider par un bureau d'études avant installation.**
> Les catalogues fournis sont des **EXEMPLES** inspirés de fiches techniques publiques, à remplacer.

## Utiliser l'application

- **En ligne** : le site GitHub Pages du dépôt (déployé à chaque push sur `main`).
- **Hors ligne** : une fois le site ouvert, il reste utilisable sans réseau (PWA, installable).
- **Fichier unique** : `ups-sizer.html` (publié avec le site, ou `npm run build:single`) s'ouvre
  directement dans un navigateur et peut être envoyé par e-mail.

Langues : français, anglais et arabe (mise en page de droite à gauche). Les projets sont sauvegardés
dans le navigateur (IndexedDB) et s'exportent / s'importent en `.ups.json`.

## Fonctionnalités

| Étape      | Contenu                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Type       | 7 cartes (CCTV, bureautique, serveurs, data center, aéroport, bâtiment, personnalisé) avec valeurs par défaut |
| Puissance  | saisie rapide (kW / kVA, curseur) ou bibliothèque d'équipements ; autonomie ; options avancées repliées       |
| Local      | dimensions, porte, sol, température, humidité, altitude, climatisation, faux plancher ; alertes en direct     |
| Solutions  | jusqu'à 3 options, alertes vert / orange / rouge, « Voir le calcul », mini-vue du local                       |
| Livrables  | plan déplaçable à l'échelle, unifilaire IEC, note de calcul, nomenclature Excel / CSV, rapport PDF vectoriel  |
| Paramètres | toutes les hypothèses de calcul, retour aux valeurs par défaut                                                |
| Catalogues | édition des fiches (JSON validé), import / export, retour aux exemples                                        |

## Remplacer les catalogues d'exemple

Écran **Catalogues** → onglet UPS, Blocs batteries, Armoires ou Équipements → **Importer un JSON**
(format identique à l'export). Chaque fiche est vérifiée ; une erreur indique le champ fautif
(ex. `models.3.power.kW`). Aucune modification du code n'est nécessaire. Les formats sont décrits
dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (§ 4) et dans `src/catalog/schemas.ts`.

## Rebrander

- Couleurs : variables CSS en tête de `src/ui/theme.css`.
- Logo : `src/ui/logo.svg` (application, favicon et rapport PDF) ; icônes PWA dans `public/icons/`.

## Développer

```bash
npm install
npm run dev          # serveur de développement
npm test             # tests unitaires (Vitest)
npm run coverage     # tests + couverture du moteur (seuil 90 %)
npm run lint         # ESLint
npm run typecheck    # TypeScript strict
npm run build        # site statique + PWA dans dist/
npm run build:single # un seul fichier HTML dans dist-single/
npm run demo         # options calculées pour chaque scénario, en console
```

Organisation : `src/engine/` (moteur de calcul pur, testé), `src/catalog/` (catalogues et schémas),
`src/settings/` (paramètres), `src/state/` (stores et sauvegarde), `src/features/` (écrans et
livrables), `src/ui/` (composants, thème), `src/i18n/` (traductions).

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` lance lint, types, tests et build à chaque push, et
déploie sur GitHub Pages depuis `main`. À activer une fois : **Settings → Pages → Source : GitHub
Actions**.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture validée
- [`docs/CAHIER-DES-CHARGES.md`](docs/CAHIER-DES-CHARGES.md) — cahier des charges d'origine
- [`docs/PASSATION.md`](docs/PASSATION.md) — décisions qui priment sur le cahier des charges
- [`docs/HYPOTHESES.md`](docs/HYPOTHESES.md) — hypothèses et valeurs retenues faute de donnée fournie
