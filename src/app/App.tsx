import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CatalogScreen } from '../features/catalog-editor/CatalogScreen';
import { DeliverablesScreen } from '../features/deliverables/DeliverablesScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PowerScreen } from '../features/power/PowerScreen';
import { ProjectsScreen } from '../features/projects/ProjectsScreen';
import { RoomScreen } from '../features/room/RoomScreen';
import { SettingsScreen } from '../features/settings-screen/SettingsScreen';
import { SolutionsScreen } from '../features/solutions/SolutionsScreen';
import { LANGUAGES, setLanguage, type Lang } from '../i18n';
import { useCurrentProject } from '../state/projectStore';
import { FLOW, navigate, useRoute, type Route } from './router';

const STEP_KEYS: Record<(typeof FLOW)[number], string> = {
  home: 'steps.type',
  power: 'steps.power',
  room: 'steps.room',
  solutions: 'steps.solution',
  deliverables: 'steps.deliverables',
};

function Header({ route }: { route: Route }) {
  const { t, i18n } = useTranslation();
  const link = (r: Route, label: string) => (
    <button
      type="button"
      onClick={() => navigate(r)}
      aria-current={route === r ? 'page' : undefined}
      className="min-h-11 rounded-lg px-3 text-sm font-semibold text-on-primary hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-white aria-[current=page]:bg-white/15"
    >
      {label}
    </button>
  );
  return (
    <header className="bg-primary text-on-primary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex min-h-11 items-center gap-2 rounded-lg pe-2 focus-visible:outline-3 focus-visible:outline-white"
        >
          <img src="./logo.svg" alt="" className="h-8 w-8 rounded-md bg-white/10" />
          <span className="text-lg font-bold">{t('app.name')}</span>
          <span className="hidden text-sm opacity-85 md:inline">— {t('app.tagline')}</span>
        </button>
        <nav aria-label={t('nav.menu')} className="flex flex-wrap items-center gap-1">
          {link('projects', t('nav.projects'))}
          {link('settings', t('nav.settings'))}
          {link('catalogs', t('nav.catalogs'))}
          <label className="sr-only" htmlFor="lang">
            {t('nav.language')}
          </label>
          <select
            id="lang"
            value={i18n.language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
            className="min-h-11 rounded-lg border border-white/40 bg-primary px-2 text-sm font-semibold text-on-primary focus-visible:outline-3 focus-visible:outline-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </nav>
      </div>
    </header>
  );
}

function Stepper({ route }: { route: (typeof FLOW)[number] }) {
  const { t } = useTranslation();
  const idx = FLOW.indexOf(route);
  return (
    <nav aria-label={t('steps.label')} className="border-b border-border bg-surface">
      <ol className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
        {FLOW.map((r, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <li key={r} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => navigate(r)}
                disabled={i > idx + 1}
                aria-current={current ? 'step' : undefined}
                className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-[var(--color-accent)] disabled:cursor-default ${
                  current ? 'text-primary' : done ? 'text-text' : 'text-muted'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs ${
                    current
                      ? 'border-primary bg-primary text-on-primary'
                      : done
                        ? 'border-primary text-primary'
                        : 'border-border'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className={current ? 'truncate' : 'hidden truncate sm:inline'}>{t(STEP_KEYS[r])}</span>
                {current && <span className="sr-only">({t('steps.current')})</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="h-1 bg-bg" aria-hidden>
        <div
          className="h-1 bg-primary transition-all"
          style={{ width: `${((idx + 1) / FLOW.length) * 100}%` }}
        />
      </div>
    </nav>
  );
}

export function App() {
  const { t } = useTranslation();
  const route = useRoute();
  const project = useCurrentProject();
  const mainRef = useRef<HTMLElement>(null);
  const needsProject =
    route === 'power' || route === 'room' || route === 'solutions' || route === 'deliverables';

  useEffect(() => {
    if (needsProject && !project) navigate('home');
  }, [needsProject, project]);
  useEffect(() => {
    document.title = `${t('app.name')} — ${t(route === 'home' ? 'app.tagline' : `nav.${route}`, { defaultValue: t(STEP_KEYS[route as (typeof FLOW)[number]] ?? 'app.tagline') })}`;
  }, [route, t]);

  const screen = (() => {
    if (needsProject && !project) return null;
    switch (route) {
      case 'power':
        return <PowerScreen project={project!} />;
      case 'room':
        return <RoomScreen project={project!} />;
      case 'solutions':
        return <SolutionsScreen project={project!} />;
      case 'deliverables':
        return <DeliverablesScreen project={project!} />;
      case 'settings':
        return <SettingsScreen />;
      case 'catalogs':
        return <CatalogScreen />;
      case 'projects':
        return <ProjectsScreen />;
      default:
        return <HomeScreen />;
    }
  })();

  const inFlow = (FLOW as readonly string[]).includes(route);
  return (
    <div className="flex min-h-screen flex-col">
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only z-50 bg-surface p-3 focus:not-sr-only focus:fixed focus:start-2 focus:top-2"
      >
        {t('app.skip')}
      </button>
      <Header route={route} />
      {inFlow && <Stepper route={route as (typeof FLOW)[number]} />}
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none"
      >
        {screen}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-muted">
          <p className="font-semibold text-text">{t('app.disclaimer')}</p>
          <p>{t('app.localOnly')}</p>
        </div>
      </footer>
    </div>
  );
}
