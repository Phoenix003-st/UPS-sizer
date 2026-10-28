import type { Project } from '../../engine/project';
import type { SizingResult, SolutionOption } from '../../engine/types';

/**
 * Option retenue par l'utilisateur : la configuration choisie dans « Autres configurations » si elle
 * existe encore, sinon l'option du niveau choisi, à défaut la Recommandée, puis la première.
 */
export function selectedOption(
  project: Project,
  result: SizingResult | null,
): SolutionOption | null {
  if (!result) return null;
  const key = project.choice.key;
  return (
    (key !== null
      ? (result.options.find((o) => o.key === key) ??
        result.alternatives.find((o) => o.key === key))
      : undefined) ??
    result.options.find((o) => o.tier === project.choice.tier) ??
    result.options.find((o) => o.tier === 'recommended') ??
    result.options[0] ??
    null
  );
}
