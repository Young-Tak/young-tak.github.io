(() => {
  'use strict';

  const section = document.getElementById('research');
  const track = section?.querySelector('.story-track');
  if (!track || !window.matchMedia) return;

  const stage = track.querySelector('.story-stage');
  const layout = stage.querySelector('.story-layout');
  const heading = stage.querySelector('.story-title');
  const count = stage.querySelector('.story-count');
  const status = stage.querySelector('.story-announcement');
  const previous = stage.querySelector('.story-prev');
  const next = stage.querySelector('.story-next');
  const fullLink = stage.querySelector('.story-mode');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const profile = document.querySelector('.profile');
  const photo = profile?.querySelector('.profile-photo > a');

  const slides = [...layout.querySelectorAll('.story-panel')].map(panel => {
    const line = panel.querySelector('.story-line');
    const key = line.dataset.scene;
    const svg = panel.querySelector('.story-scene');
    const button = stage.querySelector('button[data-scene="' + key + '"]');
    const parts = [...svg.querySelectorAll('[data-from][data-to]')].map(node => {
      const data = node.dataset;
      if (node.hasAttribute('data-draw')) node.style.strokeDasharray = '1';
      return {
        node, from: Number(data.from), to: Number(data.to),
        draw: node.hasAttribute('data-draw'), appear: node.hasAttribute('data-appear'),
        shiftX: Number(data.shiftX || 0), shiftY: Number(data.shiftY || 0),
        zoom: Number(data.zoomTo || 1), cx: Number(data.cx || 0), cy: Number(data.cy || 0),
        path: data.follow ? document.getElementById(data.follow) : null
      };
    });
    return {panel, title: panel.querySelector('.story-panel-title').textContent, line, svg, button, parts};
  });
  if (!slides.length || slides.some(slide => !slide.button || !slide.parts.length)) return;

  const last = slides.length - 1;
  const saved = slides.findIndex(slide => slide.line.dataset.scene === history.state?.researchScene);
  let active = Math.max(0, saved);
  let requested = active;
  let frame = 0;
  let transition;

  function draw(progress, slide = slides[active]) {
    for (const part of slide.parts) {
      const {node, from, to} = part;
      const t = Math.max(0, Math.min(1, (progress - from) / (to - from)));
      if (t === part.lastValue) continue;
      part.lastValue = t;
      if (part.draw) node.style.strokeDashoffset = String(1 - t);
      if (part.appear) node.style.opacity = String(.12 + .88 * t);
      if (part.path) {
        part.length ??= part.path.getTotalLength();
        const point = part.path.getPointAtLength(t * part.length);
        node.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
      } else if (part.zoom !== 1) {
        const scale = 1 + (part.zoom - 1) * t * t * (3 - 2 * t);
        node.setAttribute('transform', 'translate(' + part.cx + ' ' + part.cy + ') scale(' + scale + ') translate(' + -part.cx + ' ' + -part.cy + ')');
      } else if (part.shiftX || part.shiftY) {
        const remaining = 1 - t * t * (3 - 2 * t);
        node.setAttribute('transform', 'translate(' + part.shiftX * remaining + ' ' + part.shiftY * remaining + ')');
      }
    }
  }

  function stopPlayback() {
    cancelAnimationFrame(frame);
    frame = 0;
    transition?.cancel();
    transition = undefined;
  }

  function playFigure() {
    if (track.hidden || reduce.matches || document.hidden) {
      draw(1);
      return;
    }
    const start = performance.now();
    draw(.08);
    const tick = now => {
      const progress = Math.min(1, (now - start) / 1550);
      draw(.08 + .92 * progress);
      frame = progress < 1 ? requestAnimationFrame(tick) : 0;
    };
    frame = requestAnimationFrame(tick);
  }

  function display(index, announce) {
    active = index;
    const {line, title, button} = slides[index];
    slides.forEach((slide, i) => {
      const current = i === index;
      slide.panel.classList.toggle('is-current', current);
      slide.line.classList.toggle('is-current', current);
      slide.panel.inert = !current;
      slide.panel.setAttribute('aria-hidden', String(!current));
      if (current) slide.button.setAttribute('aria-current', 'step');
      else slide.button.removeAttribute('aria-current');
    });
    heading.textContent = title;
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    const accessibleName = button.getAttribute('aria-label');
    layout.setAttribute('aria-label', accessibleName);
    if (announce) {
      status.textContent = accessibleName;
      history.replaceState({...history.state, researchScene: line.dataset.scene}, '');
    }
    if (document.activeElement === previous && index === 0) next.focus({preventScroll: true});
    previous.disabled = index === 0;
    if (document.activeElement === next && index === last) fullLink.focus({preventScroll: true});
    next.disabled = index === last;
  }

  function goTo(index) {
    if (index < 0 || index > last || requested === index) return;
    requested = index;
    const direction = index > active ? 1 : -1;
    stopPlayback();

    // A short fade between plates keeps the chapter and controls stationary.
    if (reduce.matches || !layout.animate) {
      display(index, true);
      playFigure();
      return;
    }
    const exit = layout.animate([
      {opacity: 1}, {opacity: 0, transform: 'translateX(' + (-4 * direction) + 'px)'}
    ], {duration: 90, easing: 'ease-in', fill: 'forwards'});
    transition = exit;
    exit.finished.then(() => {
      if (exit !== transition) return;
      exit.cancel();
      display(index, true);
      playFigure();
      transition = layout.animate([
        {opacity: .1, transform: 'translateX(' + (8 * direction) + 'px)'},
        {opacity: 1, transform: 'translateX(0)'}
      ], {duration: 250, easing: 'cubic-bezier(.2,.75,.25,1)'});
    }, () => {}); // A second input supersedes an unfinished transition.
  }

  function alignToPhoto() {
    if (!photo || track.hidden || !track.getClientRects().length) return;
    if (!matchMedia('(min-width: 961px)').matches) {
      stage.style.removeProperty('--story-photo-offset');
      return;
    }
    const fixed = getComputedStyle(profile).position === 'fixed';
    const photoTop = photo.getBoundingClientRect().top + (fixed ? 0 : scrollY);
    const trackTop = track.getBoundingClientRect().top + scrollY;
    stage.style.setProperty('--story-photo-offset', Math.max(0, photoTop - trackTop) + 'px');
  }

  slides.forEach(({button}, i) => button.addEventListener('click', () => goTo(i)));
  previous.addEventListener('click', () => goTo(requested - 1));
  next.addEventListener('click', () => goTo(requested + 1));
  stage.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    goTo(requested + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  function settle() {
    stopPlayback();
    display(requested, requested !== active);
    draw(1);
  }
  if (reduce.addEventListener) reduce.addEventListener('change', settle);
  else reduce.addListener(settle);
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  window.addEventListener('resize', alignToPhoto, {passive: true});
  if (photo && window.ResizeObserver) new ResizeObserver(alignToPhoto).observe(photo.parentElement.parentElement);
  document.fonts?.ready.then(alignToPhoto);

  window.addEventListener('beforeprint', () => {
    stopPlayback();
    slides.forEach(slide => {
      slide.panel.inert = false;
      slide.panel.removeAttribute('aria-hidden');
      draw(1, slide);
    });
  });
  window.addEventListener('afterprint', settle);

  section.classList.add('story-enhanced');
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-roledescription', 'carousel');
  stage.setAttribute('aria-label', 'Research story');
  stage.tabIndex = -1;
  layout.setAttribute('role', 'group');
  layout.setAttribute('aria-roledescription', 'slide');
  display(active, false);
  alignToPhoto();
  playFigure();
})();
