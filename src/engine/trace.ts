/**
 * Traces de calcul, affichées par le bouton « Voir le calcul » et dans la note de calcul.
 *
 * Chaque étape garde la formule symbolique, la formule avec les valeurs, le résultat et l'unité.
 * `label` et `title` sont des clés de traduction (`calc.*`) : le moteur reste indépendant de la
 * langue, l'interface traduit.
 */

export interface CalcStep {
  label: string;
  formula: string;
  substituted: string;
  result: number | string;
  unit: string;
  /** Référence normative ou source (ex. « IEC 62485-2 §7.2 »). */
  ref?: string;
}

export interface CalcTrace {
  title: string;
  steps: CalcStep[];
}

/** Résultat d'un calcul : la valeur et sa trace. */
export interface Calc<T> {
  value: T;
  trace: CalcTrace;
}

export interface TraceBuilder {
  step(step: CalcStep): TraceBuilder;
  /** Ajoute toutes les étapes d'une autre trace (préfixées par son titre si demandé). */
  append(other: CalcTrace): TraceBuilder;
  build(): CalcTrace;
}

/** Crée un constructeur de trace : `trace('calc.load.title').step({...}).build()`. */
export function trace(title: string): TraceBuilder {
  const steps: CalcStep[] = [];
  const builder: TraceBuilder = {
    step(s) {
      steps.push(s);
      return builder;
    },
    append(other) {
      steps.push(...other.steps);
      return builder;
    },
    build() {
      return { title, steps: [...steps] };
    },
  };
  return builder;
}

/** Formate un nombre pour les formules (point décimal, sans zéros inutiles). */
export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return String(n);
  const f = Number(n.toFixed(digits));
  return String(f);
}
