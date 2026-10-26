# UPS Sizer

Application web gratuite, sans compte et sans serveur, de **pré-dimensionnement d'onduleurs (UPS)
d'intérieur** : puissance, batteries, implantation dans le local, schéma unifilaire, note de calcul,
nomenclature et rapport PDF.

> **Pré-dimensionnement indicatif – à valider par un bureau d'études avant installation.**
> Les catalogues fournis sont des **EXEMPLES** inspirés de fiches techniques publiques, à remplacer.

## Démarrer

```bash
npm install
npm run dev          # serveur de développement
npm test             # tests unitaires (Vitest)
npm run lint         # ESLint
npm run build        # build statique dans dist/
npm run build:single # un seul fichier HTML dans dist-single/
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture validée
- [`docs/CAHIER-DES-CHARGES.md`](docs/CAHIER-DES-CHARGES.md) — cahier des charges d'origine
- [`docs/PASSATION.md`](docs/PASSATION.md) — décisions qui priment sur le cahier des charges
- [`docs/HYPOTHESES.md`](docs/HYPOTHESES.md) — hypothèses et valeurs retenues faute de donnée fournie
