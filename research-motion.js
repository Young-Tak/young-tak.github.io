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
    const strokes = [...svg.querySelectorAll('[data-draw], [data-appear], [data-follow], [data-shift-x], [data-shift-y], [data-zoom-to]')].map(node => ({
      node, draw: node.hasAttribute('data-draw'), appear: node.hasAttribute('data-appear'),
      from: Number(node.dataset.from), to: Number(node.dataset.to),
      shiftX: Number(node.dataset.shiftX || 0), shiftY: Number(node.dataset.shiftY || 0),
      zoom: Number(node.dataset.zoomTo || 1), cx: Number(node.dataset.cx || 0), cy: Number(node.dataset.cy || 0),
      path: node.dataset.follow ? svg.querySelector('#' + CSS.escape(node.dataset.follow)) : null
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
  let lastLayout = '';
  let transitions = [];

  function selectStep(index, transition = false) {
    if (index === active) return;
    const {line} = steps[index];
    const title = line.dataset.title;
    steps.forEach((step, i) => {
      step.line.hidden = i !== index;
      step.line.classList.toggle('is-current', i === index);
      step.svg.toggleAttribute('hidden', i !== index);
      if (i === index) step.button.setAttribute('aria-current', 'step');
      else step.button.removeAttribute('aria-current');
    });
    if (heading.textContent !== title) heading.textContent = title;
    kicker.textContent = line.dataset.kicker;
    caption.textContent = line.dataset.caption;
    if (line.dataset.imageSource) {
      const source = document.createElement('a');
      source.href = line.dataset.imageSource;
      source.textContent = line.dataset.caption;
      caption.replaceChildren(source);
    }
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    if (transition && active >= 0 && line.animate && !reduce.matches) {
      transitions.forEach(animation => animation.cancel());
      const direction = index > active ? 1 : -1;
      const enter = (element, offset, ms) => element.animate([
        {opacity: .64, transform: `translateY(${offset * direction}px)`},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)'});
      transitions = [enter(line, 6, 260), enter(steps[index].svg, 4, 300)];
    }
    active = index;
    lastProgress = -1;
  }

  function paint(progress) {
    if (Math.abs(progress - lastProgress) < .001) return;
    lastProgress = progress;
    for (const part of steps[active].strokes) {
      const {node, draw, appear, from, to, shiftX, shiftY, path} = part;
      const t = clamp((progress - from) / (to - from));
      if (draw) {
        node.style.strokeDasharray = '1';
        node.style.strokeDashoffset = String(1 - t);
      }
      if (appear) {
        node.style.opacity = String(.15 + .85 * t);
      }
      if (path) {
        part.length ??= path.getTotalLength();
        const point = path.getPointAtLength(t * part.length);
        node.setAttribute('transform', `translate(${point.x} ${point.y})`);
      } else if (part.zoom !== 1) {
        const scale = 1 + (part.zoom - 1) * t * t * (3 - 2 * t);
        node.setAttribute('transform', `translate(${part.cx} ${part.cy}) scale(${scale}) translate(${-part.cx} ${-part.cy})`);
      } else if (shiftX || shiftY) {
        const remaining = 1 - t * t * (3 - 2 * t);
        node.setAttribute('transform', `translate(${shiftX * remaining} ${shiftY * remaining})`);
      }
    }
  }

  function update() {
    frame = 0;
    if (!enabled || document.hidden) return;
    const position = clamp((inset - track.getBoundingClientRect().top) / travel) * steps.length;
    const index = Math.min(steps.length - 1, Math.floor(position));
    selectStep(index, true);
    const local = position - index;
    steps[index].button.style.setProperty('--step-progress', String(clamp(local)));
    // Keep a legible opening frame and leave time to read the completed plate.
    paint(clamp(.26 + local * 1.12));
  }

  function schedule() {
    if (enabled && !frame) frame = requestAnimationFrame(update);
  }

  function showFull(canReturn = false) {
    enabled = false;
    section.classList.remove('story-enhanced', 'story-focused');
    lastLayout = '';
    section.setAttribute('aria-labelledby', 'research-title');
    track.hidden = true;
    fullProfile.hidden = false;
    returnButton.hidden = !canReturn;
  }

  function allStepsFit(reserveText = false) {
    let tallestText = 0;
    for (let i = 0; i < steps.length; i++) {
      selectStep(i);
      if (stage.scrollHeight > stage.clientHeight + 3) return false;
      if (caption.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 2) return false;
      const chartBox = steps[i].svg.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      tallestText = Math.max(tallestText, textBox.height);
      if (chartBox.left < textBox.right - 2 && chartBox.top < textBox.bottom - 2) return false;
    }
    if (reserveText && matchMedia('(max-width: 680px) and (min-height: 740px)').matches) {
      stage.style.setProperty('--story-text-reserve', Math.ceil(tallestText) + 'px');
      if (!allStepsFit()) stage.style.removeProperty('--story-text-reserve');
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
      section.classList.add('story-enhanced');
      section.setAttribute('aria-labelledby', 'research-story-title');
      inset = parseFloat(getComputedStyle(stage).top) || 0;
      const signature = [stage.clientWidth, stage.clientHeight, inset, document.fonts?.status].join('/');
      if (previouslyEnabled && signature === lastLayout) {
        update();
        return;
      }
      lastLayout = signature;
      transitions.forEach(animation => animation.cancel());
      transitions = [];
      stage.style.removeProperty('--story-text-reserve');
      section.classList.remove('story-focused');
      travel = Math.round(Math.max(360, Math.min(680, (stage.clientHeight + inset) * .70))) * steps.length;
      track.style.setProperty('--story-travel', `${travel}px`);
      // Check every chapter against the actual font, zoom, and viewport before pinning.
      if (!allStepsFit(true)) {
        section.classList.add('story-focused');
        if (!allStepsFit()) {
          showFull();
          return;
        }
      }
      active = -1;
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
    const offset = (index + .72) * travel / steps.length;
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
