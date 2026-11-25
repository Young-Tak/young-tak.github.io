(() => {
  'use strict';
  const section = document.getElementById('research');
  const track = section?.querySelector('.story-track');
  if (!track || !window.matchMedia) return;

  const stage = track.querySelector('.story-stage');
  const heading = stage.querySelector('.story-title');
  const kicker = stage.querySelector('.story-kicker');
  const caption = stage.querySelector('.story-caption');
  const footer = stage.querySelector('.story-footer');
  const text = stage.querySelector('.story-text');
  const count = stage.querySelector('.story-count');
  const fullProfile = section.querySelector('.research-original');
  const readButton = stage.querySelector('.story-mode');
  const returnButton = fullProfile.querySelector('.story-return');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const steps = [...stage.querySelectorAll('.story-line')].map(line => {
    const key = line.dataset.scene;
    const svg = stage.querySelector(`svg[data-scene="${key}"]`);
    const button = stage.querySelector(`button[data-scene="${key}"]`);
    const strokes = [...svg.querySelectorAll('[data-draw], [data-appear]')].map(node => ({
      node, draw: node.hasAttribute('data-draw'),
      from: Number(node.dataset.from), to: Number(node.dataset.to)
    }));
    return {line, svg, button, strokes};
  });
  if (!steps.length || !steps.every(step => step.button && step.strokes.length)) return;

  const clamp = value => Math.max(0, Math.min(1, value));
  let active = -1;
  let lastProgress = -1;
  let travel = 0;
  let inset = 0;
  let frame = 0;
  let layoutFrame = 0;
  let readingFullProfile = false;
  let enabled = false;
  let failed = false;

  function selectStep(index) {
    if (index === active) return;
    const {line} = steps[index];
    const title = line.dataset.title;
    steps.forEach((step, i) => {
      step.line.hidden = step.line.dataset.title !== title;
      step.line.classList.toggle('is-current', i === index);
      step.svg.toggleAttribute('hidden', i !== index);
      if (i === index) step.button.setAttribute('aria-current', 'step');
      else step.button.removeAttribute('aria-current');
    });
    if (heading.textContent !== title) heading.textContent = title;
    kicker.textContent = line.dataset.kicker;
    caption.textContent = line.dataset.caption;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    active = index;
    lastProgress = -1;
  }

  function paint(progress) {
    if (Math.abs(progress - lastProgress) < .001) return;
    lastProgress = progress;
    for (const {node, draw, from, to} of steps[active].strokes) {
      const t = clamp((progress - from) / (to - from));
      if (draw) {
        node.style.strokeDasharray = '1';
        node.style.strokeDashoffset = String(1 - t);
      } else {
        node.style.opacity = String(.15 + .85 * t);
      }
    }
  }

  function update() {
    frame = 0;
    if (!enabled || document.hidden) return;
    const position = clamp((inset - track.getBoundingClientRect().top) / travel) * steps.length;
    const index = Math.min(steps.length - 1, Math.floor(position));
    selectStep(index);
    // Finish a drawing before advancing, so the complete diagram has reading time.
    paint(clamp((position - index + .07) / .83));
  }

  function schedule() {
    if (enabled && !frame) frame = requestAnimationFrame(update);
  }

  function showFull(canReturn = false) {
    enabled = false;
    section.classList.remove('story-enhanced', 'story-focused');
    section.setAttribute('aria-labelledby', 'research-title');
    track.hidden = true;
    fullProfile.hidden = false;
    returnButton.hidden = !canReturn;
  }

  function allStepsFit() {
    for (let i = 0; i < steps.length; i++) {
      selectStep(i);
      if (stage.scrollHeight > stage.clientHeight + 3) return false;
      if (caption.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 2) return false;
      const chartBox = steps[i].svg.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      if (chartBox.left < textBox.right - 2 && chartBox.top < textBox.bottom - 2) return false;
    }
    return true;
  }

  function configure() {
    layoutFrame = 0;
    if (failed || readingFullProfile || document.documentElement.dataset.view === 'landing' || reduce.matches || innerWidth < 320 || innerHeight < 510) {
      showFull(readingFullProfile && !reduce.matches);
      return;
    }
    try {
      const previouslyEnabled = enabled;
      enabled = true;
      track.hidden = false;
      fullProfile.hidden = true;
      section.classList.remove('story-focused');
      section.classList.add('story-enhanced');
      section.setAttribute('aria-labelledby', 'research-story-title');
      const viewportHeight = document.documentElement.clientHeight;
      travel = Math.round(Math.max(400, Math.min(790, viewportHeight * .77))) * steps.length;
      track.style.setProperty('--story-travel', `${travel}px`);
      inset = parseFloat(getComputedStyle(stage).top) || 0;
      // Check every chapter against the actual font, zoom, and viewport before pinning.
      if (!allStepsFit()) {
        section.classList.add('story-focused');
        if (!allStepsFit()) {
          showFull();
          return;
        }
      }
      update();
      if (!previouslyEnabled && location.hash && location.hash !== '#research' && location.hash !== '#top' && location.hash !== '#main') {
        const target = document.getElementById(location.hash.slice(1));
        if (target && !section.contains(target)) target.scrollIntoView({block: 'start', behavior: 'instant'});
      }
    } catch (_) {
      failed = true;
      showFull();
    }
  }

  function queueLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(configure);
  }

  function goToStep(index) {
    const offset = (index + .06) * travel / steps.length;
    window.scrollTo({top: window.scrollY + track.getBoundingClientRect().top - inset + offset, behavior: 'instant'});
    update();
  }

  steps.forEach(({button}, index) => button.addEventListener('click', () => goToStep(index)));
  readButton.addEventListener('click', () => {
    readingFullProfile = true;
    showFull(true);
    returnButton.focus({preventScroll: true});
    section.scrollIntoView({behavior: 'instant', block: 'start'});
  });
  returnButton.addEventListener('click', () => {
    const previous = Math.max(0, active);
    readingFullProfile = false;
    configure();
    if (enabled) {
      goToStep(previous);
      steps[previous].button.focus({preventScroll: true});
    }
  });
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', queueLayout, {passive: true});
  window.addEventListener('pageshow', queueLayout);
  document.addEventListener('visibilitychange', schedule);
  if (reduce.addEventListener) reduce.addEventListener('change', queueLayout);
  else reduce.addListener(queueLayout);
  new MutationObserver(queueLayout).observe(document.documentElement, {attributes: true, attributeFilter: ['data-view']});
  document.fonts?.ready.then(queueLayout);
  configure();
})();
