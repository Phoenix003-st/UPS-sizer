/** Utilitaires numériques du moteur (interpolations, arrondis normalisés). */

export interface XY {
  x: number;
  y: number;
}

const EPS = 1e-9;

/** Arrondi supérieur tolérant aux erreurs d'arrondi flottant (⌈4,0000000001⌉ = 4). */
export function ceilSafe(x: number): number {
  return Math.ceil(x - EPS);
}

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/**
 * Interpolation linéaire dans une table triée par x croissant.
 * Hors plage, la valeur de l'extrémité la plus proche est retenue.
 */
export function interpLinear(points: XY[], x: number): number {
  if (points.length === 0) throw new Error('interpLinear: table vide');
  const pts = [...points].sort((a, b) => a.x - b.x);
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (x <= first.x) return first.y;
  if (x >= last.x) return last.y;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (x <= b.x) {
      if (b.x === a.x) return b.y;
      return a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x);
    }
  }
  return last.y;
}

/**
 * Interpolation log-log (droite entre deux points dans le plan log x / log y), adaptée aux
 * courbes de décharge à puissance constante. Hors plage, extrapolation avec le segment extrême.
 */
export function interpLogLog(points: XY[], x: number): number {
  if (points.length < 2) throw new Error('interpLogLog: au moins deux points');
  const pts = [...points].sort((a, b) => a.x - b.x);
  let i = 1;
  while (i < pts.length - 1 && x > pts[i]!.x) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const lx = Math.log(x);
  const t = (lx - Math.log(a.x)) / (Math.log(b.x) - Math.log(a.x));
  return Math.exp(Math.log(a.y) + t * (Math.log(b.y) - Math.log(a.y)));
}

/** Première valeur d'une série normalisée supérieure ou égale à `x` (null si hors série). */
export function nextInSeries(series: number[], x: number): number | null {
  const sorted = [...series].sort((a, b) => a - b);
  for (const v of sorted) if (v >= x - EPS) return v;
  return null;
}

export const SQRT3 = Math.sqrt(3);

/** Conversion W → BTU/h. */
export const W_TO_BTUH = 3.412142;
