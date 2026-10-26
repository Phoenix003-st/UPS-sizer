/**
 * Édition multi-marques : choix des marques proposées et tableau des équivalents (meilleure option
 * de chaque marque pour le même besoin).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { brandEquivalents } from '../../engine';
import type { Project } from '../../engine/project';
import { useCatalogStore } from '../../state/catalogStore';
import { useProjectStore } from '../../state/projectStore';
import { useSettingsStore } from '../../state/settingsStore';
import { Button, Card, Choice } from '../../ui/components';
import { formatNumber, formatPct } from '../../ui/format';

const ALL = '*';

export function BrandFilter({ project }: { project: Project }) {
  const { t } = useTranslation();
  const models = useCatalogStore((s) => s.catalogs.ups.models);
  const update = useProjectStore((s) => s.update);
  const brands = [...new Set(models.map((m) => m.brand).filter(Boolean))];
  if (brands.length < 2) return null;
  const value = project.choice.brands.length === 1 ? project.choice.brands[0]! : ALL;
  return (
    <Choice
      className="mb-4"
      legend={t('brands.legend')}
      value={value}
      options={[
        { value: ALL, label: t('brands.all') },
        ...brands.map((b) => ({ value: b, label: b })),
      ]}
      onChange={(v) =>
        update((d) => {
          d.choice.brands = v === ALL ? [] : [v];
          d.layout.positions = {};
        })
      }
    />
  );
}

export function BrandComparison({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const catalogs = useCatalogStore((s) => s.catalogs);
  const settings = useSettingsStore((s) => s.settings);
  const update = useProjectStore((s) => s.update);
  const rows = useMemo(
    () => brandEquivalents(project, catalogs, settings),
    [project, catalogs, settings],
  );
  if (rows.length < 2) return null;
  const modelOf = (id: string) => catalogs.ups.models.find((m) => m.id === id);

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-bold">{t('brands.compareTitle')}</h2>
      <p className="mb-3 text-sm text-muted">{t('brands.compareHelp')}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <caption className="sr-only">{t('brands.compareTitle')}</caption>
          <thead>
            <tr className="border-b-2 border-border text-xs uppercase text-muted">
              <th scope="col" className="py-2 pe-2 text-start">
                {t('brands.brand')}
              </th>
              <th scope="col" className="py-2 pe-2 text-start">
                {t('brands.model')}
              </th>
              <th scope="col" className="py-2 pe-2 text-start">
                {t('solutions.configuration')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('solutions.loadRate')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('solutions.efficiency')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('brands.autonomy')}
              </th>
              <th scope="col" className="py-2 pe-2 text-end">
                {t('solutions.footprint')}
              </th>
              <th scope="col" className="py-2 text-end">
                <span className="sr-only">{t('brands.only')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ brand, option: o }) => {
              const m = o ? modelOf(o.ups.modelId) : undefined;
              const selected =
                project.choice.brands.length === 1 && project.choice.brands[0] === brand;
              return (
                <tr key={brand} className="border-b border-border align-top">
                  <th scope="row" className="py-2 pe-2 text-start font-semibold">
                    {brand}
                  </th>
                  {o ? (
                    <>
                      <td className="py-2 pe-2">
                        <span className="block font-medium">{m?.reference ?? o.ups.reference}</span>
                        {m?.partNumber && (
                          <span className="block text-xs text-muted">
                            {t('solutions.partNumber')} : {m.partNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pe-2">
                        {o.ups.modulesPerSystem !== undefined && m?.modular
                          ? t('solutions.modules', {
                              count: o.ups.modulesPerSystem,
                              kw: m.modular.moduleKW,
                            })
                          : t('solutions.units', { count: o.ups.unitsPerSystem })}
                        {o.ups.systems === 2 && ' × 2'} · {o.ups.redundancy}
                      </td>
                      <td className="py-2 pe-2 text-end">{formatPct(o.ups.loadRate, lang)}</td>
                      <td className="py-2 pe-2 text-end">{formatPct(o.ups.efficiency, lang, 1)}</td>
                      <td className="py-2 pe-2 text-end">
                        {(o.battery.autonomyIsLowerBound ? '≥ ' : '') +
                          formatNumber(o.battery.autonomyMin, lang, 0)}{' '}
                        min
                      </td>
                      <td className="py-2 pe-2 text-end">
                        {formatNumber(o.layout.footprintWithClearancesM2, lang, 1)} m²
                      </td>
                    </>
                  ) : (
                    <td colSpan={6} className="py-2 pe-2 text-muted">
                      {t('brands.none')}
                    </td>
                  )}
                  <td className="py-2 text-end">
                    {o && (
                      <Button
                        variant="ghost"
                        aria-pressed={selected}
                        onClick={() =>
                          update((d) => {
                            d.choice.brands = selected ? [] : [brand];
                            d.layout.positions = {};
                          })
                        }
                      >
                        {selected ? t('brands.showAll') : t('brands.only')}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
