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
- **Fiches produit INFOSEC** (fournies le 2026-10-30), prioritaires sur le catalogue pour leurs
  gammes ; `source.model` les cite alors (« Fiche produit … ») :
  - E3 Pro 1000 à 10k VA (2019) : masses, profondeur du 3000 RT (638 mm), rendements secteur /
    batterie / ECO, courant de charge, bruit, modules batteries 67402 (et 67403), 67406, 67409,
    67187, 67189 avec dimensions et masse à vide ; les 5 / 6 / 10k RT pèsent onduleur + pack batteries.
  - E3 Performance RT 800 à 5000 VA (2019) : masses, profondeur des 800 / 1100 (425 mm), tension
    batterie (24 / 48 / 72 V d'après la tension de charge), rendements batterie et ECO, chargeur
    1,5 A, bruit 45 dB, dimensions et masse des modules batteries.
  - M5T 10k à 200 kVA (07/2021) : masses sans batteries, rendements, courant de charge, bruit,
    parallèle (4 jusqu'à 40 kVA, 6 au-delà, y compris le 60 kVA). De 10 à 40 kVA, référence
    standard (batteries internes) et référence WOB (sans batteries, celle qui est modélisée).
  - M6Ti / M6Ti S / M6Ti TX (2026) : l'ancien « M6Ti » du catalogue est le **M6Ti S** (60 à
    400 kVA, ajout des 160, 320 et 400 kVA) ; ajout du **M6Ti SB** 60 à 160 kVA (version sans
    batteries du M6Ti à batteries internes) ; M6Ti TX 80K = **69314** ; masses, dimensions,
    rendements, courant de charge, batteries ±192 V ou ±240 V (32 ou 40 blocs), bruit 75 dB.
  - Mod5T & Mod5T E (2026) : une fiche par armoire et taille de module (Mod5T E 15U 3 × 20 / 30 kVA,
    Mod5T 30U 6 × 20, 6 × 30, 3 × 60, Mod5T 42U 10 × 30, 10 × 50, 5 × 60, 10 × 60), masse de
    l'armoire vide et des modules, courant de charge par module, batteries 240 V (40 blocs).

## Gammes reprises (117 fiches)

| Technologie                | Gammes                                                                            |
| -------------------------- | --------------------------------------------------------------------------------- |
| Line Interactive           | X1+ (IEC et FR/Schuko), X3 EX LCD USB, X4 RM Plus                                 |
| On Line Performance        | E2 LCD, E3 Evo, E3 Performance RT                                                 |
| Double conversion mono     | E3 Pro, E7 One RT, E4 Value, E4 Pro One, Mod3 C 10k TM/TT                         |
| Double conversion tri/mono | E4 LCD Pro TM, Mod3 C /10 TM                                                      |
| Double conversion tri/tri  | M5T (10–200 kVA), M6Ti S (60–400 kVA), M6Ti SB (60–160 kVA), M6Ti TX (60–200 kVA) |
| Modulaire                  | Mod3 C /10 TT (4 × 10 kVA), Mod5T E 15U, Mod5T 30U et 42U                         |

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
- **Modules batteries E3 Performance / E3 Pro** : références et dimensions réelles, contenu en
  batteries estimé. Pour les autres gammes « extension d'autonomie possible », module générique.
- **Armoires batteries M6Ti (BMDIY 67566…67578) et Mod5T (67712…67721)** : publiées mais non
  modélisées ; armoires génériques.

## Points à vérifier dans le catalogue

- ~~**67314** imprimé pour l'E3 Pro 1000 RM et le M6Ti TX 80K~~ : la fiche M6Ti TX donne **69314**.
- Fiche Mod5T E : profondeur de l'armoire 15U imprimée « 111 mm » (1100 mm retenus).
- ~~E4 Value + 10k : 67657 ou 67321~~ : 67321 est l'E3 Pro 10k RT (fiche E3 Pro), **67657** retenu.
- ~~M5T 120K : 67665 ou 67765~~ : la fiche M5T confirme **67665**.
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
