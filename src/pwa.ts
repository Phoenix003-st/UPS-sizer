/**
 * Service worker (application hors ligne) : enregistrement et mise à jour automatique.
 *
 * Une nouvelle version publiée est installée en arrière-plan ; dès qu'elle prend la main
 * (skipWaiting + clientsClaim), la page se recharge pour l'afficher. Sans cela, le navigateur
 * continuait d'afficher l'ancienne version en cache jusqu'à fermeture de tous les onglets.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE === 'singlefile') return;
  if (!('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  // Page déjà contrôlée par une version précédente : rechargée quand la nouvelle prend la main.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base, updateViaCache: 'none' })
      .then((reg) => {
        const check = () => void reg.update().catch(() => undefined);
        // Vérifie les mises à jour au retour sur l'onglet et toutes les heures.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        setInterval(check, 60 * 60 * 1000);
      })
      .catch(() => undefined);
  });
}
