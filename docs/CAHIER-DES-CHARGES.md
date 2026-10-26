# Cahier des charges d'origine

> Document d'origine, conservé tel quel. Les décisions de la passation (identité neutre, catalogues
> d'exemple publics, accès libre) priment sur ce texte : voir `docs/PASSATION.md`, partie A.

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
