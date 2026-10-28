# UPS Sizer — Architecture (v0.1, validée)

> Statut : **validée**. Identité neutre (voir A.1).
> Toute donnée produit est fictive et marquée `"sample": true` / « EXEMPLE – à remplacer ».

---

## 1. Vue d'ensemble

```
┌──────────────────────────── Navigateur (aucun serveur) ────────────────────────────┐
│                                                                                     │
│  UI React (écrans, i18n FR/EN/AR-RTL)                                               │
│     │  lit / écrit                                                                  │
│     ▼                                                                               │
│  Stores (Zustand) : projet courant · paramètres · catalogues  ── persistance ──►   │
│     │                                                IndexedDB (projets, catalogues)│
│     │  runSizing(projet, catalogues, paramètres)                                    │
│     ▼                                                                               │
│  MOTEUR DE CALCUL (TypeScript pur, sans React, 100 % testé)                         │
│     puissance → sélection UPS → batteries → électrique → thermique → implantation  │
│     → alertes → nomenclature      (chaque fonction renvoie valeur + trace)          │
│     │                                                                               │
│     ▼                                                                               │
│  LIVRABLES : plan SVG · unifilaire SVG · note de calcul · BOM (xlsx/csv) · PDF      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Principe clé : **le moteur est une fonction pure**. Même entrée → même sortie. L'interface ne fait
aucun calcul ; elle affiche le résultat et ses traces (« Voir le calcul »).

---

## 2. Stack technique

| Besoin                    | Choix                                                         | Pourquoi                                                                                |
| ------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Framework                 | React 18 + TypeScript (strict) + Vite                         | Demandé ; build statique, déployable sur n'importe quel hébergement ou en fichier local |
| État + sauvegarde locale  | Zustand + `persist` vers IndexedDB (`idb-keyval`)             | Simple ; IndexedDB tient les catalogues volumineux (localStorage limité à ~5 Mo)        |
| Validation des catalogues | Zod                                                           | Un catalogue mal saisi est refusé avec un message clair, ligne par ligne                |
| Styles                    | Tailwind CSS + variables CSS (thème neutre, rebrandable)      | Responsive facile, propriétés logiques (`ms-`/`me-`) pour l'arabe RTL                   |
| Traductions               | i18next (fr, en, ar)                                          | `dir="rtl"` automatique pour l'arabe                                                    |
| Plan + unifilaire         | SVG natif généré en React, glisser-déposer par Pointer Events | Vectoriel, à l'échelle, exportable tel quel dans le PDF                                 |
| PDF                       | jsPDF + svg2pdf.js + jspdf-autotable                          | PDF vectoriel (plan et schéma restent nets), tableaux paginés                           |
| Excel                     | ExcelJS (+ CSV natif)                                         | Mise en forme, colonne prix vide, pas de dépendance serveur                             |
| Tests                     | Vitest (moteur) + Testing Library (quelques composants)       | Couverture visée ≥ 90 % sur `engine/`                                                   |
| Hors-ligne (option)       | vite-plugin-pwa                                               | Utilisable sur chantier sans réseau                                                     |

---

## 3. Écrans

| #   | Écran                     | Contenu                                                                                                                                                                          | Clics typiques                                           |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 0   | **Accueil**               | 11 grandes cartes avec icône (CCTV, Bureautique, Serveurs, Data center, Aéroport, Bâtiment, Médical, Industriel, Réseau d'entreprise, Ascenseur, Personnalisé) + « Mes projets » | 1                                                        |
| 1   | **Puissance & autonomie** | Onglets _Rapide_ (curseur + champ kW/kVA) / _Assisté_ (bibliothèque d'équipements × quantité). Boutons autonomie 10/15/30/60/autre. ▸ _Options avancées_ repliées                | 1–2                                                      |
| 2   | **Local**                 | L × l × H, porte, sol, température, clim, faux plancher, type de local. Valeurs par défaut pré-remplies. Alertes en direct sous chaque champ                                     | 0–1 (« Je ne connais pas » garde les valeurs par défaut) |
| 3   | **Solutions**             | 3 cartes : Économique / **Recommandée** (mise en avant) / Performance. Mini-vue « Place dans le local ». Pastilles vert/orange/rouge                                             | 1 (choisir)                                              |
| 4   | **Livrables**             | Onglets : Plan · Schéma unifilaire · Note de calcul · Nomenclature · Rapport PDF. Boutons « Télécharger tout »                                                                   | 1                                                        |
| —   | **Paramètres**            | Toutes les hypothèses (marges, facteurs batteries, séries de calibres, tables câbles, dégagements par défaut…) avec bouton « Revenir aux valeurs par défaut »                    | —                                                        |
| —   | **Catalogues**            | Tableau éditable UPS / batteries / armoires / bibliothèque d'équipements + import/export JSON, validation Zod                                                                    | —                                                        |
| —   | **Mes projets**           | Liste, dupliquer, supprimer, import/export `.ups.json`                                                                                                                           | —                                                        |

Barre de progression `Type ▸ Puissance ▸ Local ▸ Solution ▸ Livrables` toujours visible, bouton
« Retour » permanent, l'état est sauvegardé à chaque modification (on peut fermer et revenir).

Bandeau permanent sur chaque livrable :
**« Pré-dimensionnement indicatif – à valider par un bureau d'études avant installation »**.

---

## 4. Modèle de données JSON

Unités internes uniques : **mm, kg, W, V, A, min, °C**. Les conversions (m, kW, kVA, BTU/h) ne se
font qu'à l'affichage.

### 4.1 Catalogue UPS — `catalog/ups.json`

```jsonc
{
  "meta": {
    "schemaVersion": 1,
    "catalogVersion": "2026-10-EXEMPLE",
    "sample": true,
    "notice": "EXEMPLE – à remplacer par les fiches Infosec",
  },
  "models": [
    {
      "id": "EX-ODC3-60",
      "sample": true,
      "reference": "EXEMPLE ODC-T 60 kVA",
      "range": "EXEMPLE Gamme Tri",
      "technology": "online_double_conversion", // line_interactive | online_performance | online_double_conversion | modular
      "formFactor": "cabinet", // tower | rack | tower_rack | cabinet
      "rackUnits": null,
      "power": { "kVA": 60, "kW": 60, "pf": 1.0 },
      "phases": { "in": 3, "out": 3 },
      "voltages": { "out": [380, 400, 415], "freqHz": [50, 60] },
      "efficiency": {
        // par mode, et courbe selon le taux de charge
        "online": [
          { "load": 0.25, "eta": 0.945 },
          { "load": 0.5, "eta": 0.955 },
          { "load": 0.75, "eta": 0.96 },
          { "load": 1.0, "eta": 0.955 },
        ],
        "eco": 0.99,
        "battery": 0.95, // rendement onduleur seul (DC→AC)
      },
      "dimensionsMm": { "w": 600, "d": 850, "h": 1600 },
      "weightKg": 180,
      "clearancesMm": { "front": 1000, "rear": 0, "left": 0, "right": 0, "top": 500 },
      "ip": "IP20",
      "ambientC": { "min": 0, "max": 40 },
      "noiseDb": 62,
      "battery": {
        "blockVoltage": 12,
        "blocksPerString": { "allowed": [30, 32, 34, 36, 38, 40], "default": 32 },
        "internal": null, // ou { "blockId": "...", "blocks": 32, "strings": 1 }
        "maxChargeCurrentA": 20,
        "compatibleCabinetIds": ["EX-CAB-L", "EX-CAB-XL"],
        "sharedBattery": false, // batterie commune possible en parallèle
      },
      "heatDissipationW": null, // null = calculée depuis le rendement
      "parallel": { "capable": true, "maxUnits": 4 },
      "modular": null, // voir 4.1 bis
      "datasheetUrl": "",
    },
  ],
}
```

**4.1 bis — bloc `modular`** (technology = `modular`) :

```jsonc
"modular": {
  "moduleKVA": 30, "moduleKW": 30,
  "maxModules": 10,                // par châssis
  "frameMaxKVA": 300,
  "moduleWeightKg": 30,
  "emptyFrameWeightKg": 250,
  "frameParallelMax": 4            // châssis en parallèle
}
```

### 4.2 Catalogue batteries — `catalog/batteries.json`

```jsonc
{
  "meta": { "schemaVersion": 1, "sample": true, "notice": "EXEMPLE – à remplacer" },
  "blocks": [
    {
      "id": "EX-VRLA-12V100",
      "sample": true,
      "reference": "EXEMPLE 12V 100Ah",
      "chemistry": "VRLA_AGM", // VRLA_AGM | VRLA_GEL | LI_LFP
      "nominalV": 12,
      "cells": 6,
      "capacityAh": 100,
      "capacityRate": "C10",
      "dimensionsMm": { "w": 330, "d": 172, "h": 220 },
      "weightKg": 30,
      "designLifeYears": 10,
      "discharge": {
        // TABLE À PUISSANCE CONSTANTE
        "unit": "W_per_cell", // ou W_per_block
        "refTempC": 25,
        "tables": [
          {
            "eodVpc": 1.67,
            "points": [
              { "min": 5, "W": 0 },
              { "min": 10, "W": 0 },
              { "min": 15, "W": 0 },
              { "min": 30, "W": 0 },
              { "min": 60, "W": 0 },
            ],
          },
          { "eodVpc": 1.75, "points": [/* … */] },
        ],
      },
      "tempCorrection": [
        { "tC": 10, "k": 0.88 },
        { "tC": 20, "k": 0.97 },
        { "tC": 25, "k": 1.0 },
      ],
    },
  ],
  "cabinets": [
    {
      "id": "EX-CAB-L",
      "sample": true,
      "reference": "EXEMPLE Armoire batteries L",
      "dimensionsMm": { "w": 800, "d": 850, "h": 1900 },
      "emptyWeightKg": 150,
      "clearancesMm": { "front": 1000, "rear": 0, "left": 0, "right": 0, "top": 300 },
      "capacity": [{ "blockId": "EX-VRLA-12V100", "maxBlocks": 40 }],
      "breakerA": 250,
    },
  ],
}
```

### 4.3 Bibliothèque d'équipements — `catalog/equipment.json`

```jsonc
[
  {
    "id": "ip-camera",
    "category": "cctv",
    "label": { "fr": "Caméra IP", "en": "IP camera", "ar": "كاميرا IP" },
    "defaultW": 10,
    "rangeW": [5, 15],
    "pf": 0.9,
  },
  {
    "id": "nvr",
    "category": "cctv",
    "label": { "fr": "Enregistreur NVR" },
    "defaultW": 60,
    "rangeW": [30, 150],
    "pf": 0.9,
  },
  {
    "id": "poe-switch-24",
    "category": "network",
    "label": { "fr": "Switch PoE 24 ports" },
    "defaultW": 400,
    "rangeW": [100, 740],
    "pf": 0.95,
  },
  { "id": "server-1u", "category": "it", "defaultW": 350 },
  { "id": "server-2u", "category": "it", "defaultW": 600 },
  { "id": "it-rack", "category": "it", "defaultW": 5000, "unit": "kW" },
  { "id": "pc", "category": "office", "defaultW": 150 },
  { "id": "monitor", "category": "office", "defaultW": 30 },
]
```

### 4.4 Paramètres — `settings.json` (tout est modifiable dans l'écran Paramètres)

```jsonc
{
  "power": {
    "growthMargin": 0.2,
    "targetLoadRate": 0.8,
    "defaultPf": 1.0,
    "monoToTriThresholdKVA": 10,
    "altitudeDerating": [
      { "m": 1000, "k": 1.0 },
      { "m": 1500, "k": 0.95 },
      { "m": 2000, "k": 0.91 },
      { "m": 3000, "k": 0.82 },
    ],
  },
  "battery": {
    "agingFactor": 1.25,
    "designMargin": 1.1,
    "defaultEodVpc": 1.75,
    "allowedEodVpc": [1.67, 1.7, 1.75],
    "maxStrings": 4,
    "chargeEfficiency": 0.85,
  },
  "room": {
    "defaultFloorLoadKgM2": 500,
    "doorMarginMm": 50,
    "recommendedTempC": [20, 25],
    "allowedTempC": [0, 40],
    "maxHumidityPct": 95,
    "defaultHeightMm": 2700,
  },
  "electrical": {
    "breakerSeriesA": [
      6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000,
      1250, 1600, 2000, 2500, 3200,
    ],
    "cable": {
      "material": "Cu",
      "insulation": "XLPE",
      "installMethod": "E",
      "ambientC": 30,
      "groupingFactor": 0.8,
    },
    "maxVoltageDropPct": { "ac": 3, "dc": 1 },
    "defaultCableLengthsM": { "input": 20, "bypass": 20, "output": 20, "battery": 5 },
  },
  "selection": { "weights": { "efficiency": 0.3, "footprint": 0.2, "margin": 0.3, "price": 0.2 } },
  "scenarios": {
    "cctv": {
      "autonomyMin": 30,
      "technologies": ["line_interactive", "online_double_conversion"],
      "redundancy": "N",
    },
    "office": {
      "autonomyMin": 10,
      "technologies": ["line_interactive", "online_performance"],
      "redundancy": "N",
    },
    "server": {
      "autonomyMin": 15,
      "technologies": ["online_double_conversion"],
      "redundancy": "N",
    },
    "datacenter": {
      "autonomyMin": 10,
      "technologies": ["online_double_conversion", "modular"],
      "redundancy": "N+1",
    },
    "airport": {
      "autonomyMin": 30,
      "technologies": ["online_double_conversion", "modular"],
      "redundancy": "2N",
    },
    "building": {
      "autonomyMin": 15,
      "technologies": ["online_performance", "online_double_conversion"],
      "redundancy": "N",
    },
    "custom": { "autonomyMin": 15, "technologies": ["*"], "redundancy": "N" },
  },
}
```

### 4.5 Projet — fichier exporté `*.ups.json`

```jsonc
{
  "schemaVersion": 1,
  "id": "uuid",
  "name": "Siège ACME – salle serveurs",
  "client": "",
  "author": "",
  "createdAt": "…",
  "updatedAt": "…",
  "catalogVersion": "2026-10-EXEMPLE", // pour détecter un catalogue modifié depuis
  "scenario": "server",
  "load": {
    "mode": "quick", // quick | assisted
    "value": 40,
    "unit": "kW", // mode rapide
    "items": [{ "libId": "server-2u", "qty": 20, "unitW": 600 }], // mode assisté
    "pf": 0.9,
  },
  "autonomyMin": 15,
  "advanced": {
    "outputPf": 1.0,
    "growthMargin": 0.2,
    "targetLoadRate": 0.8,
    "phases": "auto",
    "voltage": 400,
    "freqHz": 50,
    "redundancy": "N",
    "batteryChemistry": "auto",
    "eodVpc": null,
  },
  "room": {
    "lengthMm": 5000,
    "widthMm": 4000,
    "heightMm": 2700,
    "door": { "widthMm": 900, "heightMm": 2100 },
    "floorLoadKgM2": null,
    "ambientC": 25,
    "humidityPct": 50,
    "altitudeM": 100,
    "hvac": { "present": true, "kW": 10 },
    "raisedFloor": false,
    "kind": "dedicated",
  },
  "installation": { "generator": false, "externalMaintenanceBypass": true, "cableLengthsM": null },
  "choice": { "tier": "recommended", "overrides": {} },
  "layout": { "positions": { "ups-1": { "x": 300, "y": 200, "rot": 0 } } }, // positions glissées à la souris
  "settingsOverrides": {},
}
```

### 4.6 Résultat du moteur (non sauvegardé, recalculé)

```ts
interface SizingResult {
  inputs: NormalizedInputs; // charge kW/kVA, phases, déclassements appliqués
  options: SolutionOption[]; // 0 à 3 : economy | recommended | performance
  globalAlerts: Alert[];
}
interface SolutionOption {
  tier: 'economy' | 'recommended' | 'performance';
  ups: {
    modelId: string;
    units: number;
    modules?: number;
    redundancy: 'N' | 'N+1' | '2N';
    loadRate: number;
  };
  battery: {
    blockId: string;
    chemistry: string;
    blocksPerString: number;
    strings: number;
    location: 'internal' | 'cabinet';
    cabinets: { id: string; qty: number }[];
    eodVpc: number;
    autonomyMin: number;
  };
  electrical: ElectricalResult; // courants, calibres, sections
  thermal: ThermalResult; // W, BTU/h, besoin clim
  layout: LayoutResult; // éléments placés, emprise, surface restante, porte
  bom: BomLine[];
  alerts: Alert[];
  traces: Record<string, CalcTrace>; // pour « Voir le calcul »
}
interface Alert {
  level: 'ok' | 'warn' | 'block';
  code: string;
  params: Record<string, number | string>;
}
// message traduit : t('alert.room_too_small', { missing: 0.6, axis: 'width' })
//  → « Le local est trop petit pour cette configuration. Il manque 0,6 m en largeur. »
interface CalcTrace {
  title: string;
  steps: {
    label: string;
    formula: string;
    substituted: string;
    result: number;
    unit: string;
    ref?: string;
  }[];
}
```

---

## 5. Moteur de calcul — `src/engine/`

Chaque module : fonctions pures, documentées (JSDoc avec formule et référence normative), retour
`{ value, trace }`, fichier de tests associé.

| Module           | Rôle                               | Formules principales                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `load.ts`        | Puissance requise                  | `kW_req = charge × (1 + marge)` ; `kVA_req = kW_req / PF` ; somme bibliothèque `Σ qty × W`                                                                                                                                                                                                                                                                |
| `environment.ts` | Déclassements et plages            | altitude > 1000 m → coefficient (table paramètres) ; contrôles 0–40 °C, HR ≤ 95 %, IP20                                                                                                                                                                                                                                                                   |
| `phases.ts`      | Mono/tri                           | `kVA_req > 10` → triphasé forcé                                                                                                                                                                                                                                                                                                                           |
| `selection.ts`   | Choix des modèles et des 3 options | filtrer (techno du scénario, phases, format si bureau/local partagé, température) → plus petit modèle avec `kW_req / (kW_modèle × k_alt) ≤ taux cible` ; N+1 / 2N ; scoring pondéré pour Recommandée et Performance                                                                                                                                       |
| `modular.ts`     | Modulaire                          | `n = ⌈kW_req / kW_module⌉` ; `+1` en N+1 ; vérification `n ≤ maxModules`, sinon châssis en parallèle                                                                                                                                                                                                                                                      |
| `battery.ts`     | Batteries à puissance constante    | `P_dc = P_charge / η_onduleur` ; `P_cellule = P_dc × k_vieill. × k_temp × k_marge / (N_blocs × cellules × N_chaînes)` ; interpolation log-log dans la table au V/élément choisi ; itération chaînes 1…max puis capacité Ah croissante → plus petite solution qui atteint l'autonomie ; calcul de l'autonomie réelle                                       |
| `electrical.ts`  | Courants, calibres, câbles         | `I = S / (√3·U)` (tri) ou `S / U` (mono) ; entrée redresseur = (P_sortie/η + P_charge) / (√3·U·PF_entrée) ; `I_batt,max = P_dc / (N_cellules × V_fin)` ; calibre = première valeur de la série ≥ `I_b` ; section = plus petite section IEC 60364-5-52 avec `I_z ≥ I_n` après facteurs de correction, puis vérification de chute de tension selon longueur |
| `thermal.ts`     | Dissipation                        | `P_pertes = P_sortie × (1/η − 1)` + pertes de recharge `I_charge × U_dc × (1 − η_charge)` ; ×3412,14 → BTU/h ; comparaison clim existante                                                                                                                                                                                                                 |
| `ventilation.ts` | IEC 62485-2                        | `Q = 0,05 × n × I_gaz × C_rt × 10⁻³` (m³/h) avec I_gaz = 1 mA/Ah (VRLA, floating) ; lithium : sans objet (mention)                                                                                                                                                                                                                                        |
| `layout.ts`      | Implantation                       | placement automatique en ligne le long du mur le plus long (UPS + armoires accolées) ; emprise = Σ empreintes + dégagements ; test « tient dans le local » par axe → manque en m ; test porte : `min(L, P) + marge ≤ largeur porte` et `H ≤ hauteur porte` ; charge au sol = masse / empreinte (et répartie sur dégagements) vs admissible                |
| `alerts.ts`      | Agrégation                         | codes d'alertes standardisés → vert / orange / rouge                                                                                                                                                                                                                                                                                                      |
| `bom.ts`         | Nomenclature                       | UPS, modules, blocs, armoires, disjoncteurs, bypass, options ; colonne prix vide                                                                                                                                                                                                                                                                          |
| `trace.ts`       | Traces                             | constructeur `trace().step(...)` utilisé par tous les modules                                                                                                                                                                                                                                                                                             |
| `index.ts`       | Orchestration                      | `runSizing(project, catalogs, settings): SizingResult`                                                                                                                                                                                                                                                                                                    |

Exemple de test (Vitest) :

```ts
it('ajoute un module en N+1', () => {
  expect(modulesNeeded({ loadKW: 100, moduleKW: 25, redundancy: 'N+1' }).value).toBe(5);
});
```

---

## 6. Livrables

| Livrable            | Implémentation                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan d'implantation | Composant SVG, échelle 1 px = n mm, grille 100 mm, cotes, zones de dégagement hachurées, porte avec arc d'ouverture, surface restante. Glisser-déposer + rotation 90° ; collisions et dégagements re-vérifiés en direct                              |
| Unifilaire          | Générateur de graphe → SVG avec bibliothèque de symboles IEC 60617 (disjoncteur, sectionneur, redresseur, onduleur, bypass statique, batterie, ATS, G). Topologies : simple, parallèle N+1, 2N (A/B), modulaire. Calibres affichés sur chaque organe |
| Note de calcul      | Page HTML imprimable + section PDF, générée à partir des `traces`                                                                                                                                                                                    |
| Nomenclature        | Tableau à l'écran → export `.xlsx` (ExcelJS) et `.csv` (séparateur `;` pour Excel FR)                                                                                                                                                                |
| Rapport PDF         | Couverture avec logo neutre remplaçable, récapitulatif, solution, plan, unifilaire, BOM, note de calcul, mention de pré-dimensionnement en pied de page                                                                                              |

---

## 7. Arborescence du code

```
ups-sizer/
├─ src/
│  ├─ engine/            # moteur pur + __tests__/
│  ├─ catalog/           # ups.json, batteries.json, equipment.json, schemas.ts (Zod)
│  ├─ settings/          # defaults.json + schéma
│  ├─ state/             # stores Zustand (projet, paramètres, catalogues) + persistance IndexedDB
│  ├─ features/
│  │  ├─ home/  power/  room/  solutions/   # parcours
│  │  ├─ layout-plan/  single-line/         # SVG
│  │  ├─ calc-note/  bom/  report-pdf/
│  │  └─ settings-screen/  catalog-editor/  projects/
│  ├─ ui/                # composants partagés (Card, Stepper, Alert, CalcModal…)
│  ├─ i18n/              # fr.json, en.json, ar.json
│  └─ main.tsx
├─ public/               # logo, icônes, illustrations produits
└─ docs/ARCHITECTURE.md
```

---

## 8. Ordre de développement (après validation)

1. **a.** Moteur de calcul + catalogues d'exemple + tests unitaires
2. **b.** Parcours utilisateur (accueil → livrables), i18n FR/EN, sauvegarde/import/export
3. **c.** Plan d'implantation et schéma unifilaire SVG
4. **d.** Exports PDF et Excel/CSV, puis arabe RTL et PWA hors-ligne

---

## 9. Hypothèses que je retiens par défaut (à confirmer ou corriger)

- Batteries plomb VRLA AGM 12 V par défaut ; lithium LFP proposé en option Performance si le catalogue en contient.
- Tension de fin de décharge par défaut 1,75 V/élément (1,67 V autorisé pour les autonomies courtes < 15 min).
- Facteurs : vieillissement 1,25, marge de conception 1,10, température selon table du fabricant de batteries.
- Calibres : série normalisée IEC ; câbles cuivre PR/XLPE, méthode E, 30 °C ; chute de tension max 3 % AC / 1 % DC.
- Charge au sol par défaut 500 kg/m² si inconnue (bureaux ~250 kg/m², salle technique 500–1000 kg/m²).
- Redondance 2N = deux systèmes indépendants A/B chacun dimensionné à 100 % de la charge.
- Déclassement altitude (IEC 62040-3) : table éditable dans Paramètres.
