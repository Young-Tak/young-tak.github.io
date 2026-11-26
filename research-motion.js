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
  const playbackRate = 1.1;
  const profile = document.querySelector('.profile');
  const photo = profile?.querySelector('.profile-photo > a');

  const slides = [...layout.querySelectorAll('.story-panel')].map(panel => {
    const line = panel.querySelector('.story-line');
    const key = line.dataset.scene;
    const svg = panel.querySelector('.story-scene');
    const button = stage.querySelector('button[data-scene="' + key + '"]');
    const parts = Array.from(svg?.querySelectorAll('[data-from][data-to]') || [], node => {
      const data = node.dataset;
      if (node.hasAttribute('data-draw')) node.style.strokeDasharray = '1';
      return {
        node, from: Number(data.from), to: Number(data.to),
        draw: node.hasAttribute('data-draw'), appear: node.hasAttribute('data-appear'),
        shiftX: Number(data.shiftX || 0), shiftY: Number(data.shiftY || 0),
        path: data.follow ? document.getElementById(data.follow) : null
      };
    });
    return {
      panel, title: panel.querySelector('.story-panel-title').textContent, line, button, parts,
      kicker: panel.querySelector('.story-kicker'),
      headline: line.querySelector('.story-key'), detail: line.querySelector('.story-detail'),
      figure: panel.querySelector('.story-art')
    };
  });
  if (!slides.length || slides.some(slide => !slide.button)) return;

  const last = slides.length - 1;
  const saved = slides.findIndex(slide => slide.line.dataset.scene === history.state?.researchScene);
  let active = Math.max(0, saved);
  let requested = active;
  let frame = 0;
  let figureTimer = 0;
  const arrival = [];
  const entrances = [];
  let exitAnimation;

  function draw(progress, slide = slides[active]) {
    for (const part of slide.parts) {
      const {node, from, to} = part;
      const t = Math.max(0, Math.min(1, (progress - from) / (to - from)));
      if (t === part.lastValue) continue;
      part.lastValue = t;
      const eased = t * t * (3 - 2 * t);
      if (part.draw) node.style.strokeDashoffset = String(1 - eased);
      if (part.appear) node.style.opacity = String(.12 + .88 * eased);
      if (part.path) {
        part.length ??= part.path.getTotalLength();
        const point = part.path.getPointAtLength(eased * part.length);
        node.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
      } else if (part.shiftX || part.shiftY) {
        const remaining = 1 - eased;
        node.setAttribute('transform', 'translate(' + part.shiftX * remaining + ' ' + part.shiftY * remaining + ')');
      }
    }
  }

  function stopPlayback() {
    clearTimeout(figureTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    exitAnimation?.cancel();
    exitAnimation = undefined;
    entrances.forEach(animation => animation.cancel());
    entrances.length = 0;
  }

  function reveal(element, delay, duration, from = 'none') {
    return element.animate([
      {opacity: 0, transform: from},
      {opacity: 1, transform: 'none'}
    ], {
      delay: delay / playbackRate, duration: duration / playbackRate,
      easing: 'cubic-bezier(.28,.10,.24,1)', fill: 'backwards'
    });
  }

  function playArrival() {
    // A horizontal entrance leaves the photo's measured vertical position intact.
    const identity = profile?.getClientRects().length
      ? profile.querySelector('.profile-top')
      : document.querySelector('.story-mobile-header');
    if (identity) arrival.push(reveal(identity, 0, 1120, 'translateX(-4px)'));
    arrival.push(reveal(heading.parentElement, 170, 1060, 'translateY(5px)'));
    arrival.push(reveal(stage.querySelector('.story-footer'), 0, 900));
  }

  function playSlide(lead = 0) {
    if (!layout.animate || track.hidden || reduce.matches || document.hidden) {
      draw(1);
      return;
    }
    const slide = slides[active];
    entrances.push(
      reveal(slide.kicker, lead, 760),
      reveal(slide.headline, lead, 990, 'translateY(7px)'),
      reveal(slide.detail, lead + 880, 1000, 'translateY(5px)')
    );
    if (!slide.figure) return;

    const figureDelay = lead + 1770;
    entrances.push(reveal(slide.figure, figureDelay, 1100, 'translateY(4px)'));
    if (!slide.parts.length) return;
    draw(0, slide);
    const wait = figureDelay / playbackRate;
    const start = performance.now() + wait;
    const tick = now => {
      const progress = Math.min(1, (now - start) * playbackRate / 2250);
      if (progress > 0) draw(progress, slide);
      frame = progress < 1 ? requestAnimationFrame(tick) : 0;
    };
    figureTimer = setTimeout(() => { frame = requestAnimationFrame(tick); }, wait);
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
    if (reduce.matches || document.hidden || !layout.animate) {
      settle();
      return;
    }
    // Repeated inputs during the exit update the destination of this same fade.
    if (exitAnimation) return;
    const exit = layout.animate([{opacity: 1}, {opacity: 0}],
      {duration: 200 / playbackRate, easing: 'ease-in-out', fill: 'forwards'});
    exitAnimation = exit;
    exit.finished.then(() => {
      if (exit !== exitAnimation) return;
      stopPlayback();
      display(requested, requested !== active);
      playSlide();
    }, () => {}); // Printing or a motion preference change can cancel the exit.
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
    finishArrival();
    stopPlayback();
    display(requested, requested !== active);
    draw(1);
  }
  function finishArrival() {
    arrival.forEach(animation => animation.cancel());
    arrival.length = 0;
  }
  if (reduce.addEventListener) reduce.addEventListener('change', settle);
  else reduce.addListener(settle);
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  window.addEventListener('resize', alignToPhoto, {passive: true});
  if (photo && window.ResizeObserver) new ResizeObserver(alignToPhoto).observe(photo.parentElement.parentElement);
  document.fonts?.ready.then(alignToPhoto);

  window.addEventListener('beforeprint', () => {
    finishArrival();
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
  const restored = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (restored || !layout.animate || reduce.matches || document.hidden) {
    settle();
  } else {
    playArrival();
    playSlide(400);
  }
})();
