(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main || !('IntersectionObserver' in window) || !window.matchMedia) return;

  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selectors = [
    '#research > h2', '#research > .intro-lead', '.intro-copy > p',
    '.research-agenda > h3', '.research-area-copy > h4', '.research-area-copy > p',
    '.research-vision > .research-next', '.research-vision > .research-figure', '.research-links',
    '#main > section > .section-heading', '.publication',
    '.background-group > h3', '.institution-entry', '.service-group > h3', '.service-entry',
    '.patents-section > .section-description', '.patent-group > .subsection-heading', '.patent-entry',
    '.contact-details', '.contact-portraits'
  ].join(',');
  const candidates = new Set();
  const revealed = new WeakSet();
  let observer;
  let contentObserver;
  let viewObserver;
  let scheduled = false;
  let failed = false;

  function show(element, immediately = false) {
    if (!element) return;
    if (immediately) element.classList.add('reveal-instant');
    element.classList.remove('reveal-pending');
    element.classList.add('reveal-visible');
    revealed.add(element);
    observer?.unobserve(element);
  }

  function revealAll() {
    root.classList.remove('scroll-reveal-ready');
    candidates.forEach(element => show(element, true));
    observer?.disconnect();
  }

  function failOpen() {
    failed = true;
    revealAll();
    contentObserver?.disconnect();
    viewObserver?.disconnect();
  }

  function revealTarget(target) {
    if (!(target instanceof Element)) return;
    // Anchor and keyboard navigation must never land on transparent text.
    candidates.forEach(element => {
      if (element === target || element.contains(target)) show(element, true);
    });
    const heading = target.querySelector('h1, h2, h3, h4');
    if (heading) candidates.forEach(element => {
      if (element === heading || element.contains(heading)) show(element, true);
    });
  }

  function revealHash(hash = location.hash) {
    if (!hash) return;
    let id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch (_) { /* A malformed hash is harmless. */ }
    revealTarget(document.getElementById(id));
  }

  function refresh() {
    scheduled = false;
    if (failed) return;
    try {
      main.querySelectorAll(selectors).forEach((element, index) => {
        if (candidates.has(element)) return;
        candidates.add(element);
        element.classList.add('scroll-reveal');
        element.style.setProperty('--reveal-delay', `${(index % 3) * 35}ms`);
        if (motion.matches) {
          show(element, true);
        } else if (!revealed.has(element)) {
          element.classList.add('reveal-pending');
          observer.observe(element);
        }
      });
      if (motion.matches) {
        revealAll();
        return;
      }
      root.classList.add('scroll-reveal-ready');
      // Fast jumps should not leave already-passed content hidden when scrolling back.
      candidates.forEach(element => {
        if (revealed.has(element) || !element.getClientRects().length) return;
        if (element.getBoundingClientRect().bottom < 0) show(element, true);
      });
      revealHash();
    } catch (_) { failOpen(); }
  }

  function queueRefresh() {
    if (scheduled || failed) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  try {
    observer = new IntersectionObserver(entries => {
      try {
        entries.forEach(entry => {
          if (entry.isIntersecting) show(entry.target);
        });
      } catch (_) { failOpen(); }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    // Publication filtering changes both order and hidden state. Observe only
    // structural/visibility changes, never the classes written by this effect.
    contentObserver = new MutationObserver(queueRefresh);
    contentObserver.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    viewObserver = new MutationObserver(queueRefresh);
    viewObserver.observe(root, { attributes: true, attributeFilter: ['data-view'] });
    document.addEventListener('publications:filtered', queueRefresh);
    document.addEventListener('toggle', queueRefresh, true);
    document.addEventListener('focusin', event => revealTarget(event.target));
    document.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href^="#"]');
      if (link) revealHash(link.hash);
    }, true);
    window.addEventListener('hashchange', () => { revealHash(); queueRefresh(); });
    window.addEventListener('pageshow', queueRefresh);
    const motionChanged = () => { if (motion.matches) revealAll(); else queueRefresh(); };
    if (motion.addEventListener) motion.addEventListener('change', motionChanged);
    else motion.addListener(motionChanged);
    refresh();
  } catch (_) { failOpen(); }
})();
