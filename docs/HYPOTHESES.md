# Hypothèses retenues

> Données et choix techniques pris faute de donnée fournie. Tout ce qui est marqué _(Paramètres)_
> se modifie dans l'écran Paramètres (fichier `src/settings/defaults.json`) ; ce qui est marqué
> _(Catalogue)_ se modifie dans l'éditeur de catalogue ou par import JSON, sans toucher au code.

## 1. Catalogues d'exemple _(Catalogue)_

- **Toutes les fiches sont des EXEMPLES** (`"sample": true`, références « EXEMPLE … »). Les valeurs
  sont _inspirées_ de fiches publiques APC by Schneider Electric, Eaton, Infosec, CSB, Yuasa, Fiamm et
  Leoch, puis **arrondies** ; ce ne sont pas des données constructeur. Le champ `source` de chaque
  fiche cite la gamme publique utilisée. Faute d'accès réseau aux PDF constructeurs depuis
  l'environnement de développement, les URL pointent le plus souvent vers le site du fabricant : à
  vérifier.
- Valeurs effectivement relevées sur des fiches publiques (via moteur de recherche) :
  - CSB HR1234W : 688 / 324 / 206 / 119 / 50 W par bloc à 2 / 8 / 15 / 30 / 90 min (1,67 V/él.),
    633 / 312 / 202 / 117 / 49,8 W à 1,75 V/él. ;
  - APC SRT3000XLI : 3 kVA / 2,7 kW, 31,3 kg, 4 min à pleine charge ;
  - Eaton 9SX 6000i : 6 kVA / 5,4 kW, 65,5 kg, 20 × 12 V 7 Ah, 94 % en online, 98 % en éco ;
  - Eaton 93PM : 30–200 kW, 97 % en double conversion, < 60 dBA (30–50 kW), < 65 dBA (80–200 kW),
    560 × 914 × 1 876 mm pour 30–60 kW ;
  - Infosec E3 Pro RT 1 kVA / 0,9 kW : 438 × 310 × 88 mm, 12,7 kg ; 2 kVA / 1,8 kW : 438 × 410 × 88 mm,
    19 kg ; E3 Performance RT 3 kVA (line interactive) : 2,7 kW, 29,3 kg, profondeur 630 mm.
- **Tables de décharge VRLA** : une seule forme de courbe, relevée sur la fiche CSB HR1234W
  (points 2, 8, 15, 30 et 90 min), interpolée en log-log entre les points et extrapolée au-delà de
  90 min (pente ≈ −0,9). Chaque bloc est mis à l'échelle de sa puissance à 15 min (W/élément),
  approchée d'après les fiches haute décharge publiques. Table 1,70 V = moyenne de 1,67 et 1,75 V.
- **Blocs lithium LFP** : 12,8 V (4 éléments), considérés compatibles « classe 12 V » (tolérance
  ±10 % sur la tension nominale du bloc). Énergie utile 95 %, puissance limitée par le courant
  maximal du BMS (6C pour le 50 Ah, 3C pour le 100 Ah), une seule table à 2,8 V/élément.
- **« Online Performance »** est interprété comme une double conversion d'entrée de gamme
  (rendement plus faible, format tour), inspirée de l'APC Easy UPS On-Line SRV et de l'Eaton 9E.
- Armoires batteries S / M / L et modules batteries externes (EBM) : dimensions et capacités en
  blocs estimées.
- Les catalogues se régénèrent avec `npm run catalogs:generate` (script
  `scripts/generate-sample-catalogs.mjs`) ; une fois remplacés par les vraies fiches, ce script ne
  sert plus.

## 2. Puissance _(Paramètres)_

- Marge d'extension 20 %, taux de charge cible 80 %, FP de sortie 1,0 par défaut (0,9 au choix).
- En mode rapide en kVA, la puissance active vaut kVA × FP de sortie. En mode assisté, la
  puissance apparente retenue est la plus forte entre P_req ÷ FP de sortie et Σ W ÷ FP de chaque
  équipement.
- **Bascule triphasée** : le seuil de 10 kVA s'applique à la puissance d'UPS nécessaire,
  S_req ÷ taux de charge cible (sinon une charge de 9 kVA imposerait deux UPS monophasés de 10 kVA
  en parallèle).
- Tension de calcul : 230 V phase-neutre en monophasé, 400 V entre phases en triphasé.
- Altitude : table de déclassement 1 000 m → 1,00 ; 1 500 → 0,95 ; 2 000 → 0,91 ; 2 500 → 0,86 ;
  3 000 → 0,82 (valeurs usuelles des fiches constructeur, IEC 62040-3), interpolation linéaire.

## 3. Sélection et options

- Une seule unité par système est privilégiée dès qu'un modèle le permet ; sinon mise en parallèle.
- Bureau ou local partagé : formats tour / rack privilégiés (armoires écartées si un format compact
  convient). Baie existante : formats rack et tour/rack uniquement.
- **Indice de prix** (à défaut de prix catalogue, champ `priceIndex` facultatif) : kVA installés ×
  coefficient de technologie (Line Interactive 1 ; Online Performance 1,2 ; Online DC 1,5 ;
  modulaire 1,6 par kVA de module + châssis 0,3 par kVA de capacité) + kWh de batteries × 0,5
  (VRLA) ou × 1,5 (lithium). C'est un ordre de grandeur relatif, pas un prix.
- **Recommandée** : meilleur score pondéré (rendement 0,3 ; emprise 0,2 ; marge 0,3 ; prix 0,2).
  La marge est saturée au taux de charge idéal de 50 % : surdimensionner davantage n'apporte plus
  de point. **Économique** : la moins chère, affichée seulement si elle coûte moins que la
  Recommandée. **Performance** : meilleur rendement, plus grande marge, technologie la plus robuste
  et batterie lithium si disponible, affichée seulement si elle fait mieux que la Recommandée.
- Les options plus de 2 fois plus puissantes que la plus petite possible sont écartées.
- Une option bloquante (rouge) n'est retenue que s'il n'existe aucune alternative.

## 4. Batteries _(Paramètres)_

- VRLA AGM 12 V par défaut ; lithium LFP proposé dans les options (souvent en Performance).
- Fin de décharge 1,75 V/élément ; 1,67 V/élément si l'autonomie demandée est < 15 min.
- Facteurs : vieillissement 1,25 (VRLA) et **1,10 (lithium, hypothèse)**, marge de conception 1,10,
  correction de température selon la table du bloc, sans crédit au-dessus de 25 °C.
- La batterie est dimensionnée pour la **charge de dimensionnement** (avec marge d'extension) ;
  l'autonomie « batteries neuves » est aussi affichée, à la charge réelle et sans facteurs.
- **Nombre maximal de chaînes porté à 8** (au lieu de 4 dans l'architecture) : au-delà de
  ~500 kVA avec 10 min d'autonomie, 4 chaînes de blocs 12 V ne suffisent pas.
- Choix : énergie installée minimale, puis moins d'armoires, puis moins de chaînes.
- UPS à batteries internes : internes seules, puis ajout de modules externes du même bloc.
- Jeux de batteries : un par unité en parallèle (batterie séparée), dimensionné pour P_req ÷ N
  (une unité en panne) ; un par système si la batterie est commune ; un par châssis modulaire.
  En 2N, chaque système a sa propre batterie dimensionnée pour 100 % de la charge.
- Rendement de recharge 0,85, tension de floating 2,27 V/élément (VRLA), U_nominale × 1,08 (LFP).

## 5. Électrique _(Paramètres)_

- Calibres sur la puissance assignée de l'unité (pas sur la charge), série normalisée IEC.
- Entrée redresseur à pleine charge + recharge batterie au courant maximal, FP d'entrée 0,99.
- Câbles : cuivre PR/XLPE, méthode E, 30 °C, IEC 60364-5-52 tableau B.52.12 ; facteur de
  groupement 0,8 ; mise en parallèle autorisée à partir de 50 mm², 8 câbles au plus.
- Chute de tension : ρ = 0,0225 Ω·mm²/m, λ = 0,08 mΩ/m ; 3 % en AC, 1 % en DC.
- Longueurs par défaut : entrée 20 m, bypass 20 m, sortie 20 m, batterie 5 m.
- Tableau ondulé : 4 départs, courant de sortie du système réparti également.
- Groupe électrogène : 1,5 × la puissance des UPS.

## 6. Local, thermique, ventilation _(Paramètres)_

- Charge au sol par défaut 500 kg/m². Si la charge admissible est **inconnue**, un dépassement est
  signalé en orange (à vérifier) ; si elle est saisie, il est bloquant (rouge). La charge
  concentrée (masse ÷ emprise) n'est contrôlée que pour les équipements de plus de 150 kg.
- Porte : min(L, P) + 50 mm ≤ largeur de porte, H ≤ hauteur de porte (transport debout).
- Valeurs par défaut du local selon le type d'installation (ex. data center 10 × 6 m, porte double
  1 400 × 2 200 mm, faux plancher). Elles se modifient à l'étape Local.
- Thermique : pertes de l'UPS et de recharge seulement ; sans climatisation, alerte au-delà de
  500 W.
- Ventilation IEC 62485-2 : courant de gaz 1 mA/Ah (VRLA en floating) ; section libre
  A = 28 × Q cm² ; sans objet pour le lithium.
- Bureau / local partagé : alerte de bruit au-delà de 55 dB(A).

## 7. Interface et livrables

- Vue 3D (three.js, chargée à la demande) : apparence générique et neutre des équipements
  (armoire anthracite, écran, ouïes, voyants), à l'échelle des dimensions du catalogue. Les
  modules d'un châssis sont répartis en colonnes d'environ 0,5 m ; les blocs batteries sont rangés
  sur des étagères dans l'orientation qui en loge le plus (marges de 4 cm, pas de 5 cm entre
  étagères) — c'est une illustration, pas le plan de montage du fabricant.
- Hors baie, un équipement au format rack (UPS tour/rack, module batteries 19") est représenté
  debout, en tour, dans l'emprise prévue au plan. Avec « baie existante », il est empilé dans une
  baie 42U de 600 × 1 000 × 2 000 mm.
- Le rapport PDF contient deux rendus 3D (extérieur, intérieur) si l'appareil dispose de WebGL.
- Tension : le choix 230 V / 400 V est la tension du réseau ; en triphasé on calcule avec 400 V
  entre phases, en monophasé avec 230 V phase-neutre (220 ↔ 380, 240 ↔ 415).
- Plan : 1 unité SVG = 1 mm, pas de déplacement de 50 mm à la souris, 100 mm (10 mm avec Maj) au
  clavier. Placement automatique dos au mur le plus long ; la porte est sur le mur du bas à
  300 mm du coin par défaut (modifiable à l'étape Local).
- Schéma unifilaire : au-delà de 3 unités en parallèle, les suivantes sont résumées (« … × n ») ;
  4 départs par défaut sur le tableau ondulé.
- Rapport PDF : police DejaVu Sans embarquée (symboles η, √, ≤ et écriture arabe). Plan et
  schéma vectoriels. Le rapport est produit dans la langue de l'interface.
- PDF en arabe : colonnes des tableaux en miroir ; dans les phrases mêlant arabe et latin, le
  placement de certains signes (parenthèses) peut être imparfait (algorithme bidirectionnel
  simplifié de jsPDF).
- Arabe : chiffres latins (usage technique, cohérent avec les formules) ; les plans et schémas
  restent orientés de gauche à droite.
- CSV : séparateur « ; », UTF-8 avec BOM, virgule décimale en français (ouverture directe dans
  Excel FR). Excel : colonne prix à saisir, totaux en formule.

## 8. Outillage

- Versions figées : React 18.3, TypeScript 5.9 (strict), Vite 7, Vitest 3, ESLint 9, Tailwind CSS 4.
