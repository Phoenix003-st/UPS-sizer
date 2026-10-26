# Catalogues de marque

Cette édition de l'application (**Édition InfoSec + concurrents**) propose les UPS des catalogues
INFOSEC, APC et Eaton, chacun avec sa **référence produit** (code article). La sélection choisit
parmi toutes les marques ; l'écran Solutions permet de ne proposer qu'une marque et affiche le
tableau des **équivalents par marque** (meilleure option de chaque marque pour le même besoin).
Aucun prix n'est saisi : à défaut, le critère « prix » du score utilise la puissance installée, sans
préférence de marque.

Les fiches sont générées par `scripts/brand-catalogs/build.ts` à partir des relevés de
`scripts/brand-catalogs/infosec.ts`, `apc.ts` et `eaton.ts` (`npm run catalogs:brands`) et écrites
dans `src/catalog/brands/`.

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

## APC (22 fiches)

Source : **catalogue de distributeur SabMatic** (fichier `APC-Catalogue.pdf`, pages scannées), qui
présente d'anciennes gammes APC. Le site https://www.se.com/africa/fr/brands/apc/ ne donne que des
liens de navigation, sans caractéristiques exploitables.

- Smart-UPS SUA750I à SUA3000I (batteries publiées : 2 × 12 V 7 Ah … 4 × 12 V 17 Ah).
- Smart-UPS SUA750RMI2U à SUA3000RMI2U (batteries estimées d'après l'autonomie à mi-charge).
- Smart-UPS RT SURT1000XLI à SURT10000XLI (tension batterie publiée, capacité des blocs estimée) et
  modules SURT48XLBP / SURT192XLBP.
- Smart-UPS VT SUVTP10KH à SUVTP40KH (tri/tri, ± 192 V).

Non repris faute de données : Back-UPS, SUA XL / UXI, SURT15KUXI / SURT20KUXI, Symmetra LX et PX,
Galaxy (références seules). Les pages « Online C / 3C3EX », « PG Inverter » du même PDF ne sont pas
des produits APC. Le catalogue imprime « 2000VA/1980W » pour le SUA2200RMI2U.

## Eaton (68 fiches)

Source : **Eaton Backup and Power Protection Products 2022–2023, Australie / Nouvelle-Zélande**
(modèles ANZ : prises AU, sortie 240 V fixe sur les 5S et 5SX, exclus si le projet est en 230 V).

- 5S, 5SC, 5P (tour et rack), 5SX, 5PX Gen 2 (line interactive) et leurs EBM.
- 9E, 9SX, 9PX 1–3 kVA et 5–11 kVA (double conversion) et leurs EBM (9EEBM72, 9PXEBM48RT2U,
  9PXEBM72RT2U / RT3U, 9PXEBM240).
- 93PS, 93E, 9395P (tri/tri, sans référence produit publiée) et 93PR modulaire (châssis 75 kW
  9016-9295 et 200 kW 9106-42218-00P, UPM 25 kW 730-80492-00P).

Non repris : 3S, 5E, versions lithium, 9SX 15/20 kVA, 93PM (dimensions absentes), 93PR 300–1200 kW,
gammes marine et industrielles.
