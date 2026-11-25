(() => {
  'use strict';
  const section = document.getElementById('research');
  if (!section || !window.matchMedia || !window.requestAnimationFrame) return;

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 1150px) and (min-height: 700px)');
  const highlights = [...section.querySelectorAll('[data-reading]')];
  const clamp = value => Math.max(0, Math.min(1, value));
  let frame = 0;
  let nearSection = true;
  let failed = false;
  let printing = false;
  let activeHighlight = null;
  let activeArea = null;

  const areas = [...section.querySelectorAll('.research-area')].map(element => {
    const figure = element.querySelector('.research-figure');
    const svg = figure?.querySelector('.research-scene');
    const steps = [...(svg?.querySelectorAll('[data-motion-draw], [data-motion-stage]') || [])].map(node => {
      const draw = node.hasAttribute('data-motion-draw');
      if (draw) {
        // A faint complete trace keeps the diagram intelligible at every scroll position.
        const track = node.cloneNode(true);
        ['id', 'data-motion-draw', 'data-start', 'data-end'].forEach(name => track.removeAttribute(name));
        track.setAttribute('class', 'scene-track');
        track.setAttribute('aria-hidden', 'true');
        node.before(track);
      }
      const hasText = node.tagName.toLowerCase() === 'text' || !!node.querySelector('text');
      const ink = hasText ? [...node.querySelectorAll('rect, path, circle, use')] : [];
      return { node, draw, hasText, ink, start: Number(node.dataset.start || 0), end: Number(node.dataset.end || 1) };
    });
    const marker = svg?.querySelector('[data-motion-marker]');
    const path = marker && svg.querySelector(marker.dataset.motionPath);
    return {
      element, figure, svg, steps, progress: -1,
      marker: path ? {
        node: marker, path, length: path.getTotalLength(),
        x: marker.getAttribute('cx'), y: marker.getAttribute('cy'),
        start: Number(marker.dataset.start), end: Number(marker.dataset.end)
      } : null
    };
  });

  function clearFocus() {
    activeHighlight?.classList.remove('is-reading');
    activeArea?.classList.remove('is-reading-area');
    activeHighlight = activeArea = null;
  }

  function showStatic() {
    root.classList.remove('research-motion-ready');
    clearFocus();
    areas.forEach(area => {
      area.progress = -1;
      area.steps.forEach(({ node, ink }) => {
        node.style.removeProperty('stroke-dasharray');
        node.style.removeProperty('stroke-dashoffset');
        node.style.removeProperty('opacity');
        node.style.removeProperty('transform');
        ink.forEach(shape => shape.style.removeProperty('opacity'));
      });
      if (area.marker) {
        area.marker.node.setAttribute('cx', area.marker.x);
        area.marker.node.setAttribute('cy', area.marker.y);
      }
    });
  }

  function drawScene(area, progress) {
    if (Math.abs(area.progress - progress) < .001) return;
    area.progress = progress;
    area.steps.forEach(({ node, draw, hasText, ink, start, end }) => {
      const p = clamp((progress - start) / Math.max(.01, end - start));
      if (draw) {
        node.style.strokeDasharray = '1';
        node.style.strokeDashoffset = String(1 - p);
      } else {
        // Labels remain legible; only geometry without text is allowed to travel slightly.
        if (hasText) {
          ink.forEach(shape => { shape.style.opacity = String(.22 + .78 * p); });
        } else {
          node.style.opacity = String(.22 + .78 * p);
          node.style.transform = `translateY(${(1 - p) * 4}px)`;
        }
      }
    });
    if (area.marker) {
      const { node, path, length, start, end } = area.marker;
      const point = path.getPointAtLength(clamp((progress - start) / (end - start)) * length);
      node.setAttribute('cx', point.x.toFixed(2));
      node.setAttribute('cy', point.y.toFixed(2));
    }
  }

  function render() {
    frame = 0;
    if (failed || document.hidden || printing) return;
    if (reduced.matches) {
      if (root.classList.contains('research-motion-ready')) showStatic();
      return;
    }
    if (root.dataset.view === 'landing' || !nearSection) { clearFocus(); return; }
    try {
      const height = window.innerHeight;
      const band = height * .46;
      // Read geometry before writing styles. No artificial scroll distance or scroll interception.
      const highlightRects = highlights.map(element => ({ element, rect: element.getBoundingClientRect() }));
      const areaRects = areas.map(area => ({
        area, rect: area.element.getBoundingClientRect(),
        driver: (wide.matches ? area.element : area.figure).getBoundingClientRect()
      }));
      root.classList.add('research-motion-ready');

      const focused = document.activeElement?.closest('[data-reading]');
      let nearest = null;
      let distance = Infinity;
      highlightRects.forEach(({ element, rect }) => {
        if (rect.bottom < height * .15 || rect.top > height * .85) return;
        const delta = Math.abs((rect.top + rect.bottom) / 2 - band);
        if (delta < distance) { nearest = element; distance = delta; }
      });
      const nextHighlight = focused && section.contains(focused) ? focused : nearest;
      if (nextHighlight !== activeHighlight) {
        activeHighlight?.classList.remove('is-reading');
        nextHighlight?.classList.add('is-reading');
        activeHighlight = nextHighlight;
      }

      let nextArea = null;
      areaRects.forEach(({ area, rect, driver }) => {
        if (rect.top <= band && rect.bottom >= band) nextArea = area.element;
        if (rect.top > height * 1.15) { drawScene(area, 0); return; }
        if (rect.bottom < 0) { drawScene(area, 1); return; }
        const travel = wide.matches ? Math.max(260, driver.height * .85) : Math.max(180, driver.height + height * .1);
        const progress = clamp((height * (wide.matches ? .68 : .86) - driver.top) / travel);
        drawScene(area, progress);
      });
      if (nextArea !== activeArea) {
        activeArea?.classList.remove('is-reading-area');
        nextArea?.classList.add('is-reading-area');
        activeArea = nextArea;
      }
    } catch (_) {
      failed = true;
      showStatic();
    }
  }

  function schedule() {
    if (frame || failed) return;
    frame = requestAnimationFrame(render);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('visibilitychange', schedule);
  section.addEventListener('focusin', schedule);
  section.addEventListener('focusout', schedule);
  window.addEventListener('beforeprint', () => { printing = true; showStatic(); });
  window.addEventListener('afterprint', () => { printing = false; schedule(); });
  if (reduced.addEventListener) reduced.addEventListener('change', schedule);
  else reduced.addListener(schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      nearSection = entries[0].isIntersecting;
      schedule();
    }, { rootMargin: '15% 0px' }).observe(section);
  }
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(section);
  new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['data-view'] });
  document.fonts?.ready.then(schedule);
  schedule();
})();
