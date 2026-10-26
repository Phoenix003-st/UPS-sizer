/** Écran « Paramètres » : toutes les hypothèses, modifiables, avec retour aux valeurs par défaut. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatZodError, TECHNOLOGIES } from '../../catalog/schemas';
import { SCENARIOS, settingsSchema } from '../../settings/schema';
import { useSettingsStore } from '../../state/settingsStore';
import { Button, Card, Choice, NumberField, PageTitle } from '../../ui/components';

type Kind = 'number' | 'percent' | 'list' | 'pairs' | 'range';
interface FieldDef {
  path: string[];
  label: string;
  kind?: Kind;
}

const GROUPS: { id: string; fields: FieldDef[] }[] = [
  {
    id: 'power',
    fields: [
      { path: ['power', 'growthMargin'], label: 'growthMargin', kind: 'percent' },
      { path: ['power', 'targetLoadRate'], label: 'targetLoadRate', kind: 'percent' },
      { path: ['power', 'defaultPf'], label: 'defaultPf' },
      { path: ['power', 'monoToTriThresholdKVA'], label: 'monoToTriThresholdKVA' },
      { path: ['power', 'altitudeDerating'], label: 'altitudeDerating', kind: 'pairs' },
    ],
  },
  {
    id: 'battery',
    fields: [
      { path: ['battery', 'agingFactor'], label: 'agingFactor' },
      { path: ['battery', 'agingFactorLithium'], label: 'agingFactorLithium' },
      { path: ['battery', 'designMargin'], label: 'designMargin' },
      { path: ['battery', 'defaultEodVpc'], label: 'defaultEodVpc' },
      { path: ['battery', 'shortAutonomyEodVpc'], label: 'shortAutonomyEodVpc' },
      { path: ['battery', 'shortAutonomyThresholdMin'], label: 'shortAutonomyThresholdMin' },
      { path: ['battery', 'allowedEodVpc'], label: 'allowedEodVpc', kind: 'list' },
      { path: ['battery', 'maxStrings'], label: 'maxStrings' },
      { path: ['battery', 'chargeEfficiency'], label: 'chargeEfficiency', kind: 'percent' },
      { path: ['battery', 'floatVpc'], label: 'floatVpc' },
      { path: ['battery', 'gasCurrentMaPerAh'], label: 'gasCurrentMaPerAh' },
    ],
  },
  {
    id: 'room',
    fields: [
      { path: ['room', 'defaultFloorLoadKgM2'], label: 'defaultFloorLoadKgM2' },
      { path: ['room', 'doorMarginMm'], label: 'doorMarginMm' },
      { path: ['room', 'recommendedTempC'], label: 'recommendedTempC', kind: 'range' },
      { path: ['room', 'allowedTempC'], label: 'allowedTempC', kind: 'range' },
      { path: ['room', 'maxHumidityPct'], label: 'maxHumidityPct' },
      { path: ['room', 'defaultHeightMm'], label: 'defaultHeightMm' },
      { path: ['room', 'noHvacMaxW'], label: 'noHvacMaxW' },
      { path: ['room', 'officeNoiseWarnDb'], label: 'officeNoiseWarnDb' },
      { path: ['room', 'floorCheckMinWeightKg'], label: 'floorCheckMinWeightKg' },
    ],
  },
  {
    id: 'electrical',
    fields: [
      { path: ['electrical', 'breakerSeriesA'], label: 'breakerSeriesA', kind: 'list' },
      { path: ['electrical', 'cable', 'groupingFactor'], label: 'groupingFactor' },
      { path: ['electrical', 'cable', 'ambientC'], label: 'cableAmbientC' },
      { path: ['electrical', 'cable', 'maxParallel'], label: 'maxParallel' },
      { path: ['electrical', 'maxVoltageDropPct', 'ac'], label: 'maxVoltageDropAc' },
      { path: ['electrical', 'maxVoltageDropPct', 'dc'], label: 'maxVoltageDropDc' },
      { path: ['electrical', 'inputPf'], label: 'inputPf' },
      { path: ['electrical', 'outputFeeders'], label: 'outputFeeders' },
      { path: ['electrical', 'generatorSizingFactor'], label: 'generatorSizingFactor' },
    ],
  },
  {
    id: 'selection',
    fields: [
      { path: ['selection', 'weights', 'efficiency'], label: 'weightEfficiency' },
      { path: ['selection', 'weights', 'footprint'], label: 'weightFootprint' },
      { path: ['selection', 'weights', 'margin'], label: 'weightMargin' },
      { path: ['selection', 'weights', 'price'], label: 'weightPrice' },
      { path: ['selection', 'maxOversizeFactor'], label: 'maxOversizeFactor' },
      { path: ['selection', 'idealLoadRate'], label: 'idealLoadRate', kind: 'percent' },
    ],
  },
];

type Obj = Record<string, unknown>;
function getAt(o: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, k) => (acc as Obj | undefined)?.[k], o);
}
function setAt(o: Obj, path: string[], value: unknown) {
  let cur = o;
  path.slice(0, -1).forEach((k) => (cur = cur[k] as Obj));
  cur[path[path.length - 1]!] = value;
}

function ListField({
  label,
  value,
  onCommit,
  help,
  pairs,
}: {
  label: string;
  value: string;
  onCommit: (raw: string) => boolean;
  help: string;
  pairs?: boolean;
}) {
  const [text, setText] = useState(value);
  const [bad, setBad] = useState(false);
  const id = `f-${label.replace(/\W/g, '')}`;
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={text}
        aria-invalid={bad}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setBad(!onCommit(text))}
        className={`min-h-11 w-full rounded-lg border bg-surface px-3 font-mono text-sm ${bad ? 'border-block' : 'border-border'}`}
      />
      <p className="mt-1 text-xs text-muted">{pairs ? '1000:1, 1500:0.95, …' : help}</p>
    </div>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const reset = useSettingsStore((s) => s.reset);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const commit = (mutate: (draft: Obj) => void): boolean => {
    const draft = structuredClone(settings) as unknown as Obj;
    mutate(draft);
    const r = settingsSchema.safeParse(draft);
    if (!r.success) {
      setMessage(t('settings.invalid', { error: formatZodError(r.error).join(' ; ') }));
      return false;
    }
    setSettings(r.data);
    setMessage(t('settings.saved'));
    return true;
  };

  const field = (f: FieldDef) => {
    const label = t(`settings.fields.${f.label}`);
    const v = getAt(settings, f.path);
    switch (f.kind) {
      case 'percent':
        return (
          <NumberField
            key={f.label}
            label={label}
            unit="%"
            value={(v as number) * 100}
            onChange={(x) => commit((d) => setAt(d, f.path, x / 100))}
          />
        );
      case 'list':
        return (
          <ListField
            key={`${f.label}-${version}`}
            label={label}
            help={t('settings.listHelp')}
            value={(v as number[]).join(', ')}
            onCommit={(raw) =>
              commit((d) =>
                setAt(
                  d,
                  f.path,
                  raw
                    .split(/[;,\s]+/)
                    .filter(Boolean)
                    .map(Number),
                ),
              )
            }
          />
        );
      case 'pairs':
        return (
          <ListField
            key={`${f.label}-${version}`}
            pairs
            label={label}
            help=""
            value={(v as { m: number; k: number }[]).map((p) => `${p.m}:${p.k}`).join(', ')}
            onCommit={(raw) =>
              commit((d) =>
                setAt(
                  d,
                  f.path,
                  raw
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => {
                      const [m, k] = s.split(':').map(Number);
                      return { m, k };
                    }),
                ),
              )
            }
          />
        );
      case 'range': {
        const [a, b] = v as [number, number];
        return (
          <div key={f.label} className="grid grid-cols-2 gap-2">
            <NumberField
              label={`${label} — min`}
              value={a}
              onChange={(x) => commit((d) => setAt(d, f.path, [x, b]))}
            />
            <NumberField
              label={`${label} — max`}
              value={b}
              onChange={(x) => commit((d) => setAt(d, f.path, [a, x]))}
            />
          </div>
        );
      }
      default:
        return (
          <NumberField
            key={f.label}
            label={label}
            value={v as number}
            onChange={(x) => commit((d) => setAt(d, f.path, x))}
          />
        );
    }
  };

  return (
    <>
      <PageTitle title={t('settings.title')} subtitle={t('settings.intro')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          variant="danger"
          onClick={() => {
            reset();
            setVersion((x) => x + 1);
            setMessage(t('settings.resetDone'));
          }}
        >
          {t('settings.reset')}
        </Button>
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      </div>
      <div className="space-y-4" key={version}>
        {GROUPS.map((g) => (
          <Card key={g.id}>
            <h2 className="mb-3 text-lg font-semibold">{t(`settings.groups.${g.id}`)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{g.fields.map(field)}</div>
          </Card>
        ))}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t('settings.groups.scenarios')}</h2>
          <div className="space-y-4">
            {SCENARIOS.map((sc) => {
              const s = settings.scenarios[sc];
              return (
                <fieldset
                  key={sc}
                  className="grid gap-3 border-b border-border pb-4 last:border-0 md:grid-cols-[12rem_8rem_1fr_auto] md:items-end"
                >
                  <legend className="sr-only">{t(`scenario.${sc}.title`)}</legend>
                  <p aria-hidden className="font-semibold md:self-center">
                    {t(`scenario.${sc}.title`)}
                  </p>
                  <NumberField
                    label={t('settings.fields.autonomyMin')}
                    value={s.autonomyMin}
                    min={1}
                    onChange={(x) => commit((d) => setAt(d, ['scenarios', sc, 'autonomyMin'], x))}
                  />
                  <div>
                    <p className="mb-1 text-sm font-medium">{t('settings.fields.technologies')}</p>
                    <div className="flex flex-wrap gap-x-4">
                      {TECHNOLOGIES.map((tech) => {
                        const all = s.technologies.includes('*');
                        const checked = all || s.technologies.includes(tech);
                        return (
                          <label key={tech} className="flex min-h-11 items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-[var(--color-primary)]"
                              checked={checked}
                              onChange={(e) => {
                                const current = all
                                  ? [...TECHNOLOGIES]
                                  : (s.technologies as string[]);
                                const next = e.target.checked
                                  ? [...current, tech]
                                  : current.filter((x) => x !== tech);
                                commit((d) =>
                                  setAt(
                                    d,
                                    ['scenarios', sc, 'technologies'],
                                    next.length === TECHNOLOGIES.length ? ['*'] : next,
                                  ),
                                );
                              }}
                            />
                            {t(`tech.${tech}`)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Choice
                    legend={t('settings.fields.redundancy')}
                    value={s.redundancy}
                    options={(['N', 'N+1', '2N'] as const).map((r) => ({ value: r, label: r }))}
                    onChange={(r) => commit((d) => setAt(d, ['scenarios', sc, 'redundancy'], r))}
                  />
                </fieldset>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
