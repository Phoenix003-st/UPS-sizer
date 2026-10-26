/**
 * Eaton — « Backup and Power Protection Products » catalogue 2022–2023, Australie / Nouvelle-Zélande
 * (fichier eaton_ups_product_catalogue_en-gb-anz.pdf). Références produit des pages produit, à
 * défaut du guide de sélection (p. 3). Modèles du marché ANZ : prises AU, sortie 240 V fixe sur les
 * 5S et 5SX.
 *
 * Non repris : 3S (off-line), 5E, 5P et 9PX lithium, 9SX 15/20 kVA (module de puissance rack à
 * associer à des jeux de batteries), 93PM (dimensions non publiées), 93PR 300–1200 kW, gammes
 * marine / industrielles, accessoires.
 */
import type { BrandData, Entry } from './types';

const ADJ = [200, 208, 220, 230, 240];

const s5: Entry[] = (
  [
    ['5S550AU', 550, 330, 260, 4.96, 10],
    ['5S700AU', 700, 420, 260, 5.98, 9],
    ['5S850AU', 850, 510, 260, 6.5, 9],
    ['5S1200AU', 1200, 750, 382, 9.48, 9],
    ['5S1600AU', 1600, 1000, 382, 11.08, 9],
  ] as const
).map(([pn, va, w, d, kg, min]) => ({
  partNumber: pn,
  name: `5S ${va}`,
  range: '5S',
  tech: 'line_interactive',
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [87, d, 250],
  kg,
  voltages: [240],
  runtime: { load: 0.5, min },
  page: 8,
  notes: [
    'Modèle ANZ, sortie 240 V.',
    'Profondeur 260 / 382 mm attribuée selon la masse (le tableau ne précise pas les colonnes).',
  ],
}));

const s5sc: Entry = {
  partNumber: '5SC1500IR-AU',
  name: '5SC 1500 rack 2U',
  range: '5SC',
  tech: 'line_interactive',
  ff: 'rack',
  ru: 2,
  kva: 1.5,
  kw: 1.05,
  dims: [440, 405, 86],
  kg: 17.8,
  noise: 45,
  runtime: { load: 0.5, min: 13 },
  page: 8,
  notes: ['Référence lue dans le guide de sélection (p. 3).'],
};

const p5: Entry[] = (
  [
    ['5P650AU', '5P650iR', 650, 420, 345, 7.8, 364, 8.6, 9, 35],
    ['5P850AU', '5P850iR', 850, 600, 345, 10.4, 509, 13.8, 12, 35],
    ['5P1150AU', '5P1150iR', 1150, 770, 345, 11.1, 509, 14.6, 12, 35],
    ['5P1550AU', '5P1550iR', 1550, 1100, 445, 15.6, 554, 19.4, 13, 40],
  ] as const
).flatMap(([tower, rack, va, w, dT, kgT, dR, kgR, min, amb]) => {
  const common = {
    range: '5P',
    tech: 'line_interactive',
    kva: va / 1000,
    kw: w / 1000,
    noise: 40,
    voltages: ADJ,
    ambientMax: amb,
    runtime: { load: 0.5, min },
    page: 9,
    notes:
      amb === 35
        ? ['Température maximale 35 °C (le catalogue se contredit pour le 1550 : 35 et 40 °C).']
        : [],
  } as const;
  return [
    {
      ...common,
      partNumber: tower,
      name: `5P ${va} tour`,
      ff: 'tower',
      dims: [150, dT, 230],
      kg: kgT,
    },
    {
      ...common,
      partNumber: rack,
      name: `5P ${va} rack 1U`,
      ff: 'rack',
      ru: 1,
      dims: [438, dR, 43],
      kg: kgR,
    },
  ] satisfies Entry[];
});

const sx5: Entry[] = (
  [
    ['5SX1250AU', 1250, 1125, 522, 25.4, 5, 4, '5SXEBM48R2U'],
    ['5SX1750AU', 1750, 1575, 522, 26.6, 3.7, 4, '5SXEBM48R2U'],
    ['5SX3000AU', 3000, 2700, 647, 35.3, 2.4, 6, '5SXEBM72R2U'],
  ] as const
).map(([pn, va, w, d, kg, min, bps, ebm]) => ({
  partNumber: pn,
  name: `5SX ${va}`,
  range: '5SX',
  tech: 'line_interactive',
  ff: 'tower_rack',
  ru: 2,
  kva: va / 1000,
  kw: w / 1000,
  dims: [86, d, 441],
  kg,
  noise: 40,
  voltages: [240],
  runtime: { load: 1, min },
  bps,
  ebm: { partNumber: ebm, name: `5SX EBM ${bps * 12} V rack 2U`, bps },
  page: 11,
  notes: [
    'Modèle ANZ, sortie 240 V. Autonomie publiée à 100 % de charge.',
    `Tension batterie déduite de l'EBM associé (${ebm}). Le guide de sélection écrit ${pn.replace('AU', 'RAU')}.`,
  ],
}));

const px5: Entry[] = (
  [
    ['5PX1500IRT2UAUG2', 1500, 448, 86, 22.4, 2, { W: 800, min: 13 }, 4],
    ['5PX2000IRT2UAUG2', 2000, 603, 86, 28, 2, { W: 1200, min: 9 }, 6],
    ['5PX2200IRT2UAUG2', 2200, 603, 86, 28.2, 2, { W: 1200, min: 9 }, 6],
    ['5PX3000IRT2UAUG2', 3000, 603, 86, 31.7, 2, { W: 1800, min: 7 }, 6],
    ['5PX3000IRT3UAUG2', 3000, 483, 129, 31.1, 3, { W: 1800, min: 7 }, 6],
  ] as const
).map(([pn, va, d, h, kg, ru, runtime, bps]) => ({
  partNumber: pn,
  name: `5PX Gen 2 ${va} RT${ru}U`,
  range: '5PX Gen 2',
  tech: 'line_interactive',
  ff: 'tower_rack',
  ru,
  kva: va / 1000,
  kw: va / 1000,
  dims: [438, d, h],
  kg,
  noise: 40,
  voltages: ADJ,
  runtime,
  bps,
  ebm:
    bps === 4
      ? {
          partNumber: '5PXEBM48RT2UG2',
          name: '5PX EBM 48 V RT2U',
          bps,
          dims: [438, 448, 86],
          kg: 27.8,
        }
      : ru === 3
        ? {
            partNumber: '5PXEBM72RT3UG2',
            name: '5PX EBM 72 V RT3U',
            bps,
            dims: [438, 483, 129],
            kg: 39.7,
          }
        : {
            partNumber: '5PXEBM72RT2UG2',
            name: '5PX EBM 72 V RT2U',
            bps,
            dims: [438, 603, 86],
            kg: 40.4,
          },
  page: 12,
  notes: [`Tension batterie déduite de l'EBM associé.`],
}));

const e9: Entry[] = (
  [
    ['9E1000IAU', 1000, 800, [144, 356, 228], 9.5, 11, 37, false],
    ['9E2000IAU', 2000, 1600, [190, 399, 330], 22.4, 16, 40, true],
    ['9E3000IAU', 3000, 2400, [190, 399, 330], 24.2, 13.4, 40, true],
    ['9E6KI', 6000, 4800, [262, 613, 709], 68, 20, 55, true],
    ['9E10KI', 10000, 8000, [262, 613, 709], 85.4, 15, 55, true],
    ['9E15KI', 15000, 12000, [350, 706, 816], 145.3, 16, 55, true],
    ['9E20KI', 20000, 16000, [350, 706, 816], 159.9, 15, 55, true],
  ] as const
).map(([pn, va, w, dims, kg, min, noise, ext]) => ({
  partNumber: pn,
  name: `9E ${va >= 6000 ? `${va / 1000}k` : va}`,
  range: '9E',
  tech: 'online_double_conversion',
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  kg,
  noise,
  effFull: va >= 6000 ? 0.93 : 0.91,
  voltages: [208, 220, 230, 240],
  runtime: { load: 0.5, min },
  ...(va === 2000 || va === 3000
    ? {
        bps: 6,
        ebm: {
          partNumber: '9EEBM72',
          name: '9E EBM 72 V',
          bps: 6,
          dims: [190, 399, 327],
          kg: 35.8,
        },
      }
    : { extendable: ext }),
  page: 13,
  notes: [
    ...(va === 1000 ? ['La colonne est titrée « 1500VA » mais indique 1000VA/800W.'] : []),
    ...(va >= 10000
      ? ['Entrée combinée mono ou tri (3:1 / 1:1) : modélisé en entrée monophasée.']
      : []),
    ...(va === 2000 || va === 3000 ? ['Tension batterie déduite de l’EBM 9EEBM72.'] : []),
    'Rendement publié « jusqu’à » ; références lues dans le guide de sélection (p. 3).',
  ],
}));

const sx9: Entry[] = (
  [
    ['9SX700I-AU', 700, 630, [160, 357, 252], 11.5, { W: 300, min: 14 }, 40, false],
    ['9SX1000I-AU', 1000, 900, [160, 387, 252], 14.8, { W: 500, min: 14 }, 41, true],
    ['9SX1500I-AU', 1500, 1350, [160, 437, 252], 18.5, { W: 800, min: 12 }, 43, true],
    ['9SX2000I-AU', 2000, 1800, [214, 412, 346], 33.3, { W: 800, min: 22 }, 45, true],
    ['9SX3000I-AU', 3000, 2700, [214, 412, 346], 33.4, { W: 1200, min: 17 }, 45, true],
    ['9SX6KI-AU', 6000, 5400, [244, 542, 575], 65.5, { W: 2500, min: 6 }, 46, true],
  ] as const
).map(([pn, va, w, dims, kg, runtime, noise, ext]) => ({
  partNumber: pn,
  name: `9SX ${va >= 6000 ? '6k' : va} tour`,
  range: '9SX',
  tech: 'online_double_conversion',
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  kg,
  noise,
  runtime,
  extendable: ext,
  page: 14,
  notes: ext ? ['EBM publié sans référence : module générique.'] : [],
}));

const px9: Entry[] = (
  [
    [
      '9PX1000IRT2UANZ',
      1000,
      1000,
      [440, 450, 87],
      17.4,
      2,
      { W: 500, min: 16 },
      4,
      '9PXEBM48RT2U',
    ],
    [
      '9PX1500IRT2UANZ',
      1500,
      1500,
      [440, 450, 87],
      18.9,
      2,
      { W: 800, min: 13 },
      4,
      '9PXEBM48RT2U',
    ],
    ['9PX2000IRTAU', 2000, 1800, [440, 605, 87], 27.4, 2, { W: 900, min: 12 }, 6, '9PXEBM72RT2U'],
    ['9PX2200IRT2UANZ', 2200, 2200, [440, 605, 87], 25, 2, { W: 1200, min: 9 }, 6, '9PXEBM72RT2U'],
    [
      '9PX3000IRT2UANZ',
      3000,
      3000,
      [440, 605, 87],
      27.6,
      2,
      { W: 1800, min: 7 },
      6,
      '9PXEBM72RT2U',
    ],
    [
      '9PX2200IRT3UANZ',
      2200,
      2200,
      [440, 485, 130],
      24.5,
      3,
      { W: 1200, min: 9 },
      6,
      '9PXEBM72RT3U',
    ],
    [
      '9PX3000IRT3UANZ',
      3000,
      3000,
      [440, 485, 130],
      27.4,
      3,
      { W: 1800, min: 7 },
      6,
      '9PXEBM72RT3U',
    ],
  ] as const
).map(([pn, va, w, dims, kg, ru, runtime, bps, ebm]) => ({
  partNumber: pn,
  name: `9PX ${va} RT${ru}U`,
  range: '9PX',
  tech: 'online_double_conversion',
  ff: 'tower_rack',
  ru,
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  kg,
  voltages: ADJ,
  runtime,
  bps,
  ebm: {
    partNumber: ebm,
    name: `9PX EBM ${bps * 12} V RT${ebm.endsWith('3U') ? 3 : 2}U`,
    bps,
    dims: ebm.endsWith('3U') ? [440, 485, 130] : bps === 4 ? [440, 450, 87] : [440, 605, 87],
    kg: ebm.endsWith('3U') ? 38.2 : bps === 4 ? 29.8 : 39.2,
  },
  page: va === 2000 ? 15 : 16,
  notes: ['Tension batterie déduite de l’EBM associé.'],
}));

const px9l: Entry[] = [
  {
    partNumber: '9PX5Ki',
    name: '9PX 5k RT3U',
    range: '9PX 5–11 kVA',
    tech: 'online_double_conversion',
    ff: 'tower_rack',
    ru: 3,
    kva: 5,
    kw: 4.5,
    dims: [440, 685, 130],
    kg: 48,
    noise: 45,
    effFull: 0.95,
    runtime: { load: 0.5, min: 13 },
    extendable: true,
    page: 18,
  },
  {
    partNumber: '9PX6Ki',
    name: '9PX 6k RT3U',
    range: '9PX 5–11 kVA',
    tech: 'online_double_conversion',
    ff: 'tower_rack',
    ru: 3,
    kva: 6,
    kw: 5.4,
    dims: [440, 685, 130],
    kg: 48,
    noise: 45,
    effFull: 0.95,
    runtime: { load: 0.5, min: 11 },
    extendable: true,
    page: 18,
  },
  ...(
    [
      ['9PX8KiPM', 8, 7.2, 20, 48],
      ['9PX11KiPM', 11, 10, 13, 50],
    ] as const
  ).map(([pn, kva, kw, min, noise]): Entry => ({
    partNumber: `${pn} + 9PXEBM240`,
    name: `9PX ${kva}k RT6U + EBM`,
    range: '9PX 5–11 kVA',
    tech: 'online_double_conversion',
    ff: 'tower_rack',
    ru: 6,
    kva,
    kw,
    dims: [440, 700, 260],
    kg: kva === 8 ? 84 : undefined,
    noise,
    effFull: 0.95,
    runtime: { load: 0.5, min },
    bps: 20,
    ebm: {
      partNumber: '9PXEBM240',
      name: '9PX EBM 240 V RT3U',
      bps: 20,
      strings: 1,
      dims: [440, 680, 130],
      kg: 65,
    },
    page: 18,
    notes: [
      'Module de puissance livré avec un EBM 9PXEBM240 (guide de sélection) : batterie de base modélisée en interne.',
    ],
  })),
].map((e) => ({ ...e, voltages: ADJ }));

const ps93: Entry[] = ([8, 10, 15, 20, 30, 40] as const).map((kw) => ({
  partNumber: '',
  name: `93PS ${kw} kW`,
  range: '93PS',
  tech: 'online_double_conversion',
  ff: 'cabinet',
  kva: kw,
  kw,
  phIn: 3,
  phOut: 3,
  dims: kw <= 20 ? [335, 750, 1300] : [480, 750, 1750],
  effFull: 0.96,
  bps: 32,
  hasInternal: false,
  parallel: 4,
  page: 21,
  notes: [
    'Pas de référence produit publiée. Châssis 20 kW (8–20 kW) ou 40 kW (30–40 kW).',
    'Batteries internes possibles (32 blocs, 384 V) : armoires externes retenues.',
  ],
}));

const e93: Entry[] = (
  [
    [15, 13.5, 72, 55],
    [20, 18, 72, 55],
    [30, 27, 91, 62],
    [40, 36, 120, 62],
    [60, 54, 202, 65],
    [80, 72, 245, 65],
    [100, 90, 283, 65],
    [120, 108, 311, 65],
    [160, 144, 457, 70],
    [200, 180, 457, 70],
  ] as const
).map(([kva, kw, kg, noise]) => ({
  partNumber: '',
  name: `93E ${kva} kVA`,
  range: '93E',
  tech: 'online_double_conversion',
  ff: 'cabinet',
  kva,
  kw,
  phIn: 3,
  phOut: 3,
  dims: [600, 800, 1876],
  kg,
  noise,
  effFull: 0.94,
  bpsAllowed: [32, 34, 36, 38, 40],
  hasInternal: false,
  parallel: 4,
  page: 22,
  notes: ['Pas de référence produit publiée. Masse sans batteries internes.'],
}));

const pr93: Entry[] = [
  {
    partNumber: '9016-9295',
    name: '93PR châssis 75 kW (3 × UPM 25 kW)',
    range: '93PR',
    tech: 'modular',
    ff: 'cabinet',
    kva: 75,
    kw: 75,
    phIn: 3,
    phOut: 3,
    dims: [603, 1013, 2050],
    kg: 468,
    effFull: 0.97,
    hasInternal: false,
    modular: { moduleKVA: 25, moduleKW: 25, maxModules: 3, moduleKg: 28 },
    page: 24,
    notes: [
      'Châssis à batteries internes (masse publiée avec batteries) : armoires externes retenues.',
      'Module UPM 25 kW : réf. 730-80492-00P.',
    ],
  },
  {
    partNumber: '9106-42218-00P',
    name: '93PR châssis 200 kW (8 × UPM 25 kW)',
    range: '93PR',
    tech: 'modular',
    ff: 'cabinet',
    kva: 200,
    kw: 200,
    phIn: 3,
    phOut: 3,
    dims: [603, 1013, 2050],
    kg: 310,
    effFull: 0.97,
    hasInternal: false,
    modular: { moduleKVA: 25, moduleKW: 25, maxModules: 8, moduleKg: 28 },
    page: 24,
    notes: [
      'Module UPM 25 kW : réf. 730-80492-00P. Version avec bypass de maintenance : 9106-42217-00P.',
    ],
  },
];

const p9395: Entry[] = (
  [
    [300, [1350, 880, 1880], 830, 78],
    [600, [1890, 880, 1880], 1440, 81],
    [900, [3710, 880, 1880], 2680, 83],
    [1200, [4450, 880, 1880], 3120, 85],
  ] as const
).map(([kva, dims, kg, noise]) => ({
  partNumber: '',
  name: `9395P ${kva} kVA`,
  range: '9395P',
  tech: 'online_double_conversion',
  ff: 'cabinet',
  kva,
  kw: kva,
  phIn: 3,
  phOut: 3,
  dims: [...dims],
  kg,
  noise,
  effFull: 0.956,
  bps: 40,
  hasInternal: false,
  parallel: 8,
  page: 25,
  notes: ['Pas de référence produit publiée.'],
}));

export const EATON: BrandData = {
  key: 'eaton',
  brand: 'EATON',
  idPrefix: 'EAT',
  catalog: {
    title: 'Eaton Backup and Power Protection Products 2022–2023 (Australie / NZ)',
    url: 'https://www.eaton.com/',
  },
  entries: [
    ...s5,
    s5sc,
    ...p5,
    ...sx5,
    ...px5,
    ...e9,
    ...sx9,
    ...px9,
    ...px9l,
    ...ps93,
    ...e93,
    ...pr93,
    ...p9395,
  ],
};
