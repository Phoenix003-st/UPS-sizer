# PASSATION — Application de dimensionnement d'UPS

> À lire en entier avant de commencer. Ce document reprend une session précédente qui a produit
> l'architecture. Elle est **validée** : ne la repropose pas, démarre directement le développement.

---

## 0. Ce que tu dois faire dans cette session

1. Crée à la racine du dépôt :
   - `docs/ARCHITECTURE.md` avec le contenu de la **partie C** ci-dessous ;
   - `docs/CAHIER-DES-CHARGES.md` avec le contenu de la **partie B**.
2. Initialise le projet : Vite + React + TypeScript strict, Vitest, ESLint et Prettier.
3. Développe dans cet ordre, avec **un commit par étape**, en lançant les tests avant chaque commit :
   - **a.** le moteur de calcul (`src/engine/`), les catalogues d'exemple et les tests unitaires ;
   - **b.** le parcours utilisateur (Accueil → Puissance → Local → Solutions → Livrables), en FR et EN ;
   - **c.** le plan d'implantation et le schéma unifilaire en SVG ;
   - **d.** les exports PDF, Excel et CSV, puis l'arabe (RTL) et le mode hors ligne (PWA) ;
   - **e.** la mise en ligne publique (voir A.3).
4. À la fin de chaque étape, fais-moi un point court : ce qui marche, ce qui reste, les hypothèses prises.
5. Si une donnée technique manque et bloque, demande-la-moi. Sinon, prends une donnée publique
   ou une valeur raisonnable, et note-la dans `docs/HYPOTHESES.md`.

---

## A. Décisions prises depuis le cahier des charges (elles priment sur la partie B)

### A.1 Identité : neutre, sans aucune marque
- **Ni logo ni couleurs Infosec pour l'instant.** Le cahier des charges (partie B) parle de logo et
  de couleurs Infosec : ignore ces points.
- Prends un nom générique (par exemple « UPS Sizer ») et une palette sobre et professionnelle,
  définie en variables CSS : on pourra rebrander plus tard en changeant un seul fichier
  (`src/ui/theme.css`, et un `logo.svg` neutre remplaçable).
- Chaque livrable garde la mention : **« Pré-dimensionnement indicatif – à valider par un bureau
  d'études avant installation »**.

### A.2 Catalogues d'exemple : données publiques, noms génériques
- Remplis les catalogues avec des valeurs **inspirées des fiches techniques publiques d'Infosec,
  APC (Schneider Electric) et Eaton** : puissances, PF, dimensions, poids, rendements, tension DC
  et nombre de blocs, puissance des modules, nombre de modules par châssis, dégagements, bruit.
- Utilise des **noms de modèles génériques** (par exemple « Online Tour 3 kVA » ou
  « Modulaire 30 kW × 10 »), jamais les noms commerciaux.
- Chaque fiche porte `"sample": true` et un champ `"source"` qui cite la fiche publique utilisée
  (marque, modèle, URL). L'interface affiche « EXEMPLE – à remplacer ».
- Batteries : tables de décharge à puissance constante (W par élément) inspirées des fiches
  publiques de fabricants VRLA (CSB, Yuasa, Fiamm, Leoch…), avec un ou deux blocs lithium LFP
  d'exemple.
- Gammes à couvrir :
  - Line Interactive, monophasé, 1 à 3 kVA (jusqu'à 10 kVA si des données publiques existent) ;
  - Online Performance, monophasé, 1 à 10 kVA ;
  - Online Double Conversion monophasé, 1 à 10 kVA ;
  - Online Double Conversion tri/tri, 10 à 800 kVA, et jusqu'à 1 600 kVA en parallèle ;
  - Modulaire triphasé, 10 à 1 600 kVA (modules de 20, 25, 30 et 50 kW selon les exemples publics).
- Plus tard, les vraies fiches Infosec (E3 Pro, M5T, M6Ti, Mod5T…) remplaceront ces exemples :
  l'éditeur de catalogue et l'import JSON doivent le permettre sans toucher au code.

### A.3 Accès pour tout le monde
- Application **gratuite, sans compte, sans serveur**, ouverte par un simple lien, sur PC,
  tablette et mobile.
- Hébergement : **GitHub Pages**, avec un workflow GitHub Actions qui lance build et tests, puis
  déploie à chaque push sur `main`. Pense au `base` de Vite pour le chemin du dépôt.
- Prévois aussi un build en **fichier HTML unique** (`vite-plugin-singlefile`), qu'on peut envoyer
  par e-mail ou ouvrir hors ligne.
- **Accessibilité** visée WCAG 2.1 AA : contrastes, navigation au clavier, libellés ARIA, cibles
  tactiles d'au moins 44 px.
- Les projets sont sauvegardés **dans le navigateur** (IndexedDB), avec export et import en JSON.
  Ils ne sont jamais envoyés à un serveur.

### A.4 Hypothèses techniques par défaut (modifiables dans l'écran Paramètres)
- Batteries VRLA AGM 12 V par défaut ; lithium LFP proposé dans l'option Performance.
- Tension de fin de décharge : 1,75 V par élément par défaut, 1,67 V autorisé si l'autonomie est
  inférieure à 15 min.
- Facteurs batteries : vieillissement 1,25, marge de conception 1,10, correction de température
  selon la table du bloc.
- Calibres : série normalisée IEC. Câbles cuivre isolés PR/XLPE, méthode E, 30 °C. Chute de tension
  maximale : 3 % en AC, 1 % en DC.
- Charge au sol par défaut : 500 kg/m² si elle est inconnue.
- Redondance 2N : deux systèmes indépendants A et B, chacun dimensionné pour 100 % de la charge.
- Déclassement en altitude au-delà de 1 000 m : table éditable (IEC 62040-3).
- Ventilation du local batteries : IEC 62485-2, avec Q = 0,05 × n × I_gaz × C_rt × 10⁻³ m³/h.

---

## B. Cahier des charges d'origine

```
# RÔLE
Tu es un ingénieur logiciel senior, doublé d'un ingénieur électricien spécialisé dans les alimentations sans interruption (ASI/UPS). Tu vas concevoir et coder une application web de dimensionnement d'UPS pour Infosec UPS Systems, fabricant français d'onduleurs.

# OBJECTIF
Créer une application très simple à utiliser, destinée aux commerciaux, aux intégrateurs et aux clients.

Le principe :
1. L'utilisateur choisit son type d'installation et la puissance nécessaire.
2. L'application lui propose le produit adapté, avec ses batteries.
3. Elle montre l'implantation et les dimensions dans le local.

Elle produit aussi automatiquement le schéma électrique, la note de calcul, la nomenclature et un rapport PDF.

# PÉRIMÈTRE
- Uniquement des UPS commerciaux, installés en intérieur (indoor).
- Pas d'UPS industriels renforcés, ni d'armoires extérieures ou étanches (IP54/IP55).
- Toutes les installations se font dans des locaux fermés et tempérés.

# PRINCIPE N°1 : LA FACILITÉ D'UTILISATION
- Un utilisateur non ingénieur doit obtenir une proposition en moins de 2 minutes et en 3 à 4 clics.
- Écran d'accueil : de grandes cartes visuelles avec une icône par type d'installation. Aucun jargon technique au premier niveau.
- Chaque étape propose des valeurs par défaut intelligentes, déjà remplies, que l'utilisateur peut garder ou modifier.
- Les options techniques (facteur de puissance, tension, redondance, paramètres batteries) sont rangées dans une section « Options avancées », repliée par défaut.
- Une barre de progression montre les étapes, avec un bouton « Retour » toujours disponible.
- Le résultat s'affiche sous forme de carte claire : photo ou illustration du produit, nom du modèle, puissance, autonomie, batteries, dimensions totales et place occupée dans le local.
- Les alertes sont en langage simple, avec un code couleur :
  - vert : OK ;
  - orange : à vérifier ;
  - rouge : bloquant.
  Exemple : « Le local est trop petit pour cette configuration. Il manque 0,6 m en largeur. »
- L'interface est responsive : PC, tablette et mobile.
- Elle est disponible en français et en anglais, avec l'arabe en option (mise en page de droite à gauche).

# PARCOURS UTILISATEUR

## Étape 1 – Type d'installation
L'utilisateur choisit une carte. Chaque type pré-remplit des valeurs par défaut modifiables :

- **CCTV / vidéosurveillance** : caméras IP, NVR, switchs PoE.
  Autonomie par défaut : 30 à 60 min.
  Technologie : Line Interactive ou Online, selon la puissance.

- **Postes de travail / bureautique** : PC, écrans, imprimantes réseau.
  Autonomie par défaut : 10 à 15 min.
  Technologie : Line Interactive ou Online Performance.

- **Serveurs / salle informatique** : baies serveurs, réseau, stockage.
  Autonomie par défaut : 15 à 30 min.
  Technologie : Online Double Conversion.

- **Data center** : plusieurs baies IT.
  Technologie : Online Double Conversion triphasé ou modulaire.
  Redondance N+1 ou 2N proposée.

- **Aéroport** : uniquement les équipements situés dans des locaux techniques intérieurs (salles IT, salles de contrôle, locaux CCTV, contrôle d'accès).
  Technologie : Online Double Conversion ou modulaire.
  Redondance 2N recommandée ; autonomie longue.

- **Bâtiment / tertiaire** : bureaux, hôtels, écoles, commerces, cliniques (hors équipements médicaux vitaux).

- **Personnalisé**.

## Étape 2 – Puissance
Deux façons de saisir la puissance :

- **Mode rapide** : saisie directe de la puissance en kW ou kVA, avec un curseur et un champ numérique.
- **Mode assisté** : l'utilisateur ajoute ses équipements depuis une bibliothèque (type, quantité), et la puissance se calcule automatiquement.
  Exemples de valeurs de la bibliothèque, toutes modifiables :
  - caméra IP : 5 à 15 W ;
  - NVR ;
  - switch PoE ;
  - serveur 1U/2U ;
  - baie IT en kW ;
  - PC ;
  - écran.

L'utilisateur indique aussi l'autonomie souhaitée en minutes, avec des boutons rapides (10, 15, 30, 60 min ou autre).

Options avancées (repliées par défaut) :
- facteur de puissance de sortie : 0,9 ou 1 ;
- marge d'extension : 20 % par défaut ;
- taux de charge cible de l'UPS : 80 % maximum ;
- monophasé ou triphasé ;
- tension : 230 V ou 400 V ;
- fréquence : 50 Hz ou 60 Hz ;
- redondance : N, N+1 ou 2N.

## Étape 3 – Local d'installation
Saisie des informations du local :
- dimensions : longueur × largeur × hauteur ;
- largeur et hauteur de la porte ;
- charge admissible du sol en kg/m2 (valeur par défaut proposée si inconnue) ;
- température ambiante ;
- climatisation existante : oui ou non, et sa puissance en kW ;
- faux plancher : oui ou non ;
- type de local : salle technique dédiée, local partagé, bureau, ou baie existante.

Contrôles intérieurs, avec une alerte si la valeur est hors plage :
- température de 0 à 40 °C (20 à 25 °C recommandés pour la durée de vie des batteries) ;
- humidité de 0 à 95 % sans condensation ;
- altitude au-delà de 1 000 m : déclassement automatique ;
- local propre, indice de protection IP20.

Si l'UPS est installé dans un bureau ou un local partagé, l'application privilégie les formats tour ou rack et affiche le niveau sonore (dB).

## Étape 4 – Solution proposée
L'application affiche jusqu'à 3 options côte à côte :

- **Économique** : la puissance juste suffisante.
- **Recommandée** (mise en avant) : le meilleur compromis.
- **Performance** : le meilleur rendement et la plus grande marge.

Chaque option indique :
- la technologie et le modèle d'UPS ;
- le nombre d'onduleurs ou de modules ;
- le taux de charge ;
- les batteries : type (VRLA ou lithium), tension des blocs, capacité (Ah), nombre de blocs par chaîne, nombre de chaînes ;
- les batteries internes ou les armoires batteries externes, avec leur nombre ;
- l'autonomie réelle calculée ;
- les dimensions de chaque élément (L × P × H) et leur poids ;
- l'emprise totale au sol, dégagements compris ;
- un visuel « Place dans le local » : la vue de dessus du local, avec l'UPS et les batteries positionnés à l'échelle.

## Étape 5 – Livrables (en un clic)

1. **Plan d'implantation**, en vue de dessus à l'échelle (SVG). Il montre :
   - les UPS et les armoires batteries ;
   - les dégagements de service à l'avant, à l'arrière et sur les côtés ;
   - la porte, avec une vérification du passage des équipements ;
   - la surface restante.
   Les éléments peuvent être déplacés à la souris.

2. **Schéma électrique unifilaire** (SVG, symboles IEC), généré automatiquement. Il comprend :
   - le réseau et, en option, le groupe électrogène avec son inverseur de source (ATS) ;
   - le disjoncteur d'entrée redresseur et le disjoncteur d'entrée bypass ;
   - l'UPS, ou les modules en parallèle ;
   - le bypass statique et le bypass de maintenance externe ;
   - le disjoncteur des batteries ;
   - les armoires batteries ;
   - le tableau ondulé et les départs de sortie ;
   - les calibres affichés sur chaque élément.

3. **Note de calcul d'ingénierie**, qui contient :
   - les courants d'entrée, de sortie et de batterie ;
   - les calibres des protections ;
   - les sections de câbles indicatives (IEC 60364 / NF C 15-100), selon la longueur saisie ;
   - la dissipation thermique en kW et en BTU/h, et le besoin de climatisation ;
   - la charge au sol en kg/m2, comparée à la charge admissible du local ;
   - la ventilation du local batteries (IEC 62485-2) ;
   - les alertes : local trop petit, sol insuffisant, climatisation insuffisante, porte trop étroite.

4. **Nomenclature (BOM)** exportable en Excel ou CSV, avec une colonne prix vide à compléter.

5. **Rapport PDF client** avec le logo Infosec, qui reprend :
   - le récapitulatif ;
   - la solution retenue ;
   - le plan ;
   - le schéma ;
   - la nomenclature ;
   - la note de calcul.

# GAMMES ET TECHNOLOGIES
Toutes les gammes sont stockées dans un catalogue JSON séparé et éditable :

- **Line Interactive** : monophasé, 1 à 10 kVA, facteur de puissance 0,9 ou 1.
- **Online Performance** : monophasé, 1 à 10 kVA, facteur de puissance 0,9 ou 1.
- **Online Double Conversion** :
  - monophasé, 1 à 10 kVA ;
  - triphasé tri/tri, 10 à 1 600 kVA.
- **Modulaire** : triphasé, 10 à 1 600 kVA. La puissance par module et le nombre maximum de modules par châssis sont définis dans le catalogue.

Champs à renseigner pour chaque modèle :
- référence, gamme, technologie ;
- format : tour, rack, tour/rack convertible ou armoire ;
- puissance en kVA et en kW, facteur de puissance ;
- phases en entrée et en sortie ;
- rendement selon le mode ;
- dimensions (L × P × H) et poids ;
- dégagements requis ;
- indice IP et plage de température ;
- niveau sonore (dB) ;
- tension DC des batteries et nombre de blocs ;
- batteries internes : oui ou non ;
- courant de charge maximal ;
- dissipation thermique ;
- armoires batteries compatibles ;
- possibilité de mise en parallèle.

Un catalogue batteries JSON séparé contient, pour chaque batterie :
- les caractéristiques des blocs ;
- les tables de décharge à puissance constante (W par bloc selon la durée) ;
- les dimensions et le poids des armoires batteries.

Remplis ces catalogues avec des données d'exemple, marquées clairement « EXEMPLE – à remplacer ». Je fournirai ensuite les vraies fiches Infosec (E3 Pro, M5T, M6Ti, Mod5T, etc.).

# LOGIQUE DE CALCUL
La logique doit être documentée dans le code, et chaque calcul doit pouvoir être affiché avec un bouton « Voir le calcul ».

**Puissance**
- kW requis = charge × (1 + marge).
- kVA requis = kW requis ÷ facteur de puissance.
- Retenir le plus petit modèle qui respecte le taux de charge cible.

**Monophasé ou triphasé**
- Au-delà de 10 kVA, l'application bascule automatiquement en triphasé.

**Modulaire**
- Nombre de modules = arrondi supérieur de (charge ÷ puissance d'un module).
- Ajouter 1 module en N+1.

**Batteries** (méthode à puissance constante)
- Puissance DC = charge en kW ÷ rendement de l'onduleur.
- Puissance par bloc = puissance DC ÷ (nombre de blocs × nombre de chaînes).
- Comparer avec les tables de décharge (tension finale de 1,67 à 1,75 V par élément).
- Appliquer les facteurs de correction : vieillissement (1,25), température et marge de conception.

**Implantation**
- Emprise = somme des empreintes des équipements + dégagements.
- Vérifier que l'ensemble tient dans le local, que les équipements passent par la porte et que le sol supporte la charge.

**Thermique**
- Dissipation = pertes de l'UPS + pertes de charge des batteries.
- Comparer avec la climatisation existante.

# STACK TECHNIQUE
- Application web monopage en React + TypeScript.
- Fonctionne sans serveur : les projets sont sauvegardés localement, avec export et import en JSON.
- Code modulaire et commenté, avec des tests unitaires sur toutes les fonctions de calcul.
- Interface professionnelle aux couleurs d'Infosec.
- Tous les paramètres et hypothèses sont modifiables dans un écran « Paramètres ».
- Chaque livrable porte la mention : « Pré-dimensionnement indicatif – à valider par un bureau d'études avant installation ».

# MÉTHODE DE TRAVAIL
1. Propose d'abord l'architecture : les écrans, le modèle de données JSON et les modules de calcul. Attends ma validation avant d'aller plus loin.
2. Développe ensuite dans cet ordre :
   a. le moteur de calcul et les catalogues ;
   b. le parcours utilisateur ;
   c. le plan d'implantation et le schéma ;
   d. les exports PDF et Excel.
3. Pose-moi des questions dès qu'une donnée technique Infosec est nécessaire, plutôt que de l'inventer.
```

> Rappel : le point 1 de la méthode de travail est **déjà fait** (architecture validée, partie C).
> Les mentions « logo / couleurs Infosec » sont **remplacées** par A.1. Le point 3 est
> **assoupli** par A.2 : utilise des données publiques plutôt que de bloquer.

---

## C. Architecture validée (contenu de `docs/ARCHITECTURE.md`)

### UPS Sizer — Architecture (v0.1, validée)

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

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework | React 18 + TypeScript (strict) + Vite | Demandé ; build statique, déployable sur n'importe quel hébergement ou en fichier local |
| État + sauvegarde locale | Zustand + `persist` vers IndexedDB (`idb-keyval`) | Simple ; IndexedDB tient les catalogues volumineux (localStorage limité à ~5 Mo) |
| Validation des catalogues | Zod | Un catalogue mal saisi est refusé avec un message clair, ligne par ligne |
| Styles | Tailwind CSS + variables CSS (thème neutre, rebrandable) | Responsive facile, propriétés logiques (`ms-`/`me-`) pour l'arabe RTL |
| Traductions | i18next (fr, en, ar) | `dir="rtl"` automatique pour l'arabe |
| Plan + unifilaire | SVG natif généré en React, glisser-déposer par Pointer Events | Vectoriel, à l'échelle, exportable tel quel dans le PDF |
| PDF | jsPDF + svg2pdf.js + jspdf-autotable | PDF vectoriel (plan et schéma restent nets), tableaux paginés |
| Excel | ExcelJS (+ CSV natif) | Mise en forme, colonne prix vide, pas de dépendance serveur |
| Tests | Vitest (moteur) + Testing Library (quelques composants) | Couverture visée ≥ 90 % sur `engine/` |
| Hors-ligne (option) | vite-plugin-pwa | Utilisable sur chantier sans réseau |

---

## 3. Écrans

| # | Écran | Contenu | Clics typiques |
|---|---|---|---|
| 0 | **Accueil** | 7 grandes cartes avec icône (CCTV, Bureautique, Serveurs, Data center, Aéroport, Bâtiment, Personnalisé) + « Mes projets » | 1 |
| 1 | **Puissance & autonomie** | Onglets *Rapide* (curseur + champ kW/kVA) / *Assisté* (bibliothèque d'équipements × quantité). Boutons autonomie 10/15/30/60/autre. ▸ *Options avancées* repliées | 1–2 |
| 2 | **Local** | L × l × H, porte, sol, température, clim, faux plancher, type de local. Valeurs par défaut pré-remplies. Alertes en direct sous chaque champ | 0–1 (« Je ne connais pas » garde les valeurs par défaut) |
| 3 | **Solutions** | 3 cartes : Économique / **Recommandée** (mise en avant) / Performance. Mini-vue « Place dans le local ». Pastilles vert/orange/rouge | 1 (choisir) |
| 4 | **Livrables** | Onglets : Plan · Schéma unifilaire · Note de calcul · Nomenclature · Rapport PDF. Boutons « Télécharger tout » | 1 |
| — | **Paramètres** | Toutes les hypothèses (marges, facteurs batteries, séries de calibres, tables câbles, dégagements par défaut…) avec bouton « Revenir aux valeurs par défaut » | — |
| — | **Catalogues** | Tableau éditable UPS / batteries / armoires / bibliothèque d'équipements + import/export JSON, validation Zod | — |
| — | **Mes projets** | Liste, dupliquer, supprimer, import/export `.ups.json` | — |

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
  "meta": { "schemaVersion": 1, "catalogVersion": "2026-10-EXEMPLE", "sample": true,
            "notice": "EXEMPLE – à remplacer par les fiches Infosec" },
  "models": [
    {
      "id": "EX-ODC3-60",
      "sample": true,
      "reference": "EXEMPLE ODC-T 60 kVA",
      "range": "EXEMPLE Gamme Tri",
      "technology": "online_double_conversion",   // line_interactive | online_performance | online_double_conversion | modular
      "formFactor": "cabinet",                     // tower | rack | tower_rack | cabinet
      "rackUnits": null,
      "power": { "kVA": 60, "kW": 60, "pf": 1.0 },
      "phases": { "in": 3, "out": 3 },
      "voltages": { "out": [380, 400, 415], "freqHz": [50, 60] },
      "efficiency": {                               // par mode, et courbe selon le taux de charge
        "online": [ { "load": 0.25, "eta": 0.945 }, { "load": 0.5, "eta": 0.955 },
                    { "load": 0.75, "eta": 0.96 }, { "load": 1.0, "eta": 0.955 } ],
        "eco": 0.99,
        "battery": 0.95                             // rendement onduleur seul (DC→AC)
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
        "internal": null,                           // ou { "blockId": "...", "blocks": 32, "strings": 1 }
        "maxChargeCurrentA": 20,
        "compatibleCabinetIds": ["EX-CAB-L", "EX-CAB-XL"],
        "sharedBattery": false                      // batterie commune possible en parallèle
      },
      "heatDissipationW": null,                     // null = calculée depuis le rendement
      "parallel": { "capable": true, "maxUnits": 4 },
      "modular": null,                              // voir 4.1 bis
      "datasheetUrl": ""
    }
  ]
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
      "chemistry": "VRLA_AGM",                    // VRLA_AGM | VRLA_GEL | LI_LFP
      "nominalV": 12, "cells": 6,
      "capacityAh": 100, "capacityRate": "C10",
      "dimensionsMm": { "w": 330, "d": 172, "h": 220 }, "weightKg": 30,
      "designLifeYears": 10,
      "discharge": {                              // TABLE À PUISSANCE CONSTANTE
        "unit": "W_per_cell",                     // ou W_per_block
        "refTempC": 25,
        "tables": [
          { "eodVpc": 1.67, "points": [ { "min": 5, "W": 0 }, { "min": 10, "W": 0 }, { "min": 15, "W": 0 },
                                        { "min": 30, "W": 0 }, { "min": 60, "W": 0 } ] },
          { "eodVpc": 1.75, "points": [ /* … */ ] }
        ]
      },
      "tempCorrection": [ { "tC": 10, "k": 0.88 }, { "tC": 20, "k": 0.97 }, { "tC": 25, "k": 1.0 } ]
    }
  ],
  "cabinets": [
    {
      "id": "EX-CAB-L",
      "sample": true,
      "reference": "EXEMPLE Armoire batteries L",
      "dimensionsMm": { "w": 800, "d": 850, "h": 1900 },
      "emptyWeightKg": 150,
      "clearancesMm": { "front": 1000, "rear": 0, "left": 0, "right": 0, "top": 300 },
      "capacity": [ { "blockId": "EX-VRLA-12V100", "maxBlocks": 40 } ],
      "breakerA": 250
    }
  ]
}
```

### 4.3 Bibliothèque d'équipements — `catalog/equipment.json`

```jsonc
[
  { "id": "ip-camera", "category": "cctv", "label": { "fr": "Caméra IP", "en": "IP camera", "ar": "كاميرا IP" },
    "defaultW": 10, "rangeW": [5, 15], "pf": 0.9 },
  { "id": "nvr", "category": "cctv", "label": { "fr": "Enregistreur NVR" }, "defaultW": 60, "rangeW": [30, 150], "pf": 0.9 },
  { "id": "poe-switch-24", "category": "network", "label": { "fr": "Switch PoE 24 ports" }, "defaultW": 400, "rangeW": [100, 740], "pf": 0.95 },
  { "id": "server-1u", "category": "it", "defaultW": 350 },
  { "id": "server-2u", "category": "it", "defaultW": 600 },
  { "id": "it-rack", "category": "it", "defaultW": 5000, "unit": "kW" },
  { "id": "pc", "category": "office", "defaultW": 150 },
  { "id": "monitor", "category": "office", "defaultW": 30 }
]
```

### 4.4 Paramètres — `settings.json` (tout est modifiable dans l'écran Paramètres)

```jsonc
{
  "power":   { "growthMargin": 0.20, "targetLoadRate": 0.80, "defaultPf": 1.0,
               "monoToTriThresholdKVA": 10, "altitudeDerating": [ { "m": 1000, "k": 1.0 }, { "m": 1500, "k": 0.95 },
                                                                   { "m": 2000, "k": 0.91 }, { "m": 3000, "k": 0.82 } ] },
  "battery": { "agingFactor": 1.25, "designMargin": 1.10, "defaultEodVpc": 1.75,
               "allowedEodVpc": [1.67, 1.70, 1.75], "maxStrings": 4, "chargeEfficiency": 0.85 },
  "room":    { "defaultFloorLoadKgM2": 500, "doorMarginMm": 50, "recommendedTempC": [20, 25],
               "allowedTempC": [0, 40], "maxHumidityPct": 95, "defaultHeightMm": 2700 },
  "electrical": {
    "breakerSeriesA": [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200],
    "cable": { "material": "Cu", "insulation": "XLPE", "installMethod": "E", "ambientC": 30, "groupingFactor": 0.8 },
    "maxVoltageDropPct": { "ac": 3, "dc": 1 },
    "defaultCableLengthsM": { "input": 20, "bypass": 20, "output": 20, "battery": 5 }
  },
  "selection": { "weights": { "efficiency": 0.3, "footprint": 0.2, "margin": 0.3, "price": 0.2 } },
  "scenarios": {
    "cctv":     { "autonomyMin": 30, "technologies": ["line_interactive", "online_double_conversion"], "redundancy": "N" },
    "office":   { "autonomyMin": 10, "technologies": ["line_interactive", "online_performance"], "redundancy": "N" },
    "server":   { "autonomyMin": 15, "technologies": ["online_double_conversion"], "redundancy": "N" },
    "datacenter": { "autonomyMin": 10, "technologies": ["online_double_conversion", "modular"], "redundancy": "N+1" },
    "airport":  { "autonomyMin": 30, "technologies": ["online_double_conversion", "modular"], "redundancy": "2N" },
    "building": { "autonomyMin": 15, "technologies": ["online_performance", "online_double_conversion"], "redundancy": "N" },
    "custom":   { "autonomyMin": 15, "technologies": ["*"], "redundancy": "N" }
  }
}
```

### 4.5 Projet — fichier exporté `*.ups.json`

```jsonc
{
  "schemaVersion": 1,
  "id": "uuid", "name": "Siège ACME – salle serveurs", "client": "", "author": "",
  "createdAt": "…", "updatedAt": "…",
  "catalogVersion": "2026-10-EXEMPLE",           // pour détecter un catalogue modifié depuis
  "scenario": "server",
  "load": {
    "mode": "quick",                             // quick | assisted
    "value": 40, "unit": "kW",                   // mode rapide
    "items": [ { "libId": "server-2u", "qty": 20, "unitW": 600 } ],   // mode assisté
    "pf": 0.9
  },
  "autonomyMin": 15,
  "advanced": { "outputPf": 1.0, "growthMargin": 0.2, "targetLoadRate": 0.8, "phases": "auto",
                "voltage": 400, "freqHz": 50, "redundancy": "N", "batteryChemistry": "auto", "eodVpc": null },
  "room": { "lengthMm": 5000, "widthMm": 4000, "heightMm": 2700,
            "door": { "widthMm": 900, "heightMm": 2100 },
            "floorLoadKgM2": null, "ambientC": 25, "humidityPct": 50, "altitudeM": 100,
            "hvac": { "present": true, "kW": 10 }, "raisedFloor": false, "kind": "dedicated" },
  "installation": { "generator": false, "externalMaintenanceBypass": true, "cableLengthsM": null },
  "choice": { "tier": "recommended", "overrides": {} },
  "layout": { "positions": { "ups-1": { "x": 300, "y": 200, "rot": 0 } } },   // positions glissées à la souris
  "settingsOverrides": {}
}
```

### 4.6 Résultat du moteur (non sauvegardé, recalculé)

```ts
interface SizingResult {
  inputs: NormalizedInputs;          // charge kW/kVA, phases, déclassements appliqués
  options: SolutionOption[];         // 0 à 3 : economy | recommended | performance
  globalAlerts: Alert[];
}
interface SolutionOption {
  tier: 'economy' | 'recommended' | 'performance';
  ups: { modelId: string; units: number; modules?: number; redundancy: 'N' | 'N+1' | '2N'; loadRate: number };
  battery: { blockId: string; chemistry: string; blocksPerString: number; strings: number;
             location: 'internal' | 'cabinet'; cabinets: { id: string; qty: number }[];
             eodVpc: number; autonomyMin: number };
  electrical: ElectricalResult;      // courants, calibres, sections
  thermal: ThermalResult;            // W, BTU/h, besoin clim
  layout: LayoutResult;              // éléments placés, emprise, surface restante, porte
  bom: BomLine[];
  alerts: Alert[];
  traces: Record<string, CalcTrace>; // pour « Voir le calcul »
}
interface Alert { level: 'ok' | 'warn' | 'block'; code: string; params: Record<string, number | string> }
// message traduit : t('alert.room_too_small', { missing: 0.6, axis: 'width' })
//  → « Le local est trop petit pour cette configuration. Il manque 0,6 m en largeur. »
interface CalcTrace { title: string; steps: { label: string; formula: string; substituted: string;
                      result: number; unit: string; ref?: string }[] }
```

---

## 5. Moteur de calcul — `src/engine/`

Chaque module : fonctions pures, documentées (JSDoc avec formule et référence normative), retour
`{ value, trace }`, fichier de tests associé.

| Module | Rôle | Formules principales |
|---|---|---|
| `load.ts` | Puissance requise | `kW_req = charge × (1 + marge)` ; `kVA_req = kW_req / PF` ; somme bibliothèque `Σ qty × W` |
| `environment.ts` | Déclassements et plages | altitude > 1000 m → coefficient (table paramètres) ; contrôles 0–40 °C, HR ≤ 95 %, IP20 |
| `phases.ts` | Mono/tri | `kVA_req > 10` → triphasé forcé |
| `selection.ts` | Choix des modèles et des 3 options | filtrer (techno du scénario, phases, format si bureau/local partagé, température) → plus petit modèle avec `kW_req / (kW_modèle × k_alt) ≤ taux cible` ; N+1 / 2N ; scoring pondéré pour Recommandée et Performance |
| `modular.ts` | Modulaire | `n = ⌈kW_req / kW_module⌉` ; `+1` en N+1 ; vérification `n ≤ maxModules`, sinon châssis en parallèle |
| `battery.ts` | Batteries à puissance constante | `P_dc = P_charge / η_onduleur` ; `P_cellule = P_dc × k_vieill. × k_temp × k_marge / (N_blocs × cellules × N_chaînes)` ; interpolation log-log dans la table au V/élément choisi ; itération chaînes 1…max puis capacité Ah croissante → plus petite solution qui atteint l'autonomie ; calcul de l'autonomie réelle |
| `electrical.ts` | Courants, calibres, câbles | `I = S / (√3·U)` (tri) ou `S / U` (mono) ; entrée redresseur = (P_sortie/η + P_charge) / (√3·U·PF_entrée) ; `I_batt,max = P_dc / (N_cellules × V_fin)` ; calibre = première valeur de la série ≥ `I_b` ; section = plus petite section IEC 60364-5-52 avec `I_z ≥ I_n` après facteurs de correction, puis vérification de chute de tension selon longueur |
| `thermal.ts` | Dissipation | `P_pertes = P_sortie × (1/η − 1)` + pertes de recharge `I_charge × U_dc × (1 − η_charge)` ; ×3412,14 → BTU/h ; comparaison clim existante |
| `ventilation.ts` | IEC 62485-2 | `Q = 0,05 × n × I_gaz × C_rt × 10⁻³` (m³/h) avec I_gaz = 1 mA/Ah (VRLA, floating) ; lithium : sans objet (mention) |
| `layout.ts` | Implantation | placement automatique en ligne le long du mur le plus long (UPS + armoires accolées) ; emprise = Σ empreintes + dégagements ; test « tient dans le local » par axe → manque en m ; test porte : `min(L, P) + marge ≤ largeur porte` et `H ≤ hauteur porte` ; charge au sol = masse / empreinte (et répartie sur dégagements) vs admissible |
| `alerts.ts` | Agrégation | codes d'alertes standardisés → vert / orange / rouge |
| `bom.ts` | Nomenclature | UPS, modules, blocs, armoires, disjoncteurs, bypass, options ; colonne prix vide |
| `trace.ts` | Traces | constructeur `trace().step(...)` utilisé par tous les modules |
| `index.ts` | Orchestration | `runSizing(project, catalogs, settings): SizingResult` |

Exemple de test (Vitest) :
```ts
it('ajoute un module en N+1', () => {
  expect(modulesNeeded({ loadKW: 100, moduleKW: 25, redundancy: 'N+1' }).value).toBe(5);
});
```

---

## 6. Livrables

| Livrable | Implémentation |
|---|---|
| Plan d'implantation | Composant SVG, échelle 1 px = n mm, grille 100 mm, cotes, zones de dégagement hachurées, porte avec arc d'ouverture, surface restante. Glisser-déposer + rotation 90° ; collisions et dégagements re-vérifiés en direct |
| Unifilaire | Générateur de graphe → SVG avec bibliothèque de symboles IEC 60617 (disjoncteur, sectionneur, redresseur, onduleur, bypass statique, batterie, ATS, G). Topologies : simple, parallèle N+1, 2N (A/B), modulaire. Calibres affichés sur chaque organe |
| Note de calcul | Page HTML imprimable + section PDF, générée à partir des `traces` |
| Nomenclature | Tableau à l'écran → export `.xlsx` (ExcelJS) et `.csv` (séparateur `;` pour Excel FR) |
| Rapport PDF | Couverture avec logo neutre remplaçable, récapitulatif, solution, plan, unifilaire, BOM, note de calcul, mention de pré-dimensionnement en pied de page |

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
