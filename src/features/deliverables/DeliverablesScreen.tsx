/** Étape 5 — Livrables : plan, unifilaire, note de calcul, nomenclature, rapport PDF. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../engine/project';
import { useSizing } from '../../state/useSizing';
import { Button, Card, PageTitle, TabPanel, Tabs } from '../../ui/components';
import { FlowNav } from '../../ui/FlowNav';
import { BomTable } from '../bom/BomTable';
import { CalcNote } from '../calc-note/CalcNote';
import { LayoutPlan } from '../layout-plan/LayoutPlan';
import { SingleLineSvg } from '../single-line/SingleLineDiagram';
import { useDiagram } from '../single-line/useDiagram';
import { useCatalogStore } from '../../state/catalogStore';
import { useSettingsStore } from '../../state/settingsStore';
import type { SolutionOption } from '../../engine/types';
import { selectedOption } from './selectedOption';

type Tab = 'plan' | 'singleLine' | 'calcNote' | 'bom' | 'report';
const TABS: Tab[] = ['plan', 'singleLine', 'calcNote', 'bom', 'report'];

export function DeliverablesScreen({ project }: { project: Project }) {
  const { t } = useTranslation();
  const result = useSizing(project);
  const option = selectedOption(project, result);
  const [tab, setTab] = useState<Tab>('plan');

  return (
    <>
      <PageTitle
        title={t('deliverables.title')}
        subtitle={
          option ? `${t(`solutions.tier.${option.tier}`)} — ${option.ups.reference}` : undefined
        }
      />
      <p className="mb-4 rounded-md border border-warn bg-warn-bg px-3 py-2 text-sm font-semibold text-warn">
        {t('app.disclaimer')}
      </p>
      {!option || !result ? (
        <Card>
          <p>{t('deliverables.noOption')}</p>
        </Card>
      ) : (
        <Card>
          <Tabs
            label={t('deliverables.title')}
            value={tab}
            onChange={setTab}
            tabs={TABS.map((id) => ({ id, label: t(`deliverables.tabs.${id}`) }))}
          />
          <TabPanel id={tab}>
            {tab === 'plan' && <LayoutPlan project={project} option={option} />}
            {tab === 'singleLine' && <SingleLine project={project} option={option} />}
            {tab === 'calcNote' && (
              <>
                <div className="mb-3 flex justify-end print:hidden">
                  <Button onClick={() => window.print()}>{t('deliverables.print')}</Button>
                </div>
                <CalcNote project={project} result={result} option={option} />
              </>
            )}
            {tab === 'bom' && <BomTable lines={option.bom} />}
            {tab === 'report' && <p className="text-muted">{t('deliverables.comingSoon')}</p>}
          </TabPanel>
        </Card>
      )}
      <FlowNav back="solutions" />
    </>
  );
}

function SingleLine({ project, option }: { project: Project; option: SolutionOption }) {
  const { t } = useTranslation();
  const model = useCatalogStore((s) =>
    s.catalogs.ups.models.find((m) => m.id === option.ups.modelId),
  );
  const feeders = useSettingsStore((s) => s.settings.electrical.outputFeeders);
  const diagram = useDiagram(option, model, project, feeders);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{t('singleLine.legend')}</p>
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.min(diagram.width, 1400) }}>
          <SingleLineSvg diagram={diagram} title={t('singleLine.title')} />
        </div>
      </div>
    </div>
  );
}
