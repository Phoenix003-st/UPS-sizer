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

const E3PERF_DOC = 'Fiche produit E3 Performance RT 800 à 5000 VA (2019)';
/** Modules batteries E3 Performance : référence, profondeur (mm), masse avec batteries (kg). */
const e3perfEbm: Record<number, [string, string, number, number]> = {
  800: ['67401', '800 RT', 515, 19.1],
  1100: ['67402', '1100 RT', 515, 20.6],
  1500: ['67405', '1500 RT', 515, 20.8],
  2000: ['67406', '2000 RT', 515, 30.43],
  2500: ['67408', '2500 RT', 635, 38.8],
  3000: ['67409', '3000/5000 RT', 635, 43.3],
  5000: ['67409', '3000/5000 RT', 635, 43.3],
};
const e3perf: Entry[] = (
  [
    // Référence, VA, W, autonomie à 50 % (catalogue), profondeur, masse, blocs 12 V, rendement batterie
    ['67023', 800, 720, 12, 425, 12.9, 2, 0.89],
    ['67024', 1100, 990, 12, 425, 13.4, 2, 0.89],
    ['67025', 1500, 1350, 13, 525, 19.5, 4, 0.91],
    ['67026', 2000, 1800, 12, 525, 21.5, 4, 0.91],
    ['67027', 2500, 2250, 12, 645, 26, 6, 0.92],
    ['67028', 3000, 2700, 10, 645, 29.3, 6, 0.92],
    ['67035', 5000, 4500, 10, 645, 39.8, 6, 0.92],
  ] as const
).map(([pn, va, w, min, d, kg, bps, effBatt]) => {
  const [ebmPn, ebmName, ebmD, ebmKg] = e3perfEbm[va]!;
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
    kg,
    noise: 45,
    effBatt,
    effEco: 0.97,
    chargeA: 1.5,
    voltages: [208, 220, 230, 240],
    runtime: { load: 0.5, min },
    bps,
    ebm: {
      partNumber: ebmPn,
      name: `Battery Module E3 Performance ${ebmName}`,
      bps: 0,
      dims: [438, ebmD, 88],
      kg: ebmKg,
    },
    page: 22,
    doc: E3PERF_DOC,
    notes: [
      `Tension batterie ${bps * 12} V d’après la tension de charge de la fiche produit.`,
      'Rendement en mode batterie et ECO de la fiche produit (230 V).',
    ],
  } satisfies Entry;
});

const E3PRO_DOC = 'Fiche produit E3 Pro 1000 à 10k VA (2019)';
/** Modules batteries E3 Pro : référence, dimensions, masse à vide, masse avec batteries. */
type E3ProEbm = [string, [number, number, number], number, number];
const e3pro: Entry[] = (
  [
    // Référence, nom, VA, W, autonomie à 50 % (catalogue), dimensions, U, format, blocs 12 V,
    // masse, rendement secteur / batterie / ECO, courant de charge, bruit, module batteries
    [
      '67314',
      '1000 RM',
      1000,
      800,
      8,
      [438, 477, 44],
      1,
      'rack',
      undefined,
      12.7,
      0.86,
      0.83,
      0.92,
      1,
      50,
      undefined,
    ],
    [
      '67308',
      '1000 RT',
      1000,
      900,
      10,
      [438, 310, 88],
      2,
      'tower_rack',
      2,
      12.7,
      0.88,
      0.83,
      0.9,
      3.5,
      50,
      ['67402', [438, 515, 88], 9, 20.6],
    ],
    [
      '67309',
      '2000 RT',
      2000,
      1800,
      10,
      [438, 410, 88],
      2,
      'tower_rack',
      4,
      19,
      0.89,
      0.87,
      0.92,
      3.5,
      50,
      ['67406', [438, 515, 88], 9, 31.1],
    ],
    [
      '67310',
      '3000 RT',
      3000,
      2700,
      10,
      [438, 638, 88],
      2,
      'tower_rack',
      6,
      29.3,
      0.9,
      0.88,
      0.93,
      3.5,
      50,
      ['67409', [438, 635, 88], 11, 43.3],
    ],
    [
      '67319',
      '5000 RT',
      5000,
      4500,
      20,
      [438, 530, 88],
      2,
      'tower_rack',
      undefined,
      15 + 47,
      0.92,
      0.9,
      null,
      6,
      55,
      ['67187', [438, 740, 88], 13.4, 47],
    ],
    [
      '67320',
      '6000 RT',
      6000,
      5400,
      14,
      [438, 530, 88],
      2,
      'tower_rack',
      undefined,
      15 + 47,
      0.92,
      0.9,
      null,
      6,
      55,
      ['67187', [438, 740, 88], 13.4, 47],
    ],
    [
      '67321',
      '10k RT',
      10000,
      9000,
      14,
      [438, 605, 133],
      3,
      'tower_rack',
      undefined,
      18 + 63,
      0.93,
      0.91,
      null,
      6,
      58,
      ['67189', [438, 630, 133], 13, 63],
    ],
  ] as const
).map(
  ([pn, n, va, w, min, dims, ru, ff, bps, kg, effFull, effBatt, effEco, chargeA, noise, ebm]) => {
    const e: Entry = {
      partNumber: pn,
      name: `E3 Pro ${n}`,
      range: 'E3 Pro',
      tech: DC,
      ff,
      ru,
      kva: va / 1000,
      kw: w / 1000,
      dims: [...dims],
      kg,
      noise,
      effFull,
      effBatt,
      effEco,
      chargeA,
      voltages: [208, 220, 230, 240],
      runtime: { load: 0.5, min },
      bps,
      extendable: true,
      page: 23,
      doc: E3PRO_DOC,
      notes: [
        ...(bps
          ? [`Tension batterie ${bps * 12} V déduite du chargeur Smart Charger associé.`]
          : []),
        ...(va >= 5000
          ? [
              `Batteries dans un pack séparé (${ebm![0]}, ${ebm![1][1]} × ${ebm![1][0]} × ${ebm![1][2]} mm, non dessiné) ; masse = onduleur ${kg - ebm![3]} kg + pack ${ebm![3]} kg.`,
            ]
          : []),
        ...(pn === '67308' ? ['Module batteries 67403 (31,1 kg) également proposé.'] : []),
      ],
    };
    if (ebm) {
      const [ebmPn, ebmDims, emptyKg, ebmKg] = ebm as E3ProEbm;
      e.ebm = {
        partNumber: ebmPn,
        name: `Battery Module E3 Pro ${n}`,
        bps: 0,
        dims: [...ebmDims],
        kg: ebmKg,
        emptyKg,
      };
    }
    return e;
  },
);

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
      ? [
          'Le guide de sélection (page 9) indique 67321, qui est l’E3 Pro 10k RT d’après sa fiche produit.',
        ]
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

const M5T_DOC = 'Fiche produit M5T 10k à 200 kVA (07/2021)';
const m5tDims = (kva: number): [number, number, number] =>
  kva <= 20 ? [250, 627, 826] : kva <= 60 ? [300, 815, 1000] : [600, 979, 1600];
const m5t: Entry[] = (
  [
    // Référence (standard ou S), référence WOB, kVA, masse sans batteries, courant de charge, bruit
    ['67658', '67670', 10, 41, 12, 55],
    ['67659', '67668', 15, 45, 12, 60],
    ['67660', '67669', 20, 45, 12, 60],
    ['67661', '67671', 30, 78, 12, 70],
    ['67662', '67672', 40, 80, 12, 65],
    ['67663', undefined, 60, 87, 18, 70],
    ['67687', undefined, 80, undefined, undefined, undefined],
    ['67664', undefined, 100, 250, 36, 70],
    ['67665', undefined, 120, 250, 36, 70],
    ['67688', undefined, 150, undefined, undefined, undefined],
    ['67666', undefined, 180, 309, 54, 70],
    ['67667', undefined, 200, 311, 54, 70],
  ] as const
).map(([pn, wob, kva, kg, chargeA, noise]) => ({
  partNumber: wob
    ? `${pn} (avec batteries internes) / ${wob} (WOB, sans batteries)`
    : kva === 80 || kva === 150
      ? pn
      : `${pn} (S)`,
  name: `M5T ${kva}K${wob ? '' : ' S'}`,
  range: 'M5T (tri/tri)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: m5tDims(kva),
  ...(kg !== undefined ? { kg } : {}),
  ...(chargeA !== undefined ? { chargeA } : {}),
  ...(noise !== undefined ? { noise } : {}),
  ...(kva === 80 || kva === 150
    ? {}
    : {
        effFull: kva <= 40 ? 0.94 : 0.96,
        effBatt: kva <= 40 ? 0.935 : 0.96,
        effEco: kva <= 40 ? 0.97 : 0.99,
        doc: M5T_DOC,
      }),
  hasInternal: false,
  parallel: kva <= 40 ? 4 : 6,
  page: 28,
  notes: [
    ...(wob
      ? [
          'Modèle standard à batteries internes (autonomie selon la charge, non publiée) : version WOB sans batteries retenue, avec armoires batteries externes.',
        ]
      : []),
    ...(kva <= 20 ? ['Configurable en tri/mono (3/1).'] : []),
    ...(kva === 80 || kva === 150
      ? ['Puissance absente de la fiche produit M5T : valeurs du catalogue général.']
      : []),
  ],
}));

/** Fiche M6Ti / M6Ti S / M6Ti TX (2026), page du tableau. */
const m6Doc = (page: number) => `Fiche produit M6Ti / M6Ti S / M6Ti TX (2026), p. ${page}`;
/** Rendements secteur / ECO / batterie : modules de 60 kVA (et 50, 67) ou de 80 kVA. */
const m6Eff = (module80: boolean) =>
  module80
    ? { effFull: 0.96, effEco: 0.99, effBatt: 0.955 }
    : { effFull: 0.95, effEco: 0.98, effBatt: 0.94 };

const m6tiSDims = (kva: number): [number, number, number] =>
  kva <= 60
    ? [320, 1000, 800]
    : kva <= 160
      ? [430, 1000, 1200]
      : kva <= 200
        ? [600, 1000, 1200]
        : kva <= 320
          ? [600, 1000, 1475]
          : [600, 1100, 2000];
const m6ti: Entry[] = (
  [
    // Référence, kVA, modules de puissance (kVA × nombre), masse sans batteries, courant de charge
    ['69309', 60, 60, 1, 94, 18],
    ['69311', 80, 80, 1, 133, 18],
    ['69301', 100, 50, 2, 169, 24],
    ['69302', 120, 60, 2, 169, 36],
    ['69315', 160, 80, 2, 195, 36],
    ['69303', 180, 60, 3, 249, 54],
    ['69304', 200, 67, 3, 249, 54],
    ['69312', 240, 80, 3, 368, 54],
    ['69313', 300, 60, 5, 396, 90],
    ['69316', 320, 80, 4, 412, 72],
    ['69317', 400, 80, 5, 532, 90],
  ] as const
).map(([pn, kva, mod, n, kg, chargeA]) => ({
  partNumber: pn,
  name: `M6Ti S ${kva}K`,
  range: 'M6Ti S (tri/tri)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: m6tiSDims(kva),
  kg,
  noise: 75,
  ...m6Eff(mod === 80),
  chargeA,
  hasInternal: false,
  bpsAllowed: [32, 40],
  parallel: 4,
  page: 30,
  doc: m6Doc(10),
  notes: [`Modules de puissance : ${n} × ${mod} kVA.`],
}));

/** M6Ti à batteries internes : version SB (sans batteries) retenue, armoires externes. */
const m6tiSb: Entry[] = (
  [
    // Référence SB, référence avec batteries, kVA, modules, masse sans batteries, courant de charge
    ['69322', '69325', 60, 60, 1, 255, 18],
    ['69318', '69320', 80, 80, 1, 297, 18],
    ['69323', '69326', 100, 60, 2, 383, 24],
    ['69324', '69327', 120, 60, 2, 425, 36],
    ['69319', '69321', 160, 80, 2, 432, 36],
  ] as const
).map(([pn, ab, kva, mod, n, kg, chargeA]) => ({
  partNumber: `${pn} (SB, sans batteries) / ${ab} (avec batteries internes)`,
  name: `M6Ti ${kva}K SB`,
  range: 'M6Ti (tri/tri)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: kva <= 80 ? [600, 1000, 1475] : [600, 1000, 2000],
  kg,
  noise: 75,
  ...(kva === 100 || kva === 120
    ? { effFull: 0.955, effEco: 0.985, effBatt: 0.945 }
    : m6Eff(mod === 80)),
  chargeA,
  hasInternal: false,
  bpsAllowed: [32, 40],
  parallel: 4,
  page: 30,
  doc: m6Doc(8),
  notes: [
    `Modules de puissance : ${n} × ${mod} kVA.`,
    'Version à batteries internes : autonomie non publiée, non modélisée.',
  ],
}));

const m6titx: Entry[] = (
  [
    // Référence, kVA, dimensions, masse sans batteries, courant de charge, modules
    ['69310', 60, [600, 1000, 1200], 334, 18, '1 × 60'],
    ['69314', 80, [480, 1000, 1600], 515, 24, '2 × 50'],
    ['69305', 100, [480, 1000, 1600], 517, 24, '2 × 50'],
    ['69306', 120, [480, 1000, 1600], 557, 36, '2 × 60'],
    ['69307', 180, [600, 1000, 2000], 826, 54, '3 × 60'],
    ['69308', 200, [600, 1000, 2000], 866, 54, '3 × 67'],
  ] as const
).map(([pn, kva, dims, kg, chargeA, modules]) => ({
  partNumber: pn,
  name: `M6Ti TX ${kva}K`,
  range: 'M6Ti TX (transformateur d’isolement)',
  tech: DC,
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: [...dims],
  kg,
  noise: 75,
  effFull: 0.923,
  effEco: 0.958,
  effBatt: 0.913,
  chargeA,
  hasInternal: false,
  bpsAllowed: [32, 40],
  parallel: 4,
  page: 31,
  doc: m6Doc(12),
  notes: [`Modules de puissance : ${modules} kVA.`],
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

const MOD5T_DOC = 'Fiche produit Mod5T & Mod5T E (2026)';
/** Modules de puissance Mod5T : masse (kg) et courant de charge (A) par module. */
const mod5tModule: Record<number, { kg: number; chargeA: number }> = {
  20: { kg: 34, chargeA: 6 },
  30: { kg: 34.5, chargeA: 8 },
  50: { kg: 39, chargeA: 12 },
  60: { kg: 44, chargeA: 20 },
};
/**
 * Versions S / SB (sans batteries intégrées, armoires externes), une fiche par armoire et taille de
 * module, à sa configuration maximale. Dimensions « L x l x h » de la fiche = profondeur × largeur ×
 * hauteur ; masse = armoire vide, sans modules.
 */
const mod5t: Entry[] = (
  [
    ['Mod5T E 60/20 S (15U)', 'Mod5T E', 20, 3, [515, 1100, 761], 74],
    ['Mod5T E 90/30 S (15U)', 'Mod5T E', 30, 3, [515, 1100, 761], 77],
    ['Mod5T 120/20 S (30U)', 'Mod5T', 20, 6, [600, 1100, 1475], 186],
    ['Mod5T 180/30 S (30U)', 'Mod5T', 30, 6, [600, 1100, 1475], 230.5],
    ['Mod5T 180/60 S (30U)', 'Mod5T', 60, 3, [600, 1100, 1475], 300],
    ['Mod5T 300/30 S (42U)', 'Mod5T', 30, 10, [600, 1100, 2010], 275],
    ['Mod5T 500/50 (42U)', 'Mod5T', 50, 10, [1000, 1065, 2000], 810],
    ['Mod5T 300/60 S (42U)', 'Mod5T', 60, 5, [600, 1100, 2010], 510],
    ['Mod5T 600/60 S (42U)', 'Mod5T', 60, 10, [1200, 1100, 2010], 1020],
  ] as const
).map(([name, range, mod, n, dims, kg]) => ({
  partNumber: '',
  name,
  range,
  tech: MOD,
  ff: 'cabinet',
  kva: mod * n,
  kw: mod * n,
  phIn: 3,
  phOut: 3,
  dims: [...dims],
  kg,
  noise: range === 'Mod5T E' ? 70 : 75,
  // « Jusqu’à 94,5 % – 96 % pour les Mod5T 120 à 600/60 S »
  effFull: mod === 60 ? 0.96 : 0.945,
  chargeA: mod5tModule[mod]!.chargeA * n,
  hasInternal: false,
  bps: 40,
  parallel: 2,
  modular: { moduleKVA: mod, moduleKW: mod, maxModules: n, moduleKg: mod5tModule[mod]!.kg },
  page: 33,
  doc: MOD5T_DOC,
  notes: [
    'Pas de référence produit pour l’armoire dans la fiche.',
    'Batteries 240 V (40 blocs de 12 V) en armoires externes ; armoires INFOSEC 67712 à 67721 non modélisées.',
    ...(range === 'Mod5T E'
      ? ['Profondeur de l’armoire 15U imprimée « 111 mm » dans la fiche : 1100 mm retenus.']
      : []),
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
    ...m6tiSb,
    ...m6titx,
    ...mod3,
    ...mod5t,
  ],
};
