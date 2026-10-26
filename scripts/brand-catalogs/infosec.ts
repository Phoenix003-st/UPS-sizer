/**
 * INFOSEC UPS SYSTEM — catalogue « Electrical Protection Catalog 2025 » (fichier
 * Catalogue_2026_INFOSEC.pdf). Valeurs relevées page par page ; dimensions converties en
 * largeur × profondeur × hauteur (le catalogue donne « L x W x H » = profondeur × largeur × hauteur).
 *
 * Non repris : gammes High Frequency domestiques (Z1, Z2, Z3, Zen Live, Zen-X), M5T HD (ascenseurs),
 * G1 / G1 Solar (convertisseurs), accessoires. Le catalogue ne publie ni masses, ni courbes de
 * rendement, ni composition des batteries : elles sont estimées (voir build.ts).
 */
import type { BrandData, Entry } from './types';

const LI = 'line_interactive' as const;
const OP = 'online_performance' as const;
const DC = 'online_double_conversion' as const;
const MOD = 'modular' as const;

const x1: Entry[] = (
  [
    ['66111', '66105', 500, 300, 8, [96, 286, 138]],
    ['66112', '66106', 700, 360, 10, [96, 286, 138]],
    ['66113', '66107', 1000, 500, 10, [96, 286, 138]],
    ['66114', '66108', 1300, 720, 10, [148, 298, 179]],
    ['66115', '66109', 1600, 900, 8, [148, 298, 179]],
    ['66116', '66110', 2200, 1320, 8, [148, 298, 179]],
  ] as const
).map(([iec, fr, va, w, min, dims]) => ({
  partNumber: `${iec} (IEC) / ${fr} (FR/Schuko)`,
  name: `X1+ ${va}`,
  range: 'X1+',
  tech: LI,
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  runtime: { load: 0.5, min },
  page: 17,
}));

const x3: Entry[] = (
  [
    ['65965', 500, 240, 12, [100, 287, 142]],
    ['65966', 650, 360, 11, [100, 287, 142]],
    ['65967', 800, 480, 18, [100, 287, 142]],
    ['65968', 1000, 480, 17, [100, 287, 142]],
    ['65969', 1200, 600, 35, [146, 350, 160]],
    ['65970', 1600, 900, 40, [145, 397, 205]],
    ['65971', 2000, 1200, 42, [145, 397, 205]],
    ['66080', 3000, 1800, 45, [150, 495, 250]],
  ] as const
).map(([pn, va, w, min, dims]) => ({
  partNumber: pn,
  name: `X3 EX ${va} LCD USB`,
  range: 'X3 EX LCD USB',
  tech: LI,
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  runtime: { load: 0.5, min },
  page: 18,
}));

const x4: Entry[] = (
  [
    ['66061', 600, 360, 9, 230],
    ['66062', 800, 480, 9, 230],
    ['66063', 1000, 600, 17, 300],
    ['66064', 2000, 1200, 17, 300],
    ['66065', 3000, 1800, 17, 460],
  ] as const
).map(([pn, va, w, min, d]) => ({
  partNumber: pn,
  name: `X4 RM Plus ${va}`,
  range: 'X4 RM Plus',
  tech: LI,
  ff: 'rack',
  ru: 2,
  kva: va / 1000,
  kw: w / 1000,
  dims: [438, d, 88],
  runtime: { load: 0.5, min },
  page: 19,
}));

const e2: Entry[] = (
  [
    ['65348', 600, 360, 11, [100, 330, 145]],
    ['65349', 800, 480, 9, [146, 350, 160]],
    ['65350', 1000, 700, 8, [146, 350, 160]],
    ['65351', 1500, 1050, 9, [146, 397, 205]],
    ['65352', 2000, 1400, 8, [146, 397, 205]],
  ] as const
).map(([pn, va, w, min, dims]) => ({
  partNumber: pn,
  name: `E2 LCD ${va}`,
  range: 'E2 LCD',
  tech: OP,
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  runtime: { load: 0.5, min },
  page: 20,
}));

const e3evo: Entry[] = (
  [
    ['67036', '500 RM', 500, 300, 12, 295, 1],
    ['67037', '750 RM', 750, 450, 8, 295, 1],
    ['67038', '1200 RT', 1200, 720, 10, 325, 2],
    ['67039', '2200 RT', 2200, 1230, 8, 325, 2],
    ['67040', '3000 RT', 3000, 1800, 8, 415, 2],
  ] as const
).map(([pn, n, va, w, min, d, ru]) => ({
  partNumber: pn,
  name: `E3 Evo ${n}`,
  range: 'E3 Evo',
  tech: OP,
  ff: ru === 1 ? 'rack' : 'tower_rack',
  ru,
  kva: va / 1000,
  kw: w / 1000,
  dims: [438, d, ru === 1 ? 44 : 88],
  runtime: { load: 0.5, min },
  page: 21,
}));

const e3perfEbm: Record<number, [string, string]> = {
  800: ['67401', '800 RT'],
  1100: ['67402', '1100 RT'],
  1500: ['67405', '1500 RT'],
  2000: ['67406', '2000 RT'],
  2500: ['67408', '2500 RT'],
  3000: ['67409', '3000/5000 RT'],
  5000: ['67409', '3000/5000 RT'],
};
const e3perf: Entry[] = (
  [
    ['67023', 800, 720, 12, 410],
    ['67024', 1100, 990, 12, 410],
    ['67025', 1500, 1350, 13, 525],
    ['67026', 2000, 1800, 12, 525],
    ['67027', 2500, 2250, 12, 645],
    ['67028', 3000, 2700, 10, 645],
    ['67035', 5000, 4500, 10, 645],
  ] as const
).map(([pn, va, w, min, d]) => {
  const [ebmPn, ebmName] = e3perfEbm[va]!;
  return {
    partNumber: pn,
    name: `E3 Performance ${va} RT`,
    range: 'E3 Performance RT',
    tech: OP,
    ff: 'tower_rack',
    ru: 2,
    kva: va / 1000,
    kw: w / 1000,
    dims: [438, d, 88],
    runtime: { load: 0.5, min },
    ebm: { partNumber: ebmPn, name: `Battery Module E3 Performance ${ebmName}`, bps: 0 },
    page: 22,
  } satisfies Entry;
});

const e3pro: Entry[] = (
  [
    ['67314', '1000 RM', 1000, 800, 8, [438, 477, 44], 1, 'rack', undefined],
    ['67308', '1000 RT', 1000, 900, 10, [438, 310, 88], 2, 'tower_rack', 2],
    ['67309', '2000 RT', 2000, 1800, 10, [438, 410, 88], 2, 'tower_rack', 4],
    ['67310', '3000 RT', 3000, 2700, 10, [438, 630, 88], 2, 'tower_rack', 6],
    ['67319', '5000 RT', 5000, 4500, 20, [438, 530, 88], 2, 'tower_rack', undefined],
    ['67320', '6000 RT', 6000, 5400, 14, [438, 530, 88], 2, 'tower_rack', undefined],
    ['67321', '10k RT', 10000, 9000, 14, [438, 605, 133], 3, 'tower_rack', undefined],
  ] as const
).map(([pn, n, va, w, min, dims, ru, ff, bps]) => ({
  partNumber: pn,
  name: `E3 Pro ${n}`,
  range: 'E3 Pro',
  tech: DC,
  ff,
  ru,
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  voltages: [208, 220, 230, 240],
  runtime: { load: 0.5, min },
  bps,
  extendable: true,
  page: 23,
  notes: [
    ...(bps ? [`Tension batterie ${bps * 12} V déduite du chargeur Smart Charger associé.`] : []),
    ...(va >= 5000 ? ['Batteries dans un module séparé à partir de 5 kVA (non dessiné).'] : []),
    ...(pn === '67314'
      ? ['Référence 67314 également imprimée pour le M6Ti TX 80K (page 31) : à vérifier.']
      : []),
  ],
}));

const e7: Entry[] = (
  [
    ['67333', '1000 RT IEC', 1000, 10, 410],
    ['67334', '1500 RT IEC', 1500, 10, 410],
    ['67335', '2000 RT IEC', 2000, 10, 510],
    ['67336', '3000 RT IEC', 3000, 10, 630],
    ['67346', '5000 RT', 5000, 15, 610],
    ['67337', '6000 RT', 6000, 15, 610],
    ['67347', '8000 RT', 8000, 10, 610],
    ['67338', '10k RT', 10000, 10, 610],
  ] as const
).map(([pn, n, va, min, d]) => ({
  partNumber: pn,
  name: `E7 One ${n}`,
  range: 'E7 One RT',
  tech: DC,
  ff: 'tower_rack',
  ru: 2,
  kva: va / 1000,
  kw: va / 1000,
  dims: [438, d, 88],
  voltages: [200, 208, 220, 230, 240],
  runtime: { load: 0.5, min },
  extendable: true,
  parallel: va >= 5000 ? 3 : 1,
  page: 24,
  notes: va >= 5000 ? ['Batteries dans un module séparé à partir de 5 kVA (non dessiné).'] : [],
}));

const e4value: Entry[] = (
  [
    ['67417', 'VALUE 1000', 1000, 800, 10, [145, 282, 220]],
    ['67425', 'VALUE 1500', 1500, 1200, 12, [145, 397, 220]],
    ['67418', 'VALUE 2000', 2000, 1600, 14, [145, 397, 220]],
    ['67419', 'VALUE 3000', 3000, 2400, 10, [190, 421, 318]],
    ['67426', 'VALUE 4000', 4000, 3200, 20, [190, 369, 573]],
    ['67420', 'VALUE 5000', 5000, 4000, 15, [190, 369, 573]],
    ['67656', 'VALUE + 6000', 6000, 5400, 12, [190, 369, 688]],
    ['67657', 'VALUE + 10k', 10000, 9000, 15, [190, 442, 688]],
  ] as const
).map(([pn, n, va, w, min, dims]) => ({
  partNumber: pn,
  name: `E4 ${n}`,
  range: 'E4 Value',
  tech: DC,
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  voltages: [208, 220, 230, 240],
  runtime: { load: 0.5, min },
  page: 25,
  notes:
    pn === '67657'
      ? ['Le guide de sélection (page 9) indique 67321 pour le 10 kVA ; la page produit 67657.']
      : [],
}));

const e4pro: Entry[] = (
  [
    ['67689', 1000, 10, [145, 282, 220]],
    ['67690', 1500, 10, [145, 397, 220]],
    ['67691', 2000, 10, [145, 397, 220]],
    ['67692', 3000, 10, [190, 421, 318]],
    ['67629', 5000, 19, [190, 369, 688]],
    ['67630', 6000, 15, [190, 369, 688]],
    ['67631', 8000, 14, [190, 442, 688]],
    ['67632', 10000, 15, [190, 442, 688]],
  ] as const
).map(([pn, va, min, dims]) => ({
  partNumber: pn,
  name: `E4 Pro One ${va >= 10000 ? '10k' : va}`,
  range: 'E4 Pro One TM',
  tech: DC,
  ff: 'tower',
  kva: va / 1000,
  kw: va / 1000,
  dims: [...dims],
  voltages: [208, 220, 230, 240],
  runtime: { load: 0.5, min },
  extendable: va >= 2000,
  parallel: va >= 5000 ? 3 : 1,
  page: 26,
}));

const e4lcd: Entry[] = (
  [
    ['67508', 10, 8, 12, [190, 442, 688]],
    ['67509', 15, 12, 8, [190, 442, 688]],
    ['67517', 20, 16, 10, [250, 815, 826]],
  ] as const
).map(([pn, kva, kw, min, dims]) => ({
  partNumber: pn,
  name: `E4 LCD Pro ${kva}k TM`,
  range: 'E4 LCD Pro TM (tri/mono)',
  tech: DC,
  ff: 'tower',
  kva,
  kw,
  phIn: 3,
  phOut: 1,
  dims: [...dims],
  runtime: { load: 0.5, min },
  extendable: true,
  page: 27,
}));

const m5tDims = (kva: number): [number, number, number] =>
  kva <= 20 ? [250, 627, 826] : kva <= 60 ? [300, 815, 1000] : [600, 979, 1600];
const m5t: Entry[] = (
  [
    ['67658', 10],
    ['67659', 15],
    ['67660', 20],
    ['67661', 30],
    ['67662', 40],
    ['67663', 60],
    ['67687', 80],
    ['67664', 100],
    ['67665', 120],
    ['67688', 150],
    ['67666', 180],
    ['67667', 200],
  ] as const
).map(([pn, kva]) => ({
  partNumber: pn,
  name: `M5T ${kva}K`,
  range: 'M5T (tri/tri)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: m5tDims(kva),
  hasInternal: false,
  parallel: kva <= 60 ? 4 : 6,
  page: 28,
  notes: [
    ...(kva <= 60
      ? ['Batteries internes (10 à 30 min) non modélisées : armoires batteries externes retenues.']
      : []),
    ...(pn === '67665'
      ? ['Le guide de sélection (page 9) indique 67765 pour le 120 kVA ; la page produit 67665.']
      : []),
  ],
}));

const m6tiDims = (kva: number): [number, number, number] =>
  kva <= 60
    ? [320, 1000, 800]
    : kva <= 120
      ? [430, 1000, 1200]
      : kva <= 200
        ? [600, 1000, 1200]
        : [600, 1000, 1475];
const m6ti: Entry[] = (
  [
    ['69309', 60],
    ['69311', 80],
    ['69301', 100],
    ['69302', 120],
    ['69303', 180],
    ['69304', 200],
    ['69312', 240],
    ['69313', 300],
  ] as const
).map(([pn, kva]) => ({
  partNumber: pn,
  name: `M6Ti ${kva}K`,
  range: 'M6Ti (tri/tri)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: m6tiDims(kva),
  hasInternal: false,
  parallel: 4,
  page: 30,
}));

const m6titxDims: Record<number, [number, number, number]> = {
  60: [600, 1000, 1200],
  80: [430, 1000, 1200],
  100: [480, 1000, 1600],
  120: [480, 1000, 1600],
  180: [600, 1000, 2000],
  200: [600, 1000, 2000],
};
const m6titx: Entry[] = (
  [
    ['69310', 60],
    ['67314', 80],
    ['69305', 100],
    ['69306', 120],
    ['69307', 180],
    ['69308', 200],
  ] as const
).map(([pn, kva]) => ({
  partNumber: pn,
  name: `M6Ti TX ${kva}K`,
  range: 'M6Ti TX (transformateur d’isolement)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: m6titxDims[kva]!,
  hasInternal: false,
  parallel: 4,
  page: 31,
  notes:
    pn === '67314'
      ? ['Référence 67314 identique à celle de l’E3 Pro 1000 RM (page 23) : coquille probable.']
      : [],
}));

const mod3: Entry[] = [
  {
    partNumber: '67725',
    name: 'Mod3 C 10k TT',
    range: 'Mod3 C',
    tech: DC,
    ff: 'tower_rack',
    ru: 3,
    kva: 10,
    kw: 10,
    phIn: 3,
    phOut: 3,
    dims: [418, 678, 129],
    hasInternal: false,
    page: 32,
  },
  {
    partNumber: '67727',
    name: 'Mod3 C 10k TM',
    range: 'Mod3 C',
    tech: DC,
    ff: 'tower_rack',
    ru: 3,
    kva: 10,
    kw: 10,
    phIn: 3,
    phOut: 1,
    dims: [418, 678, 129],
    hasInternal: false,
    page: 32,
  },
  {
    partNumber: '',
    name: 'Mod3 C /10 TT (baie 19U)',
    range: 'Mod3 C',
    tech: MOD,
    ff: 'cabinet',
    kva: 40,
    kw: 40,
    phIn: 3,
    phOut: 3,
    dims: [443, 857, 849],
    hasInternal: false,
    modular: { moduleKVA: 10, moduleKW: 10, maxModules: 4 },
    page: 32,
    notes: ['Pas de référence produit imprimée pour la baie préconfigurée.'],
  },
  {
    partNumber: '',
    name: 'Mod3 C /10 TM (baie 19U)',
    range: 'Mod3 C',
    tech: MOD,
    ff: 'cabinet',
    kva: 20,
    kw: 20,
    phIn: 3,
    phOut: 1,
    dims: [443, 857, 849],
    hasInternal: false,
    modular: { moduleKVA: 10, moduleKW: 10, maxModules: 2 },
    page: 32,
    notes: ['Pas de référence produit imprimée pour la baie préconfigurée.'],
  },
];

const mod5t: Entry[] = [
  {
    partNumber: '',
    name: 'Mod5T E S 29U (jusqu’à 90 kVA)',
    range: 'Mod5T E',
    tech: MOD,
    ff: 'cabinet',
    kva: 90,
    kw: 90,
    phIn: 3,
    phOut: 3,
    dims: [515, 1100, 1522],
    hasInternal: false,
    parallel: 2,
    modular: { moduleKVA: 30, moduleKW: 30, maxModules: 3 },
    page: 33,
  },
  {
    partNumber: '',
    name: 'Mod5T S 30U (jusqu’à 180 kVA)',
    range: 'Mod5T',
    tech: MOD,
    ff: 'cabinet',
    kva: 180,
    kw: 180,
    phIn: 3,
    phOut: 3,
    dims: [600, 1100, 1475],
    hasInternal: false,
    parallel: 2,
    modular: { moduleKVA: 30, moduleKW: 30, maxModules: 6 },
    page: 33,
  },
  {
    partNumber: '',
    name: 'Mod5T S 42U (jusqu’à 600 kVA)',
    range: 'Mod5T',
    tech: MOD,
    ff: 'cabinet',
    kva: 600,
    kw: 600,
    phIn: 3,
    phOut: 3,
    dims: [1200, 1100, 2010],
    hasInternal: false,
    parallel: 2,
    modular: { moduleKVA: 60, moduleKW: 60, maxModules: 10 },
    page: 33,
  },
].map((e) => ({
  ...e,
  notes: [
    'Références des châssis Mod5T non lisibles sans ambiguïté (guide de sélection page 9) : à compléter.',
    'Taille et nombre de modules choisis parmi 20 / 30 / 50 / 60 kVA pour atteindre la puissance maximale publiée.',
  ],
}));

export const INFOSEC: BrandData = {
  key: 'infosec',
  brand: 'INFOSEC',
  idPrefix: 'INF',
  catalog: {
    title: 'INFOSEC Electrical Protection Catalog 2025',
    url: 'https://www.infosec-ups.com/',
  },
  entries: [
    ...x1,
    ...x3,
    ...x4,
    ...e2,
    ...e3evo,
    ...e3perf,
    ...e3pro,
    ...e7,
    ...e4value,
    ...e4pro,
    ...e4lcd,
    ...m5t,
    ...m6ti,
    ...m6titx,
    ...mod3,
    ...mod5t,
  ],
};
