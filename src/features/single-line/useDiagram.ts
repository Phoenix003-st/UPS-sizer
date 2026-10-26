import { useTranslation } from 'react-i18next';
import type { UpsModel } from '../../catalog/schemas';
import type { Project } from '../../engine/project';
import type { SolutionOption } from '../../engine/types';
import { buildSingleLine, type Diagram } from './diagram';

/** Schéma unifilaire de la solution, libellés traduits. */
export function useDiagram(
  option: SolutionOption,
  model: UpsModel | undefined,
  project: Project,
  feeders: number,
): Diagram {
  const { t } = useTranslation();
  return buildSingleLine(option, model, project.installation, feeders, {
    mains: t('singleLine.mains'),
    generator: t('singleLine.generator'),
    system: (s) => t('singleLine.system', { s }),
    board: t('singleLine.board'),
    maintenanceBypass: t('singleLine.maintenanceBypass'),
    battery: t('singleLine.battery'),
    feeder: t('singleLine.feeders'),
    modules: (n, kw) => t('solutions.modules', { count: n, kw }),
    units: (n) => t('solutions.units', { count: n }),
  });
}
