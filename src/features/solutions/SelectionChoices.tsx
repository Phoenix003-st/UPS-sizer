/** Choix qui filtrent strictement les UPS proposés : alimentation et format. */
import { useTranslation } from 'react-i18next';
import {
  formFactorChoiceSchema,
  type FormFactorChoice,
  type PhaseChoice,
  type Project,
} from '../../engine/project';
import { useProjectStore } from '../../state/projectStore';
import { Choice } from '../../ui/components';

const PHASE_CHOICES: { value: PhaseChoice; key: string }[] = [
  { value: 'auto', key: 'phasesAuto' },
  { value: 1, key: 'phasesMono' },
  { value: 3, key: 'phasesTri' },
  { value: '3/1', key: 'phasesTriMono' },
];

export function PhaseChoiceField({ project }: { project: Project }) {
  const { t } = useTranslation();
  const update = useProjectStore((s) => s.update);
  return (
    <Choice
      legend={t('power.phases')}
      value={project.advanced.phases}
      options={PHASE_CHOICES.map((c) => ({
        value: c.value,
        label: t(`power.${c.key}`),
        help: t(`power.phasesHelp.${c.value}`),
      }))}
      onChange={(v) => update((d) => void (d.advanced.phases = v))}
    />
  );
}

export function FormFactorChoiceField({ project }: { project: Project }) {
  const { t } = useTranslation();
  const update = useProjectStore((s) => s.update);
  return (
    <Choice<FormFactorChoice>
      legend={t('power.formFactor')}
      value={project.advanced.formFactor}
      options={formFactorChoiceSchema.options.map((f) => ({
        value: f,
        label: t(`power.formFactorOption.${f}`),
        help: t(`power.formFactorHelp.${f}`),
      }))}
      onChange={(v) => update((d) => void (d.advanced.formFactor = v))}
    />
  );
}
