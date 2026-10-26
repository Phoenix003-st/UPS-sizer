/** Point d'entrée léger de la vue 3D : three.js n'est chargé qu'à l'ouverture de la vue. */
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../engine/project';
import type { SolutionOption } from '../../engine/types';

const Viewer = lazy(() => import('./Room3DViewer'));

export function Room3D(props: { option: SolutionOption; project: Project; height?: string }) {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={<p className="grid h-64 place-items-center text-muted">{t('room3d.loading')}</p>}
    >
      <Viewer {...props} />
    </Suspense>
  );
}
