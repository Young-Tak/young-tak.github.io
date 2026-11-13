(() => {
  'use strict';
  const canvas = document.getElementById('landing-wave');
  const toggle = document.querySelector('.ocean-toggle');
  if (!canvas || !toggle) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const root = document.documentElement;
  const container = canvas.parentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let visible = false;
  let width = 0;
  let height = 0;
  let frame = 0;
  let last = 0;
  let time = 2.4;
  let columns = 42;
  const rows = 22;
  const tau = Math.PI * 2;

  function point(u, v) {
    // Travelling swells with unequal wavelengths, rather than a moving camera.
    const swell = Math.sin(u * tau * .91 + v * 2.3 - time * .35) * .102
      + Math.sin(u * tau * 1.63 - v * 3.8 + time * .23) * .041
      + Math.cos(v * 6.7 + u * 1.9 - time * .19) * .029;
    return {
      x: width * (.5 + (u - .5) * (.60 + .42 * v) + .075 * (1 - v)),
      y: height * (.20 + .55 * v - swell * (.65 + .35 * v)),
    };
  }

  // Catmull–Rom curves pass through every crossing of the net.
  function trace(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
    ctx.stroke();
  }

  function render() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const points = Array.from({ length: rows + 1 }, (_, r) =>
      Array.from({ length: columns + 1 }, (_, c) => point(c / columns, r / rows)));
    const horizontal = ctx.createLinearGradient(0, 0, width, 0);
    horizontal.addColorStop(0, 'rgba(36,84,193,0)');
    horizontal.addColorStop(.13, 'rgba(36,84,193,.85)');
    horizontal.addColorStop(.55, 'rgba(36,84,193,1)');
    horizontal.addColorStop(.86, 'rgba(36,84,193,.7)');
    horizontal.addColorStop(1, 'rgba(36,84,193,0)');
    ctx.strokeStyle = horizontal;
    for (let r = 0; r <= rows; r++) {
      const depth = r / rows;
      ctx.globalAlpha = .10 + .44 * Math.pow(depth, .8);
      ctx.lineWidth = .65 + depth * .3;
      trace(points[r]);
    }
    const vertical = ctx.createLinearGradient(0, height * .05, 0, height * .95);
    vertical.addColorStop(0, 'rgba(36,84,193,.03)');
    vertical.addColorStop(.4, 'rgba(36,84,193,.28)');
    vertical.addColorStop(.85, 'rgba(36,84,193,.45)');
    vertical.addColorStop(1, 'rgba(36,84,193,.08)');
    ctx.strokeStyle = vertical;
    ctx.lineWidth = .7;
    for (let c = 0; c <= columns; c++) {
      ctx.globalAlpha = Math.pow(Math.sin(Math.PI * c / columns), .6);
      trace(points.map(row => row[c]));
    }
    ctx.globalAlpha = 1;
  }

  function canRun() {
    return !paused && visible && !document.hidden && root.dataset.view === 'landing';
  }
  function tick(now) {
    frame = 0;
    if (!canRun()) { last = 0; return; }
    if (!last) last = now;
    const elapsed = now - last;
    // Bound rendering to 30 fps and avoid jumps after suspension.
    if (elapsed >= 1000 / 30) {
      time += Math.min(elapsed, 80) / 1000;
      last = now;
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (canRun()) {
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
  }
  function updateControl() {
    toggle.dataset.paused = String(paused);
    toggle.setAttribute('aria-label', paused ? 'Play wave animation' : 'Pause wave animation');
    toggle.title = toggle.getAttribute('aria-label');
    sync();
  }
  function resize() {
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    width = bounds.width;
    height = bounds.height;
    columns = width < 450 ? 28 : 42;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    render();
    sync();
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; updateControl(); });
  motion.addEventListener('change', () => { paused = motion.matches; updateControl(); });
  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(container);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-view'] });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; last = 0; });
  window.addEventListener('pageshow', sync);
  updateControl();
  resize();
})();
