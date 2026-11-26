(() => {
  'use strict';
  const root = document.documentElement;
  // Set before styles load so section links never flash the opening screen.
  root.dataset.view = location.hash ? 'profile' : 'landing';
  const restored = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  if (!restored && motion.matches) {
    if (root.dataset.view === 'landing') root.classList.add('landing-arrival');
    else root.dataset.profileArrival = location.hash === '#top' ? 'top' : 'section';
    const finishArrival = () => {
      root.classList.remove('landing-arrival');
      delete root.dataset.profileArrival;
    };
    window.addEventListener('pagehide', finishArrival, {once: true});
    motion.addEventListener?.('change', finishArrival, {once: true});
    if (root.dataset.profileArrival) {
      document.addEventListener('animationend', function menuReady(event) {
        if (event.animationName !== 'profile-menu-in') return;
        finishArrival();
        document.removeEventListener('animationend', menuReady);
      });
    }
  }
  // The cross-document dissolve runs in the story-to-profile direction only.
  window.addEventListener('pageswap', event => {
    const transition = event.viewTransition;
    if (!transition) return;
    transition.ready.catch(() => {}); // Skipping rejects the outgoing snapshot promise.
    transition.skipTransition();
  });

  const syncView = () => {
    const wasLanding = root.dataset.view === 'landing';
    const isLanding = !location.hash;
    root.dataset.view = isLanding ? 'landing' : 'profile';
    if (wasLanding === isLanding) return;
    root.classList.remove('landing-arrival');

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
        const focusTarget = (targetId === 'top' ? target.querySelector('h1') : target.querySelector('h2')) || target;
        focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: true });
      }
    });
  };
  window.addEventListener('hashchange', () => {
    delete root.dataset.profileArrival;
    syncView();
  });
  window.addEventListener('pageshow', syncView);
})();
