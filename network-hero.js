// Framework-free adapter for the supplied RadPathway network. No login code.
(() => {
  'use strict';
  const root = document.documentElement;
  const surface = document.querySelector('.landing-network');
  const toggle = document.querySelector('.ocean-toggle');
  if (!surface || !toggle) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const coarse = matchMedia('(pointer: coarse)');
  let paused = false;
  let visible = false;
  let failed = false;
  let loading = false;
  let engine = null;
  let canvas = null;
  let frame = 0;
  let lastTime = null;
  let elapsed = 0;
  let generation = 0;

  const inLanding = () => root.dataset.view === 'landing';
  const shouldAnimate = () => engine && !paused && !reduced.matches && visible && !document.hidden && inLanding();
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
  }
  function release() {
    stop();
    generation++;
    loading = false;
    if (canvas) canvas.removeEventListener('webglcontextlost', onContextLost);
    engine?.dispose();
    engine = null;
    canvas?.remove();
    canvas = null;
    surface.dataset.renderer = 'static';
    toggle.hidden = true;
  }
  function fallback(reason) {
    failed = true;
    release();
    surface.dataset.fallbackReason = reason;
  }
  function onContextLost(event) {
    event.preventDefault();
    fallback('context-loss');
  }
  function paint() {
    try { engine?.draw(elapsed, 0); }
    catch (_) { fallback('shader'); }
  }
  function resize() {
    if (!engine) return;
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    engine.resize(bounds.width, bounds.height, mobile.matches);
    paint();
    sync();
  }
  function tick(now) {
    frame = 0;
    if (!shouldAnimate()) { lastTime = null; return; }
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, .1);
    lastTime = now;
    elapsed += delta;
    try { engine.draw(elapsed, delta); }
    catch (_) { fallback('shader'); return; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (shouldAnimate()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else stop();
  }
  function updateControl() {
    toggle.dataset.paused = String(paused);
    toggle.setAttribute('aria-label', paused ? 'Play network animation' : 'Pause network animation');
    toggle.title = toggle.getAttribute('aria-label');
    sync();
  }
  async function ensureRenderer() {
    if (engine || loading || failed || reduced.matches || !inLanding() || !visible || document.hidden) return;
    loading = true;
    const attempt = ++generation;
    try {
      const { createTerrainRenderer } = await import('./assets/network/terrain-renderer.js');
      if (attempt !== generation) return;
      loading = false;
      if (reduced.matches || !inLanding() || !visible || document.hidden) return;
      canvas = document.createElement('canvas');
      canvas.className = 'landing-network-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      surface.append(canvas);
      canvas.addEventListener('webglcontextlost', onContextLost);
      engine = createTerrainRenderer(canvas, { mobile: mobile.matches });
      resize();
      if (!engine) return;
      surface.dataset.renderer = 'webgl';
      surface.dataset.mobile = String(mobile.matches);
      toggle.hidden = false;
      updateControl();
    } catch (_) {
      if (attempt === generation) fallback('unavailable');
    }
  }
  const onPointerMove = event => {
    if (!engine || paused || mobile.matches || coarse.matches || !inLanding()) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
    const y = 1 - (event.clientY - bounds.top) / Math.max(bounds.height, 1);
    engine.pointer(x, y, x >= 0 && x <= 1 && y >= 0 && y <= 1);
  };
  const clearPointer = () => engine?.clearPointer();
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', clearPointer, { passive: true });
  window.addEventListener('blur', clearPointer);
  toggle.addEventListener('click', () => { paused = !paused; updateControl(); });
  reduced.addEventListener('change', () => {
    if (reduced.matches) release();
    else ensureRenderer();
  });
  mobile.addEventListener('change', () => {
    surface.dataset.mobile = String(mobile.matches);
    clearPointer();
    resize();
  });
  coarse.addEventListener('change', clearPointer);
  new ResizeObserver(resize).observe(surface);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    ensureRenderer();
    sync();
  }).observe(surface);
  new MutationObserver(() => { ensureRenderer(); sync(); }).observe(root, { attributes: true, attributeFilter: ['data-view'] });
  document.addEventListener('visibilitychange', () => { ensureRenderer(); sync(); });
  window.addEventListener('pagehide', event => { if (event.persisted) stop(); else release(); });
  window.addEventListener('pageshow', () => { ensureRenderer(); sync(); });
})();
