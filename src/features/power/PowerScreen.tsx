/** Étape 2 — Puissance (saisie rapide ou bibliothèque d'équipements) et autonomie. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EquipmentCategory } from '../../catalog/schemas';
import type { Project } from '../../engine/project';
import { useCatalogStore } from '../../state/catalogStore';
import { useProjectStore } from '../../state/projectStore';
import { useSizing } from '../../state/useSizing';
import { TraceList } from '../../ui/CalcView';
import {
  AlertList,
  Button,
  Card,
  Choice,
  Collapsible,
  Modal,
  NumberField,
  PageTitle,
  Stat,
} from '../../ui/components';
import { FlowNav } from '../../ui/FlowNav';
import { formatNumber, formatPct } from '../../ui/format';
import { FormFactorChoiceField, PhaseChoiceField } from '../solutions/SelectionChoices';
import { splitCategories } from './sectorCategories';

const AUTONOMY_PRESETS = [10, 15, 30, 60];
const LOG_MIN = Math.log10(0.1);
const LOG_MAX = Math.log10(2000);
const toSlider = (v: number) =>
  Math.round(((Math.log10(Math.max(0.1, v)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000);
const fromSlider = (p: number) => {
  const v = Math.pow(10, LOG_MIN + (p / 1000) * (LOG_MAX - LOG_MIN));
  const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / mag) * mag;
};

export function PowerScreen({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();
  const update = useProjectStore((s) => s.update);
  const library = useCatalogStore((s) => s.catalogs.equipment);
  const result = useSizing(project);
  const [showCalc, setShowCalc] = useState(false);
  const lang = i18n.language;
  const { load, advanced: adv } = project;
  const otherAutonomy = !AUTONOMY_PRESETS.includes(project.autonomyMin);
  const label = (id: string) => {
    const it = library.find((l) => l.id === id);
    return it ? (it.label[lang as 'fr' | 'en' | 'ar'] ?? it.label.fr) : id;
  };
  const { main, others } = splitCategories(project.scenario, [
    ...new Set(library.map((l) => l.category)),
  ] as EquipmentCategory[]);
  const totalW = load.items.reduce((s, i) => s + i.qty * i.unitW, 0);
  const renderCategory = (cat: EquipmentCategory) => (
    <div key={cat}>
      <h3 className="mb-1 text-sm font-semibold text-muted">
        {t(`power.library.category.${cat}`)}
      </h3>
      <div className="flex flex-wrap gap-2">
        {library
          .filter((l) => l.category === cat)
          .map((l) => (
            <Button
              key={l.id}
              onClick={() =>
                update((d) => {
                  const existing = d.load.items.find((i) => i.libId === l.id);
                  if (existing) existing.qty += 1;
                  else
                    d.load.items.push({
                      libId: l.id,
                      qty: 1,
                      unitW: l.defaultW,
                      pf: l.pf,
                    });
                })
              }
            >
              ＋ {label(l.id)}{' '}
              <span className="text-xs text-muted">{formatNumber(l.defaultW, lang)} W</span>
            </Button>
          ))}
      </div>
    </div>
  );

  return (
    <>
      <PageTitle title={t('power.title')} subtitle={t(`scenario.${project.scenario}.title`)} />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <Choice
              legend={t('power.load')}
              value={load.mode}
              options={[
                { value: 'quick', label: t('power.quick') },
                { value: 'assisted', label: t('power.assisted') },
              ]}
              onChange={(mode) => update((d) => void (d.load.mode = mode))}
            />
            {load.mode === 'quick' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <NumberField
                    label={t('power.load')}
                    value={load.value}
                    min={0}
                    max={5000}
                    unit={load.unit}
                    onChange={(v) => update((d) => void (d.load.value = v))}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={toSlider(load.value)}
                    aria-label={t('power.load')}
                    aria-valuetext={`${formatNumber(load.value, lang)} ${load.unit}`}
                    onChange={(e) =>
                      update((d) => void (d.load.value = fromSlider(Number(e.target.value))))
                    }
                    className="mt-3 h-11 w-full accent-[var(--color-primary)]"
                  />
                </div>
                <Choice
                  legend={t('power.unit')}
                  value={load.unit}
                  options={[
                    { value: 'kW', label: 'kW' },
                    { value: 'kVA', label: 'kVA' },
                  ]}
                  onChange={(unit) => update((d) => void (d.load.unit = unit))}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {load.items.length === 0 ? (
                  <p className="text-sm text-muted">{t('power.library.empty')}</p>
                ) : (
                  <ul className="space-y-2">
                    {load.items.map((it, idx) => (
                      <li
                        key={`${it.libId}-${idx}`}
                        className="grid grid-cols-[1fr_6rem_8rem_auto] items-end gap-2 rounded-lg border border-border p-2"
                      >
                        <span className="self-center text-sm font-medium">{label(it.libId)}</span>
                        <NumberField
                          label={t('power.library.qty')}
                          value={it.qty}
                          min={0}
                          digits={0}
                          onChange={(v) =>
                            update((d) => void (d.load.items[idx]!.qty = Math.round(v)))
                          }
                        />
                        <NumberField
                          label={t('power.library.unitW')}
                          value={it.unitW}
                          min={0}
                          onChange={(v) => update((d) => void (d.load.items[idx]!.unitW = v))}
                        />
                        <Button
                          variant="ghost"
                          aria-label={t('power.library.remove', { name: label(it.libId) })}
                          onClick={() => update((d) => void d.load.items.splice(idx, 1))}
                        >
                          ✕
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm font-semibold">
                  {t('power.library.total')} : {formatNumber(totalW / 1000, lang, 3)} kW
                </p>
                {main.map(renderCategory)}
                {others.length > 0 && (
                  <Collapsible title={t('power.library.others')}>
                    <div className="space-y-4">{others.map(renderCategory)}</div>
                  </Collapsible>
                )}
              </div>
            )}
          </Card>

          <Card>
            <Choice
              legend={t('power.autonomy')}
              value={otherAutonomy ? -1 : project.autonomyMin}
              options={[
                ...AUTONOMY_PRESETS.map((m) => ({ value: m, label: `${m} ${t('power.minutes')}` })),
                { value: -1, label: t('power.other') },
              ]}
              onChange={(v) =>
                update(
                  (d) => void (d.autonomyMin = v === -1 ? (otherAutonomy ? d.autonomyMin : 20) : v),
                )
              }
            />
            {otherAutonomy && (
              <NumberField
                className="mt-3 max-w-48"
                label={t('power.autonomy')}
                value={project.autonomyMin}
                min={1}
                max={480}
                unit={t('power.minutes')}
                onChange={(v) => update((d) => void (d.autonomyMin = v))}
              />
            )}
          </Card>

          <Collapsible title={t('power.advanced')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice
                legend={t('power.outputPf')}
                value={adv.outputPf}
                options={[
                  { value: 0.9, label: '0,9' },
                  { value: 1, label: '1' },
                ]}
                onChange={(v) => update((d) => void (d.advanced.outputPf = v))}
              />
              <Choice
                legend={t('power.redundancy')}
                value={adv.redundancy}
                options={(['N', 'N+1', '2N'] as const).map((r) => ({
                  value: r,
                  label: r,
                  help: t(`power.redundancyHelp.${r}`),
                }))}
                onChange={(v) => update((d) => void (d.advanced.redundancy = v))}
              />
              <NumberField
                label={t('power.growthMargin')}
                value={adv.growthMargin * 100}
                min={0}
                max={200}
                unit="%"
                onChange={(v) => update((d) => void (d.advanced.growthMargin = v / 100))}
              />
              <NumberField
                label={t('power.targetLoadRate')}
                value={adv.targetLoadRate * 100}
                min={10}
                max={100}
                unit="%"
                onChange={(v) => update((d) => void (d.advanced.targetLoadRate = v / 100))}
              />
              <PhaseChoiceField project={project} />
              <FormFactorChoiceField project={project} />
              <Choice
                legend={t('power.voltage')}
                value={adv.voltage}
                options={[
                  { value: 230, label: '230 V' },
                  { value: 400, label: '400 V' },
                ]}
                onChange={(v) => update((d) => void (d.advanced.voltage = v))}
              />
              <Choice
                legend={t('power.frequency')}
                value={adv.freqHz}
                options={[
                  { value: 50, label: '50 Hz' },
                  { value: 60, label: '60 Hz' },
                ]}
                onChange={(v) => update((d) => void (d.advanced.freqHz = v))}
              />
              <Choice
                legend={t('power.batteryChemistry')}
                value={adv.batteryChemistry}
                options={(['auto', 'VRLA', 'LI'] as const).map((c) => ({
                  value: c,
                  label: t(`power.chemistry.${c}`),
                }))}
                onChange={(v) => update((d) => void (d.advanced.batteryChemistry = v))}
              />
              <Choice
                legend={t('power.eod')}
                value={adv.eodVpc ?? 0}
                options={[
                  { value: 0, label: t('power.eodAuto') },
                  ...[1.67, 1.7, 1.75].map((v) => ({
                    value: v,
                    label: `${formatNumber(v, lang)} V`,
                  })),
                ]}
                onChange={(v) => update((d) => void (d.advanced.eodVpc = v === 0 ? null : v))}
              />
            </div>
          </Collapsible>
        </div>

        <aside aria-label={t('power.summary')} className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <h2 className="mb-2 font-semibold">{t('power.summary')}</h2>
            {result && (
              <dl>
                <Stat label={t('power.loadReal')}>
                  {formatNumber(result.inputs.loadW / 1000, lang, 2)} kW
                </Stat>
                <Stat label={t('power.growthMargin')}>
                  {formatPct(result.inputs.growthMargin, lang)}
                </Stat>
                <Stat label={t('power.design')}>
                  {formatNumber(result.inputs.designW / 1000, lang, 2)} kW /{' '}
                  {formatNumber(result.inputs.designVA / 1000, lang, 2)} kVA
                </Stat>
                <Stat label={t('power.phases')}>
                  {t(
                    result.inputs.inputPhases !== result.inputs.phases
                      ? 'power.phasesTriMono'
                      : result.inputs.phases === 3
                        ? 'power.phasesTri'
                        : 'power.phasesMono',
                  )}{' '}
                  — {result.inputs.voltageV} V
                </Stat>
                <Stat label={t('power.formFactor')}>
                  {t(`power.formFactorOption.${result.inputs.formFactor}`)}
                </Stat>
                <Stat label={t('power.redundancy')}>{result.inputs.redundancy}</Stat>
                <Stat label={t('power.autonomy')}>
                  {formatNumber(result.inputs.autonomyMin, lang)} {t('power.minutes')}
                </Stat>
              </dl>
            )}
            {result && result.globalAlerts.length > 0 && (
              <div className="mt-3">
                <AlertList alerts={result.globalAlerts} />
              </div>
            )}
            <Button variant="ghost" className="mt-2" onClick={() => setShowCalc(true)}>
              {t('solutions.seeCalc')}
            </Button>
          </Card>
        </aside>
      </div>
      <Modal open={showCalc} onClose={() => setShowCalc(false)} title={t('calcModal.title')}>
        {result && <TraceList traces={result.traces} />}
      </Modal>
      <FlowNav back="home" next="room" />
    </>
  );
}
