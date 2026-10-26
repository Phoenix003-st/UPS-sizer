/** Note de calcul d'ingénierie, imprimable, générée à partir des traces du moteur. */
import { useTranslation } from 'react-i18next';
import type { Project } from '../../engine/project';
import type { SizingResult, SolutionOption } from '../../engine/types';
import { TraceList } from '../../ui/CalcView';
import { AlertList, Stat } from '../../ui/components';
import { formatNumber, formatPct } from '../../ui/format';

export function CalcNote({
  project,
  result,
  option,
}: {
  project: Project;
  result: SizingResult;
  option: SolutionOption;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const n = (v: number, d = 1) => formatNumber(v, lang, d);
  const inp = result.inputs;
  const b = option.battery;
  return (
    <article className="calc-note space-y-6">
      <header className="border-b border-border pb-3">
        <h2 className="text-xl font-bold">{t('calcNote.title')}</h2>
        <p className="text-sm text-muted">
          {project.name || t('projects.untitled')}
          {project.client && ` — ${project.client}`} —{' '}
          {new Date(project.updatedAt).toLocaleDateString(lang)}
        </p>
        <p className="mt-2 rounded-md border border-warn bg-warn-bg px-3 py-1.5 text-sm font-semibold text-warn">
          {t('app.disclaimer')}
        </p>
      </header>

      <section>
        <h3 className="mb-2 font-semibold">{t('calcNote.inputs')}</h3>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Stat label={t('power.loadReal')}>{n(inp.loadW / 1000, 2)} kW</Stat>
          <Stat label={t('power.design')}>
            {n(inp.designW / 1000, 2)} kW / {n(inp.designVA / 1000, 2)} kVA
          </Stat>
          <Stat label={t('power.growthMargin')}>{formatPct(inp.growthMargin, lang)}</Stat>
          <Stat label={t('power.targetLoadRate')}>{formatPct(inp.targetLoadRate, lang)}</Stat>
          <Stat label={t('power.phases')}>
            {inp.phases === 3 ? t('power.phasesTri') : t('power.phasesMono')} {inp.voltageV} V{' '}
            {inp.freqHz} Hz
          </Stat>
          <Stat label={t('power.redundancy')}>{inp.redundancy}</Stat>
          <Stat label={t('power.autonomy')}>{n(inp.autonomyMin, 0)} min</Stat>
          <Stat label={t('power.eod')}>{n(inp.eodVpc, 2)} V/él.</Stat>
          <Stat label={t('room.dimensions')}>
            {n(project.room.lengthMm / 1000, 2)} × {n(project.room.widthMm / 1000, 2)} ×{' '}
            {n(project.room.heightMm / 1000, 2)} m
          </Stat>
          <Stat label={t('room.ambient')}>{n(project.room.ambientC, 0)} °C</Stat>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">{t('calcNote.solution')}</h3>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Stat label={t(`solutions.tier.${option.tier}`)}>{option.ups.reference}</Stat>
          <Stat label={t('solutions.configuration')}>
            {option.ups.units} ×{' '}
            {option.ups.modulesPerSystem !== undefined
              ? `(${option.ups.modulesPerSystem * option.ups.systems} modules)`
              : ''}{' '}
            {option.ups.redundancy}
          </Stat>
          <Stat label={t('solutions.loadRate')}>{formatPct(option.ups.loadRate, lang)}</Stat>
          <Stat label={t('solutions.battery')}>
            {t(`chemistry.${b.chemistry}`)} {n(b.blockV)} V {n(b.capacityAh, 0)} Ah —{' '}
            {b.blocksPerString} × {b.strings} × {b.sets}
          </Stat>
          <Stat label={t('solutions.autonomy')}>
            {n(b.autonomyMin, 1)} min ({t('solutions.autonomyNew', { min: n(b.autonomyNewMin, 0) })}
            )
          </Stat>
          <Stat label="U DC">{n(b.dcNominalV, 0)} V</Stat>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">{t('calcNote.currents')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border text-xs uppercase text-muted">
                <th scope="col" className="py-1 pe-2 text-start">
                  {t('calcNote.circuit')}
                </th>
                <th scope="col" className="py-1 pe-2 text-end">
                  {t('calcNote.qty')}
                </th>
                <th scope="col" className="py-1 pe-2 text-end">
                  {t('calcNote.ib')}
                </th>
                <th scope="col" className="py-1 pe-2 text-end">
                  {t('calcNote.in')}
                </th>
                <th scope="col" className="py-1 pe-2 text-end">
                  {t('calcNote.section')}
                </th>
                <th scope="col" className="py-1 pe-2 text-end">
                  {t('calcNote.length')}
                </th>
                <th scope="col" className="py-1 text-end">
                  {t('calcNote.drop')}
                </th>
              </tr>
            </thead>
            <tbody>
              {option.electrical.circuits.map((c, i) => (
                <tr key={i} className="border-b border-border/60">
                  <th scope="row" className="py-1 pe-2 text-start font-medium">
                    {t(`bom.circuit.${c.id}`)} {option.ups.systems === 2 ? `(${c.system})` : ''}
                  </th>
                  <td className="py-1 pe-2 text-end">{c.qty}</td>
                  <td className="py-1 pe-2 text-end">{n(c.currentA, 1)}</td>
                  <td className="py-1 pe-2 text-end">{c.breakerA ?? '—'}</td>
                  <td className="py-1 pe-2 text-end">
                    {c.cable
                      ? `${c.cable.parallel > 1 ? `${c.cable.parallel} × ` : ''}${c.cable.sectionMm2} mm²`
                      : '—'}
                  </td>
                  <td className="py-1 pe-2 text-end">{n(c.lengthM, 0)} m</td>
                  <td className="py-1 text-end">
                    {c.cable ? `${n(c.cable.voltageDropPct, 2)} %` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-2 font-semibold">{t('calcNote.thermal')}</h3>
          <dl>
            <Stat label={t('calc.thermal.total')}>{n(option.thermal.totalW / 1000, 2)} kW</Stat>
            <Stat label={t('calc.thermal.btu')}>{n(option.thermal.totalBtuH, 0)} BTU/h</Stat>
            <Stat label={t('room.hvacKW')}>
              {option.thermal.hvacKW === null ? '—' : `${n(option.thermal.hvacKW, 1)} kW`}
            </Stat>
          </dl>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">{t('calcNote.floor')}</h3>
          <dl>
            <Stat label={t('calc.layout.floor')}>
              {n(option.layout.floor.maxDistributedKgM2, 0)} kg/m²
            </Stat>
            <Stat label={t('room.floor')}>{n(option.layout.floor.admissibleKgM2, 0)} kg/m²</Stat>
            <Stat label={t('solutions.weight')}>{n(option.layout.floor.totalWeightKg, 0)} kg</Stat>
          </dl>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">{t('calcNote.ventilation')}</h3>
          {option.ventilation.applicable ? (
            <dl>
              <Stat label={t('calc.vent.flow')}>{n(option.ventilation.flowM3h, 2)} m³/h</Stat>
              <Stat label={t('calc.vent.area')}>{n(option.ventilation.freeAreaCm2, 0)} cm²</Stat>
            </dl>
          ) : (
            <p className="text-sm">{t('calcNote.notApplicable')}</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">{t('calcNote.alerts')}</h3>
        <AlertList alerts={[...result.globalAlerts, ...option.alerts]} empty={t('room.noAlert')} />
      </section>

      <section>
        <TraceList traces={option.traces} />
      </section>
    </article>
  );
}
