/** Étape 5 — Livrables : plan, unifilaire, note de calcul, nomenclature, rapport PDF. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../engine/project';
import type { SizingResult, SolutionOption } from '../../engine/types';
import { useCatalogStore } from '../../state/catalogStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useSizing } from '../../state/useSizing';
import { Button, Card, PageTitle, TabPanel, Tabs } from '../../ui/components';
import { downloadBlob, downloadText, safeFilename } from '../../ui/files';
import { FlowNav } from '../../ui/FlowNav';
import { BomTable } from '../bom/BomTable';
import { bomToCsv, bomToXlsx } from '../bom/exportBom';
import { CalcNote } from '../calc-note/CalcNote';
import { LayoutPlan } from '../layout-plan/LayoutPlan';
import type { Diagram } from '../single-line/diagram';
import { SingleLineSvg } from '../single-line/SingleLineDiagram';
import { useDiagram } from '../single-line/useDiagram';
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
        <Deliverables project={project} result={result} option={option} tab={tab} setTab={setTab} />
      )}
      <FlowNav back="solutions" />
    </>
  );
}

function Deliverables({
  project,
  result,
  option,
  tab,
  setTab,
}: {
  project: Project;
  result: SizingResult;
  option: SolutionOption;
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const { t, i18n } = useTranslation();
  const model = useCatalogStore((s) =>
    s.catalogs.ups.models.find((m) => m.id === option.ups.modelId),
  );
  const feeders = useSettingsStore((s) => s.settings.electrical.outputFeeders);
  const diagram = useDiagram(option, model, project, feeders);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const base = safeFilename(project.name || 'ups-sizer');
  const ctx = { project, option, t, lang: i18n.language };

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setStatus(t('report.generating'));
    try {
      await job();
      setStatus(null);
    } catch (e) {
      setStatus(t('report.error', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    const { buildReportPdf } = await import('../report-pdf/pdf');
    downloadBlob(
      `${base}.pdf`,
      await buildReportPdf({ project, result, option, diagram, t, lang: i18n.language }),
    );
  };
  const xlsx = async () => downloadBlob(`${base}-nomenclature.xlsx`, await bomToXlsx(ctx));
  const csv = () => downloadText(`${base}-nomenclature.csv`, bomToCsv(ctx), 'text/csv');

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <span role="status" aria-live="polite" className="me-auto text-sm text-muted">
          {status}
        </span>
        <Button
          variant="primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await pdf();
              await xlsx();
              csv();
              downloadText(`${base}.ups.json`, JSON.stringify(project, null, 2));
            })
          }
        >
          {t('exports.all')}
        </Button>
      </div>
      <Tabs
        label={t('deliverables.title')}
        value={tab}
        onChange={setTab}
        tabs={TABS.map((id) => ({ id, label: t(`deliverables.tabs.${id}`) }))}
      />
      <TabPanel id={tab}>
        {tab === 'plan' && <LayoutPlan project={project} option={option} />}
        {tab === 'singleLine' && <SingleLine diagram={diagram} />}
        {tab === 'calcNote' && (
          <>
            <div className="mb-3 flex justify-end print:hidden">
              <Button onClick={() => window.print()}>{t('deliverables.print')}</Button>
            </div>
            <CalcNote project={project} result={result} option={option} />
          </>
        )}
        {tab === 'bom' && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => run(xlsx)}>
                {t('exports.xlsx')}
              </Button>
              <Button onClick={csv}>{t('exports.csv')}</Button>
            </div>
            <BomTable lines={option.bom} />
          </>
        )}
        {tab === 'report' && (
          <div className="space-y-3">
            <p>{t('report.intro')}</p>
            <Button variant="primary" disabled={busy} onClick={() => run(pdf)}>
              {t('report.download')}
            </Button>
          </div>
        )}
      </TabPanel>
    </Card>
  );
}

function SingleLine({ diagram }: { diagram: Diagram }) {
  const { t } = useTranslation();
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
