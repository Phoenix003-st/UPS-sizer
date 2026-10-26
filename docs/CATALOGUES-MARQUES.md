# Catalogues de marque

Cette édition de l'application (**Édition InfoSec**) ne propose que des UPS du catalogue INFOSEC,
avec leur **référence produit** (code article). Les fiches sont générées par
`scripts/brand-catalogs/build.ts` à partir des relevés de `scripts/brand-catalogs/infosec.ts`
(`npm run catalogs:brands`) et écrites dans `src/catalog/brands/infosec.json`.

## Source

- **INFOSEC UPS SYSTEM — Electrical Protection Catalog 2025** (fichier `Catalogue_2026_INFOSEC.pdf`),
  pages 17 à 33. Chaque fiche indique sa page dans `source.model`.

## Gammes reprises (103 fiches)

| Technologie                | Gammes                                                        |
| -------------------------- | ------------------------------------------------------------- |
| Line Interactive           | X1+ (IEC et FR/Schuko), X3 EX LCD USB, X4 RM Plus             |
| On Line Performance        | E2 LCD, E3 Evo, E3 Performance RT                             |
| Double conversion mono     | E3 Pro, E7 One RT, E4 Value, E4 Pro One, Mod3 C 10k TM/TT     |
| Double conversion tri/mono | E4 LCD Pro TM, Mod3 C /10 TM                                  |
| Double conversion tri/tri  | M5T (10–200 kVA), M6Ti (60–300 kVA), M6Ti TX (60–200 kVA)     |
| Modulaire                  | Mod3 C /10 TT (4 × 10 kVA), Mod5T E S 29U, Mod5T S 30U et 42U |

Non reprises : gammes High Frequency domestiques (Z1 ZenCube EX, Z2 EX, Z3 ZenBox EX, Zen Live,
Zen-X Master), M5T HD (ascenseurs à récupération d'énergie), G1 / G1 Solar MPPT, accessoires.

## Ce que le catalogue ne publie pas (valeurs estimées)

Le catalogue donne la référence, la puissance (VA / W), la technologie, les dimensions, les tensions
et l'autonomie à 50 % / 70 % de charge. Le reste est estimé et listé dans le champ `estimated` de
chaque fiche ; l'écran Solutions l'affiche sous la référence.

- **Masse** : valeur type selon la technologie et la puissance.
- **Rendement** : courbe type selon la technologie.
- **Batteries internes** : combinaison de blocs génériques 12 V (7, 9, 12, 17 ou 18 Ah) dont
  l'autonomie calculée à 50 % de charge est la plus proche de celle du catalogue. La tension batterie
  est celle du chargeur Smart Charger quand elle est connue (E3 Pro 1k / 2k / 3k : 24 / 48 / 72 V).
- **Courant de charge, armoires batteries** : armoires génériques pour le triphasé et les modulaires.
- **Modules batteries E3 Performance** : références réelles (67401, 67402, 67405, 67406, 67408,
  67409), contenu estimé. Pour les autres gammes « extension d'autonomie possible », module générique.
- **Mod5T** : taille et nombre de modules choisis parmi 20 / 30 / 50 / 60 kVA pour atteindre la
  puissance maximale publiée de chaque châssis.

## Points à vérifier dans le catalogue

- **67314** est imprimé pour l'E3 Pro 1000 RM (p. 23) **et** pour le M6Ti TX 80K (p. 31).
- E4 Value + 10k : **67657** sur la page produit, **67321** dans le guide de sélection (p. 9).
- M5T 120K : **67665** sur la page produit, **67765** dans le guide de sélection.
- Châssis Mod5T et baies Mod3 C : pas de référence lisible sans ambiguïté (à compléter).
- M5T 10–60 kVA : batteries internes non modélisées (armoires externes retenues).
