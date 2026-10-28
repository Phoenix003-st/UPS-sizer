/** « Mes projets » : liste, ouverture, duplication, suppression, import / export `.ups.json`. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '../../app/router';
import { formatZodError } from '../../catalog/schemas';
import { projectSchema } from '../../engine/project';
import { useCurrentProject, useProjectStore } from '../../state/projectStore';
import { Button, Card, PageTitle, TextField } from '../../ui/components';
import { pickTextFile } from '../../ui/files';
import { exportProject } from './projectFiles';
import { formatDate } from '../../ui/format';
import { ScenarioIcon } from '../../ui/icons';

export function ProjectsScreen() {
  const { t, i18n } = useTranslation();
  const projects = useProjectStore((s) => s.projects);
  const { open, remove, removeAll, duplicate, importProject, update } = useProjectStore.getState();
  const current = useCurrentProject();
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const list = Object.values(projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const doImport = async () => {
    const text = await pickTextFile('.json,application/json');
    if (text === null) return;
    try {
      const r = projectSchema.safeParse(JSON.parse(text));
      if (!r.success) {
        setErrors(formatZodError(r.error));
        setMessage(null);
        return;
      }
      importProject(r.data);
      setErrors([]);
      setMessage(t('projects.imported'));
    } catch (e) {
      setErrors([String(e)]);
    }
  };

  return (
    <>
      <PageTitle title={t('projects.title')} subtitle={t('app.localOnly')} />
      {current && (
        <Card className="mb-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label={t('projects.name')}
              value={current.name}
              onChange={(v) => update((d) => void (d.name = v))}
            />
            <TextField
              label={t('projects.client')}
              value={current.client}
              onChange={(v) => update((d) => void (d.client = v))}
            />
            <TextField
              label={t('projects.author')}
              value={current.author}
              onChange={(v) => update((d) => void (d.author = v))}
            />
          </div>
        </Card>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => navigate('home')}>
          ＋ {t('nav.newProject')}
        </Button>
        <Button onClick={doImport}>{t('projects.import')}</Button>
        {list.length > 0 && (
          <Button
            variant="danger"
            onClick={() => {
              if (!window.confirm(t('projects.confirmDeleteAll', { n: list.length }))) return;
              removeAll();
              setErrors([]);
              setMessage(t('projects.deletedAll'));
            }}
          >
            {t('projects.deleteAll')}
          </Button>
        )}
      </div>
      <div role="status" aria-live="polite">
        {message && <p className="mb-2 text-sm text-ok">{message}</p>}
        {errors.length > 0 && (
          <div className="mb-3 rounded-lg border border-block bg-block-bg p-3 text-sm text-block">
            <p className="font-semibold">{t('projects.invalid')}</p>
            <ul className="list-disc ps-5 font-mono text-xs">
              {errors.slice(0, 10).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <Card>
          <p className="text-muted">{t('projects.empty')}</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <Card
                as="article"
                className={`flex flex-wrap items-center gap-3 ${current?.id === p.id ? 'border-2 border-primary' : ''}`}
              >
                <ScenarioIcon id={p.scenario} className="h-8 w-8 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{p.name || t('projects.untitled')}</h2>
                  <p className="text-xs text-muted">
                    {t(`scenario.${p.scenario}.title`)} ·{' '}
                    {t('projects.updated', {
                      date: formatDate(p.updatedAt, i18n.language, true),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="primary"
                    onClick={() => {
                      open(p.id);
                      navigate('solutions');
                    }}
                  >
                    {t('projects.open')}
                  </Button>
                  <Button
                    onClick={() =>
                      duplicate(
                        p.id,
                        t('projects.copy', { name: p.name || t('projects.untitled') }),
                      )
                    }
                  >
                    {t('projects.duplicate')}
                  </Button>
                  <Button onClick={() => exportProject(p)}>{t('projects.export')}</Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      window.confirm(
                        t('projects.confirmDelete', { name: p.name || t('projects.untitled') }),
                      ) && remove(p.id)
                    }
                  >
                    {t('projects.delete')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
