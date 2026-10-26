/** Accueil : grandes cartes par type d'installation, sans jargon. */
import { useTranslation } from 'react-i18next';
import { navigate } from '../../app/router';
import { SCENARIOS } from '../../settings/schema';
import { useCatalogStore } from '../../state/catalogStore';
import { useCurrentProject, useProjectStore } from '../../state/projectStore';
import { useSettingsStore } from '../../state/settingsStore';
import { Button, PageTitle } from '../../ui/components';
import { formatDate } from '../../ui/format';
import { ScenarioIcon } from '../../ui/icons';

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const create = useProjectStore((s) => s.create);
  const settings = useSettingsStore((s) => s.settings);
  const catalogVersion = useCatalogStore((s) => s.catalogs.ups.meta.catalogVersion);
  const current = useCurrentProject();

  return (
    <>
      <PageTitle title={t('home.title')} subtitle={t('home.subtitle')} />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SCENARIOS.map((sc) => (
          <li key={sc}>
            <button
              type="button"
              onClick={() => {
                const p = create(sc, settings, catalogVersion);
                useProjectStore.getState().update((d) => {
                  d.name = `${t(`scenario.${sc}.title`)} — ${formatDate(p.createdAt, i18n.language)}`;
                });
                navigate('power');
              }}
              className="group flex h-full min-h-32 w-full items-center gap-4 rounded-2xl border-2 border-border bg-surface p-5 text-start shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-bg text-primary group-hover:bg-primary group-hover:text-on-primary">
                <ScenarioIcon id={sc} />
              </span>
              <span>
                <span className="block text-lg font-bold">{t(`scenario.${sc}.title`)}</span>
                <span className="block text-sm text-muted">{t(`scenario.${sc}.desc`)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        {current && (
          <Button variant="primary" onClick={() => navigate('power')}>
            {t('home.resume', { name: current.name || t('projects.untitled') })}
          </Button>
        )}
        <Button onClick={() => navigate('projects')}>{t('home.myProjects')}</Button>
      </div>
    </>
  );
}
