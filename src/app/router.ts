/** Navigation par l'ancre de l'URL (#/power…) : fonctionne en fichier local et sur GitHub Pages. */
import { useSyncExternalStore } from 'react';

export const FLOW = ['home', 'power', 'room', 'solutions', 'deliverables'] as const;
export const ROUTES = [...FLOW, 'settings', 'catalogs', 'projects'] as const;
export type Route = (typeof ROUTES)[number];

export function parseRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '';
  return (ROUTES as readonly string[]).includes(r) ? (r as Route) : 'home';
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(
    subscribe,
    () => parseRoute(window.location.hash),
    () => 'home',
  );
}

export function navigate(route: Route) {
  const target = route === 'home' ? '#/' : `#/${route}`;
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo?.({ top: 0 });
}
