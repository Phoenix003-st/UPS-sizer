/** Étape 5 — Livrables : plan, unifilaire, note de calcul, nomenclature, rapport PDF. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../engine/project';
import { useSizing } from '../../state/useSizing';
import { Button, Card, PageTitle, TabPanel, Tabs } from '../../ui/components';
import { FlowNav } from '../../ui/FlowNav';
import { BomTable } from '../bom/BomTable';
import { CalcNote } from '../calc-note/CalcNote';
import { MiniRoom } from '../layout-plan/MiniRoom';
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
            {tab === 'plan' && <MiniRoom layout={option.layout} label={t('plan.title')} />}
            {tab === 'singleLine' && <p className="text-muted">{t('deliverables.comingSoon')}</p>}
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
