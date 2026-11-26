(() => {
  'use strict';

  const section = document.getElementById('research');
  const track = section?.querySelector('.story-track');
  if (!track || !window.matchMedia) return;

  const stage = track.querySelector('.story-stage');
  const layout = stage.querySelector('.story-layout');
  const heading = stage.querySelector('.story-title');
  const kicker = stage.querySelector('.story-kicker');
  const caption = stage.querySelector('.story-caption');
  const count = stage.querySelector('.story-count');
  const status = stage.querySelector('.story-announcement');
  const previous = stage.querySelector('.story-prev');
  const next = stage.querySelector('.story-next');
  const nextLabel = next.querySelector('span');
  const fullProfile = section.querySelector('.research-original');
  const readButton = stage.querySelector('.story-mode');
  const returnButton = fullProfile.querySelector('.story-return');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const profile = document.querySelector('.profile');
  const photo = profile?.querySelector('.profile-photo > a');

  const slides = [...layout.querySelectorAll('.story-line')].map(line => {
    const key = line.dataset.scene;
    const svg = layout.querySelector('svg[data-scene="' + key + '"]');
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
    return {line, svg, button, parts};
  });
  if (!slides.length || slides.some(slide => !slide.button || !slide.parts.length)) return;

  const last = slides.length - 1;
  let active = 0;
  let requested = 0;
  let frame = 0;
  let transition;
  let initialObserver;

  function draw(progress) {
    for (const part of slides[active].parts) {
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
    initialObserver?.disconnect();
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
    const {line, button} = slides[index];
    const {title, caption: description, imageSource} = line.dataset;
    slides.forEach((slide, i) => {
      const current = i === index;
      slide.line.classList.toggle('is-current', current);
      slide.line.inert = !current;
      slide.line.setAttribute('aria-hidden', String(!current));
      slide.svg.toggleAttribute('hidden', !current);
      if (current) slide.button.setAttribute('aria-current', 'step');
      else slide.button.removeAttribute('aria-current');
    });
    heading.textContent = title;
    kicker.textContent = line.dataset.kicker;
    if (imageSource) {
      const source = document.createElement('a');
      source.href = imageSource;
      source.textContent = description;
      caption.replaceChildren(source);
    } else {
      caption.textContent = description;
    }
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    const accessibleName = button.getAttribute('aria-label');
    layout.setAttribute('aria-label', accessibleName);
    if (announce) status.textContent = accessibleName;
    if (document.activeElement === previous && index === 0) next.focus({preventScroll: true});
    previous.disabled = index === 0;
    nextLabel.textContent = index === last ? 'Publications' : 'Next';
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

  function readingMode(full) {
    stopPlayback();
    track.hidden = full;
    fullProfile.hidden = !full;
    returnButton.hidden = !full;
    section.classList.toggle('story-enhanced', !full);
    section.setAttribute('aria-labelledby', full ? 'research-title' : 'research-story-title');
    if (!full) {
      requested = active;
      display(active, false);
      alignToPhoto();
    }
  }

  slides.forEach(({button}, i) => button.addEventListener('click', () => goTo(i)));
  previous.addEventListener('click', () => goTo(requested - 1));
  next.addEventListener('click', () => {
    if (active !== last || requested !== last) {
      goTo(Math.min(requested + 1, last));
      return;
    }
    const publications = document.getElementById('publications');
    if (location.hash !== '#publications') location.hash = 'publications';
    publications.scrollIntoView({block: 'start', behavior: 'instant'});
    const title = publications.querySelector('h2');
    title.tabIndex = -1;
    title.focus({preventScroll: true});
  });
  stage.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    goTo(requested + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  readButton.addEventListener('click', () => {
    readingMode(true);
    returnButton.focus({preventScroll: true});
    section.scrollIntoView({block: 'start', behavior: 'instant'});
  });
  returnButton.addEventListener('click', () => {
    readingMode(false);
    draw(1);
    slides[active].button.focus({preventScroll: true});
    section.scrollIntoView({block: 'start', behavior: 'instant'});
  });

  function settle() {
    stopPlayback();
    if (!track.hidden) {
      display(requested, false);
      draw(1);
    }
  }
  if (reduce.addEventListener) reduce.addEventListener('change', settle);
  else reduce.addListener(settle);
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  window.addEventListener('resize', alignToPhoto, {passive: true});
  new MutationObserver(alignToPhoto).observe(document.documentElement, {attributes: true, attributeFilter: ['data-view']});
  if (photo && window.ResizeObserver) new ResizeObserver(alignToPhoto).observe(photo.parentElement.parentElement);
  document.fonts?.ready.then(alignToPhoto);

  readingMode(false);
  if (!reduce.matches && window.IntersectionObserver) {
    draw(.08);
    // Start the opening illustration once when it can be seen, including after Explore.
    initialObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || track.hidden) return;
      initialObserver.disconnect();
      playFigure();
    });
    initialObserver.observe(slides[0].svg);
  } else {
    playFigure();
  }
})();
