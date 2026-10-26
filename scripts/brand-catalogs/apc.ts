/**
 * APC by Schneider Electric — catalogue de distributeur (SabMatic, fichier APC-Catalogue.pdf, pages
 * scannées). Gammes anciennes : Smart-UPS SUA, SUA RM, Smart-UPS RT (SURT), Smart-UPS VT (SUVT).
 * Dimensions converties de « H*W*D » en largeur × profondeur × hauteur.
 *
 * Non repris faute de données exploitables (ni dimensions, ni batteries, ni puissance détaillée) :
 * Back-UPS, Smart-UPS SUA XL / UXI (batterie externe seule), SURT15KUXI / SURT20KUXI (tri/mono),
 * Symmetra LX, Symmetra PX, Galaxy 5000 / 6000 / 7000 / 9000 / PW (références seulement).
 * Le catalogue mêle des produits d'autres marques (onduleurs « Online C / 3C3EX », PG Inverter) :
 * ils ne sont pas repris.
 */
import type { BrandData, Entry } from './types';

const btu = (x: number) => Math.round(x * 0.293);

const sua: Entry[] = (
  [
    ['SUA750I', 750, 500, [137, 358, 157], 13.2, 'EX-VRLA-12V7', 2, 41, 90],
    ['SUA1000I', 1000, 670, [170, 439, 216], 19.1, 'EX-VRLA-12V12', 2, 41, 100],
    ['SUA1500I', 1500, 980, [170, 439, 216], 24.1, 'EX-VRLA-12V17', 2, 45, 135],
    ['SUA2200I', 2200, 1600, [196, 546, 432], 50.8, 'EX-VRLA-12V17', 4, 45, 275],
    ['SUA3000I', 3000, 2250, [196, 546, 432], 55.8, 'EX-VRLA-12V17', 4, 53, 375],
  ] as const
).map(([pn, va, w, dims, kg, blockId, blocks, noise, heat]) => ({
  partNumber: pn,
  name: `Smart-UPS ${pn}`,
  range: 'Smart-UPS SUA',
  tech: 'line_interactive',
  ff: 'tower',
  kva: va / 1000,
  kw: w / 1000,
  dims: [...dims],
  kg,
  noise,
  heatW: btu(heat),
  internal: { blockId, blocks, strings: 1 },
  page: 4,
  notes: [`Batterie publiée : ${blocks} × 12 V ${blockId.replace('EX-VRLA-12V', '')} Ah.`],
}));

const suaRm: Entry[] = (
  [
    ['SUA750RMI2U', 750, 500, 457, 432, 21.82, 250, 16.4],
    ['SUA1000RMI2U', 1000, 670, 457, 432, 28.18, 335, 31.6],
    ['SUA1500RMI2U', 1500, 980, 457, 432, 28.64, 490, 26.5],
    ['SUA2200RMI2U', 2200, 1980, 660, 483, 43.64, 990, 15.7],
    ['SUA3000RMI2U', 3000, 2700, 660, 483, 43.64, 1350, 11.3],
  ] as const
).map(([pn, va, w, d, width, kg, halfW, min]) => ({
  partNumber: pn,
  name: `Smart-UPS ${pn}`,
  range: 'Smart-UPS SUA RM',
  tech: 'line_interactive',
  ff: 'rack',
  ru: 2,
  kva: va / 1000,
  kw: w / 1000,
  dims: [width, d, 89],
  kg,
  runtime: { W: halfW, min },
  page: 10,
  notes:
    pn === 'SUA2200RMI2U' ? ['Le catalogue imprime « 2000VA/1980W » pour ce modèle 2200 VA.'] : [],
}));

const surtDims = (va: number): [number, number, number] =>
  va <= 2000 ? [85, 483, 432] : va <= 6000 ? [130, 660, 432] : [263, 736, 432];
const surt: Entry[] = (
  [
    ['SURT1000XLI', 1000, 700, 23, 2, 50, 0.88, 239, 4],
    ['SURT2000XLI', 2000, 1400, 25, 2, 50, 0.9, 652, 4],
    ['SURT3000XLI', 3000, 2100, 54.55, 3, 55, 0.91, 655, 16],
    ['SURT5000XLI', 5000, 3500, 54.55, 3, 55, 0.92, 1040, 16],
    ['SURT6000XLI', 6000, 4200, 54.55, 3, 55, 0.92, 1040, 16],
    ['SURT8000XLI', 8000, 6400, 110.91, 6, 55, 0.92, 1535, 16],
    ['SURT10000XLI', 10000, 8000, 110.91, 6, 55, 0.92, 2216, 16],
  ] as const
).map(([pn, va, w, kg, ru, noise, effFull, heat, bps]) => ({
  partNumber: pn,
  name: `Smart-UPS RT ${pn}`,
  range: 'Smart-UPS RT (SURT)',
  tech: 'online_double_conversion',
  ff: 'tower_rack',
  ru,
  kva: va / 1000,
  kw: w / 1000,
  dims: surtDims(va),
  kg,
  noise,
  effFull,
  heatW: btu(heat),
  bps,
  internal: { blockId: 'EX-VRLA-12V9', blocks: bps, strings: va >= 8000 ? 2 : 1 },
  ebm:
    bps === 4
      ? {
          partNumber: 'SURT48XLBP',
          name: 'Smart-UPS RT 48 V Battery Pack',
          bps: 4,
          strings: 2,
          dims: [85, 483, 432],
          kg: 29.56,
        }
      : {
          partNumber: 'SURT192XLBP',
          name: 'Smart-UPS RT 192 V Battery Pack',
          bps: 16,
          strings: 1,
          dims: [130, 660, 432],
          kg: 90.91,
        },
  page: 7,
  notes: [
    `Tension batterie publiée : ${va >= 8000 ? '2 × ' : ''}${bps * 12} V ; capacité des blocs internes non publiée.`,
    'Existe aussi en versions RMXLI (rack) et UXI.',
  ],
}));

const suvt: Entry[] = (
  [
    ['SUVTP10KH', 10, 8],
    ['SUVTP15KH', 15, 12],
    ['SUVTP20KH', 20, 16],
    ['SUVTP30KH', 30, 24],
    ['SUVTP40KH', 40, 32],
  ] as const
).map(([pn, kva, kw]) => ({
  partNumber: pn,
  name: `Smart-UPS VT ${pn}`,
  range: 'Smart-UPS VT (SUVT)',
  tech: 'online_double_conversion',
  ff: 'cabinet',
  kva,
  kw,
  phIn: 3,
  phOut: 3,
  dims: kva <= 20 ? [352, 813, 823] : [523, 813, 823],
  kg: kva <= 20 ? 134 : 183,
  effFull: 0.95,
  bps: 32,
  hasInternal: false,
  page: 13,
  notes: [
    'Batterie ± 192 V (2 × 16 blocs) ; bruit publié 54 à 64 dBA selon le modèle.',
    'Existe aussi en SUVTR30KH / SUVTR40KH.',
  ],
}));

export const APC: BrandData = {
  key: 'apc',
  brand: 'APC',
  idPrefix: 'APC',
  catalog: {
    title: 'Catalogue distributeur SabMatic — APC by Schneider Electric',
    url: 'https://www.se.com/africa/fr/brands/apc/',
  },
  entries: [...sua, ...suaRm, ...surt, ...suvt],
};
