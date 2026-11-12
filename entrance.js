(() => {
  'use strict';
  const root = document.documentElement;
  // Set before styles load so section links never flash the opening screen.
  root.dataset.view = location.hash ? 'profile' : 'landing';

  const syncView = () => {
    const wasLanding = root.dataset.view === 'landing';
    const isLanding = !location.hash;
    root.dataset.view = isLanding ? 'landing' : 'profile';
    if (wasLanding === isLanding) return;

    requestAnimationFrame(() => {
      if (isLanding) {
        document.querySelectorAll('video').forEach(video => video.pause());
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.querySelector('.landing-enter')?.focus({ preventScroll: true });
      } else {
        let targetId = location.hash.slice(1);
        try { targetId = decodeURIComponent(targetId); } catch (_) { /* Keep malformed hashes harmless. */ }
        const target = document.getElementById(targetId) || document.getElementById('main');
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
        const focusTarget = target.querySelector('h2') || target;
        focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: true });
      }
    });
  };
  window.addEventListener('hashchange', syncView);
  window.addEventListener('pageshow', syncView);
})();
