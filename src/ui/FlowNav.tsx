/** Boutons « Retour » et « Continuer » du parcours (toujours présents). */
import { useTranslation } from 'react-i18next';
import { navigate, type Route } from '../app/router';
import { Button } from './components';

export function FlowNav({
  back,
  next,
  nextLabel,
  nextDisabled,
}: {
  back: Route;
  next?: Route;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex justify-between gap-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur">
      <Button onClick={() => navigate(back)}>
        <span aria-hidden className="rtl:rotate-180">
          ←
        </span>{' '}
        {t('nav.back')}
      </Button>
      {next && (
        <Button variant="primary" onClick={() => navigate(next)} disabled={nextDisabled}>
          {nextLabel ?? t('nav.next')}{' '}
          <span aria-hidden className="rtl:rotate-180">
            →
          </span>
        </Button>
      )}
    </div>
  );
}
