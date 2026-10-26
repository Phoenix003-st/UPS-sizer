import type { Project } from '../../engine/project';
import type { SizingResult, SolutionOption } from '../../engine/types';

/** Option retenue par l'utilisateur (à défaut la Recommandée, puis la première). */
export function selectedOption(
  project: Project,
  result: SizingResult | null,
): SolutionOption | null {
  if (!result) return null;
  return (
    result.options.find((o) => o.tier === project.choice.tier) ??
    result.options.find((o) => o.tier === 'recommended') ??
    result.options[0] ??
    null
  );
}
