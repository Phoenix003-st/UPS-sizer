/** Étape 4 — Jusqu'à trois options côte à côte ; la Recommandée est mise en avant. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '../../app/router';
import type { Project } from '../../engine/project';
import type { SolutionOption } from '../../engine/types';
import { useCatalogStore } from '../../state/catalogStore';
import { useProjectStore } from '../../state/projectStore';
import { useSizing } from '../../state/useSizing';
import { TraceList } from '../../ui/CalcView';
import {
  AlertList,
  Button,
  Card,
  Modal,
  PageTitle,
  SampleBadge,
  Stat,
  StatusPill,
} from '../../ui/components';
import { FlowNav } from '../../ui/FlowNav';
import { formatNumber, formatPct } from '../../ui/format';
import { UpsIllustration } from '../../ui/icons';
import { MiniRoom } from '../layout-plan/MiniRoom';

export function SolutionsScreen({ project }: { project: Project }) {
  const { t } = useTranslation();
  const result = useSizing(project);
  const update = useProjectStore((s) => s.update);
  const [calcFor, setCalcFor] = useState<SolutionOption | null>(null);
  if (!result) return null;

  return (
    <>
      <PageTitle title={t('solutions.title')} subtitle={t('solutions.subtitle')} />
      {result.globalAlerts.length > 0 && (
        <div className="mb-4">
          <AlertList alerts={result.globalAlerts} />
        </div>
      )}
      {result.options.length === 0 ? (
        <Card>
          <p>{t('solutions.none')}</p>
        </Card>
      ) : (
        <ul
          className={`grid gap-4 ${result.options.length === 3 ? 'lg:grid-cols-3' : result.options.length === 2 ? 'md:grid-cols-2' : 'max-w-xl'}`}
        >
          {result.options.map((o) => (
            <li key={o.tier} className={o.tier === 'recommended' ? 'lg:-mt-2' : ''}>
              <SolutionCard
                option={o}
                chosen={project.choice.tier === o.tier}
                onChoose={() => {
                  update((d) => {
                    if (d.choice.tier !== o.tier) d.layout.positions = {};
                    d.choice.tier = o.tier;
                  });
                  navigate('deliverables');
                }}
                onShowCalc={() => setCalcFor(o)}
              />
            </li>
          ))}
        </ul>
      )}
      <Modal open={calcFor !== null} onClose={() => setCalcFor(null)} title={t('calcModal.title')}>
        {calcFor && <TraceList traces={calcFor.traces} />}
      </Modal>
      <FlowNav back="room" />
    </>
  );
}

function SolutionCard({
  option: o,
  chosen,
  onChoose,
  onShowCalc,
}: {
  option: SolutionOption;
  chosen: boolean;
  onChoose: () => void;
  onShowCalc: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const models = useCatalogStore((s) => s.catalogs.ups.models);
  const model = models.find((m) => m.id === o.ups.modelId);
  const b = o.battery;
  const highlighted = o.tier === 'recommended';
  const dims = o.display.dimensionsSummary;
  const visibleAlerts = o.alerts.filter(
    (a) =>
      a.level !== 'ok' || ['noise_level', 'rack_units', 'external_battery_packs'].includes(a.code),
  );

  return (
    <Card
      as="article"
      className={`flex h-full flex-col ${highlighted ? 'border-2 border-primary shadow-md' : ''}`}
    >
      <header className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            className={`text-sm font-bold uppercase tracking-wide ${highlighted ? 'text-primary' : 'text-muted'}`}
          >
            {t(`solutions.tier.${o.tier}`)}
          </h2>
          <StatusPill level={o.status} />
        </div>
        <p className="text-xs text-muted">{t(`solutions.tierHelp.${o.tier}`)}</p>
      </header>
      <div className="flex items-center gap-3">
        <UpsIllustration formFactor={o.display.formFactor} className="h-16 w-16 shrink-0" />
        <div>
          <p className="text-lg font-bold leading-tight">{o.ups.reference}</p>
          <p className="text-sm text-muted">
            {t(`tech.${o.ups.technology}`)} · {t(`formFactor.${o.display.formFactor}`)}
          </p>
          {o.display.sample && <SampleBadge />}
        </div>
      </div>

      <dl className="mt-3">
        <Stat label={t('solutions.configuration')}>
          {o.ups.modulesPerSystem !== undefined && model?.modular
            ? `${t('solutions.modules', { count: o.ups.modulesPerSystem, kw: model.modular.moduleKW })} · ${t('solutions.units', { count: o.ups.unitsPerSystem })}`
            : t('solutions.units', { count: o.ups.unitsPerSystem })}
          {o.ups.systems === 2 && ` × 2 (${t('solutions.systems')})`} · {o.ups.redundancy}
        </Stat>
        <Stat label={t('solutions.loadRate')}>{formatPct(o.ups.loadRate, lang)}</Stat>
        <Stat label={t('solutions.efficiency')}>{formatPct(o.ups.efficiency, lang, 1)}</Stat>
        <Stat label={t('solutions.autonomy')}>
          <span className="block">
            {t('solutions.autonomyDesign', {
              min: (b.autonomyIsLowerBound ? '≥ ' : '') + formatNumber(b.autonomyMin, lang, 0),
            })}
          </span>
          <span className="block text-xs font-normal text-muted">
            {t('solutions.autonomyNew', { min: formatNumber(b.autonomyNewMin, lang, 0) })}
          </span>
        </Stat>
        <Stat label={t('solutions.battery')}>
          <span className="block">
            {t('solutions.batteryLine', {
              chemistry: t(`chemistry.${b.chemistry}`),
              v: formatNumber(b.blockV, lang),
              ah: formatNumber(b.capacityAh, lang),
              bps: b.blocksPerString,
              strings: b.strings,
            })}
          </span>
          <span className="block text-xs font-normal text-muted">
            {b.internalStrings > 0 && `${t('solutions.internal')} (${b.internalStrings}) `}
            {b.cabinets
              .map((c) => t('solutions.cabinets', { qty: c.qty, ref: c.reference }))
              .join(', ')}
            {b.sets > 1 && ` — ${t('solutions.perSet', { sets: b.sets })}`}
          </span>
        </Stat>
        <Stat label={t('solutions.dimensions')}>
          {dims.w} × {dims.d} × {dims.h} mm
        </Stat>
        <Stat label={t('solutions.weight')}>
          {formatNumber(o.display.totalWeightKg, lang, 0)} kg
        </Stat>
        <Stat label={t('solutions.footprint')}>
          {formatNumber(o.layout.footprintWithClearancesM2, lang, 1)} m²
        </Stat>
        {o.display.noiseDb !== null && (
          <Stat label={t('solutions.noise')}>{o.display.noiseDb} dB(A)</Stat>
        )}
      </dl>

      <figure className="mt-3">
        <figcaption className="mb-1 text-xs font-semibold text-muted">
          {t('solutions.placeInRoom')}
        </figcaption>
        <MiniRoom
          layout={o.layout}
          label={`${t('solutions.placeInRoom')} — ${t('plan.remaining', { m2: formatNumber(o.layout.remainingAreaM2, lang, 1) })}`}
        />
      </figure>

      {visibleAlerts.length > 0 && (
        <div className="mt-3">
          <AlertList alerts={visibleAlerts} />
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          variant={highlighted || chosen ? 'primary' : 'secondary'}
          onClick={onChoose}
          aria-pressed={chosen}
        >
          {chosen ? `✓ ${t('solutions.chosen')}` : t('solutions.choose')}
        </Button>
        <Button variant="ghost" onClick={onShowCalc}>
          {t('solutions.seeCalc')}
        </Button>
      </div>
    </Card>
  );
}
