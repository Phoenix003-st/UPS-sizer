/** Livrable « Autonomie selon la charge » : courbe et tableau pour la batterie retenue. */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { NormalizedInputs, SolutionOption } from '../../engine/types';
import { useCatalogStore } from '../../state/catalogStore';
import { formatNumber } from '../../ui/format';
import { autonomyData, type AutonomyData } from './autonomyData';

export function AutonomyByLoad({
  option,
  inputs,
}: {
  option: SolutionOption;
  inputs: NormalizedInputs;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const catalogs = useCatalogStore((s) => s.catalogs);
  const data = useMemo(() => autonomyData(option, inputs, catalogs), [option, inputs, catalogs]);
  if (!data) return <p>{t('autonomyLoad.unavailable')}</p>;
  const b = option.battery;
  const min = (m: number, lowerBound: boolean) =>
    `${lowerBound ? '≥ ' : ''}${formatNumber(m, lang, m < 10 ? 1 : 0)}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {t('autonomyLoad.intro', {
          battery: `${b.blockReference} · ${b.blocksPerString} × ${b.strings}`,
          kw: formatNumber(data.capacityW / 1000, lang, 1),
        })}
      </p>
      <AutonomyChart data={data} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <caption className="sr-only">{t('autonomyLoad.title')}</caption>
          <thead>
            <tr className="border-b-2 border-border text-xs uppercase text-muted">
              <th scope="col" className="py-2 pe-2 text-end">
                {t('autonomyLoad.loadPct')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('autonomyLoad.loadKw')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('autonomyLoad.endOfLife')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('autonomyLoad.new')}
              </th>
              <th scope="col" className="py-2 text-start" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr
                key={`${r.loadPct}-${r.mark ?? ''}`}
                className={`border-b border-border/60 ${r.mark ? 'bg-primary/5 font-semibold' : ''}`}
              >
                <td className="py-1.5 pe-2 text-end">{formatNumber(r.loadPct, lang, 0)} %</td>
                <td className="py-1.5 pe-2 text-end">{formatNumber(r.loadW / 1000, lang, 2)}</td>
                <td className="py-1.5 pe-2 text-end">
                  {min(r.endOfLifeMin, r.endOfLifeLowerBound)}
                </td>
                <td className="py-1.5 pe-2 text-end">{min(r.newMin, r.newLowerBound)}</td>
                <td className="py-1.5 text-start text-xs text-primary">
                  {r.mark && t(`autonomyLoad.mark.${r.mark}`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {t('autonomyLoad.note', {
          factors: `${formatNumber(b.kAging, lang)} × ${formatNumber(b.kTemp, lang, 3)} × ${formatNumber(b.kMargin, lang)}`,
          eod: formatNumber(b.eodVpc, lang),
        })}
      </p>
    </div>
  );
}

const W = 640;
const H = 300;
const PAD = { l: 48, r: 16, t: 12, b: 40 };

function niceMax(v: number): number {
  const steps = [1, 2, 2.5, 5, 10];
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return (steps.find((s) => s * p >= v) ?? 10) * p;
}

function AutonomyChart({ data }: { data: AutonomyData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const xMax = data.curve[data.curve.length - 1]!.loadPct;
  const yMax = niceMax(Math.max(...data.curve.map((p) => p.newMin)));
  const x = (pct: number) => PAD.l + (pct / xMax) * (W - PAD.l - PAD.r);
  const y = (m: number) => H - PAD.b - (Math.min(m, yMax) / yMax) * (H - PAD.t - PAD.b);
  const path = (k: 'endOfLifeMin' | 'newMin') =>
    data.curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.loadPct)},${y(p[k])}`).join(' ');
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * yMax);
  const xTicks = Array.from({ length: Math.floor(xMax / 10) + 1 }, (_, i) => i * 10);
  const marks = data.rows.filter((r) => r.mark);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full max-w-3xl"
        role="img"
        aria-label={t('autonomyLoad.chart')}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#c9d1db" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#4a5868">
              {formatNumber(v, lang, 0)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text
            key={v}
            x={x(v)}
            y={H - PAD.b + 16}
            textAnchor="middle"
            fontSize={11}
            fill="#4a5868"
          >
            {v}
          </text>
        ))}
        <text
          x={(PAD.l + W - PAD.r) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={11}
          fill="#4a5868"
        >
          {t('autonomyLoad.loadPct')}
        </text>
        <text
          x={12}
          y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#4a5868"
          transform={`rotate(-90 12 ${(PAD.t + H - PAD.b) / 2})`}
        >
          {t('autonomyLoad.minutes')}
        </text>
        {marks.map((m) => (
          <line
            key={m.mark}
            x1={x(m.loadPct)}
            x2={x(m.loadPct)}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="#4a5868"
            strokeDasharray="4 4"
          />
        ))}
        <path d={path('newMin')} fill="none" stroke="#0f766e" strokeWidth={2} />
        <path d={path('endOfLifeMin')} fill="none" stroke="#1f4e79" strokeWidth={2.5} />
        {marks.map((m) => (
          <circle key={m.mark} cx={x(m.loadPct)} cy={y(m.endOfLifeMin)} r={4} fill="#1f4e79" />
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
        <span>
          <span aria-hidden className="me-1 inline-block h-0.5 w-5 bg-primary align-middle" />
          {t('autonomyLoad.endOfLife')}
        </span>
        <span>
          <span aria-hidden className="me-1 inline-block h-0.5 w-5 bg-accent align-middle" />
          {t('autonomyLoad.new')}
        </span>
        <span>
          <span aria-hidden className="me-1">
            ┆
          </span>
          {marks.map((m) => t(`autonomyLoad.mark.${m.mark}`)).join(' · ')}
        </span>
      </figcaption>
    </figure>
  );
}
