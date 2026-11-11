'use strict';
const papers = [...document.querySelectorAll('.publication')];
const search = document.querySelector('#pub-search');
const collectionButtons = [...document.querySelectorAll('[data-collection]')];
const topicSelect = document.querySelector('#topic-filter');
let collection = 'selected';
function filterPublications() {
  const query = search.value.trim().toLocaleLowerCase();
  const topic = topicSelect.value;
  let count = 0;
  const ordered = collection === 'selected' ? papers : [...papers].sort((a,b) =>
    Number(b.dataset.year) - Number(a.dataset.year) || Number(a.id.slice(4)) - Number(b.id.slice(4)));
  const list = document.querySelector('.publication-list');
  ordered.forEach(paper => list.append(paper));
  papers.forEach(paper => {
    const visible = (collection === 'all' || paper.dataset.featured === 'true') &&
      (topic === 'all' || paper.dataset.topic === topic) &&
      (!query || paper.textContent.toLocaleLowerCase().includes(query));
    paper.hidden = !visible;
    const showSupplementary = visible && collection === 'selected';
    paper.querySelectorAll('.paper-media, .cover-feature, .cover-label, .pub-metrics, .paper-contribution')
      .forEach(item => { item.hidden = !showSupplementary; });
    if (!showSupplementary) paper.querySelectorAll('video').forEach(video => video.pause());
    if (visible) count++;
  });
  collectionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.collection === collection)));
  document.querySelector('#result-count').textContent = `${count} ${collection === 'selected' ? 'selected ' : ''}${count === 1 ? 'work' : 'works'}`;
  document.querySelector('#no-results').hidden = count !== 0;
  document.querySelector('#show-all').hidden = collection === 'all';
}
collectionButtons.forEach(button => button.addEventListener('click', () => { collection = button.dataset.collection; filterPublications(); }));
topicSelect.addEventListener('change', () => { collection = 'all'; filterPublications(); });
search.addEventListener('input', () => { collection = 'all'; filterPublications(); });
function resetFilters() { collection = 'all'; topicSelect.value = 'all'; search.value = ''; filterPublications(); }
document.querySelector('#show-all').addEventListener('click', () => {
  resetFilters();
  document.querySelector('[data-collection="all"]').focus({preventScroll:true});
  document.querySelector('.publication-controls').scrollIntoView({block:'start'});
});
document.querySelector('#reset-search').addEventListener('click', () => { resetFilters(); search.focus(); });
document.querySelectorAll('[data-topic-link]').forEach(link => link.addEventListener('click', () => {
  collection = 'all'; topicSelect.value = link.dataset.topicLink; search.value = ''; filterPublications();
}));
filterPublications();

const sectionLinks = [...document.querySelectorAll('.section-nav a')];
const sectionNav = document.querySelector('.section-nav');
const navIndicator = document.querySelector('.nav-indicator');
const sections = [...document.querySelectorAll('main > section[id]')];
let scrollQueued = false;
let previewLink = null;
let intendedSection = null;
let intentTimer;
function moveNavIndicator(link) {
  if (!link || !navIndicator) return;
  const navRect = sectionNav.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const horizontalMenu = window.matchMedia('(max-width: 960px)').matches;
  const x = horizontalMenu ? linkRect.left - navRect.left + 3 : 1;
  const y = linkRect.top - navRect.top + (linkRect.height - 26) / 2;
  navIndicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  navIndicator.classList.add('is-ready');
}
function paintActiveLink(current) {
  sectionLinks.forEach(link => {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  moveNavIndicator(previewLink || sectionLinks.find(link => link.hash === `#${current}`));
}
function updateActiveSection() {
  let current = sections[0].id;
  for (const section of sections) if (section.getBoundingClientRect().top <= 140) current = section.id;
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40) current = 'contact';
  if (intendedSection === current) intendedSection = null;
  paintActiveLink(intendedSection || current);
  scrollQueued = false;
}
sectionLinks.forEach(link => {
  link.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { previewLink = link; moveNavIndicator(link); }
  });
  link.addEventListener('focus', () => { previewLink = link; moveNavIndicator(link); });
  link.addEventListener('click', () => {
    intendedSection = link.hash.slice(1);
    previewLink = null;
    clearTimeout(intentTimer);
    paintActiveLink(intendedSection);
    intentTimer = setTimeout(() => { intendedSection = null; updateActiveSection(); }, 1000);
  });
});
sectionNav.addEventListener('pointerleave', () => { previewLink = null; updateActiveSection(); });
sectionNav.addEventListener('focusout', event => {
  if (!sectionNav.contains(event.relatedTarget)) { previewLink = null; updateActiveSection(); }
});
window.addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateActiveSection); }
}, {passive:true});
new ResizeObserver(updateActiveSection).observe(sectionNav);
document.fonts.ready.then(updateActiveSection);
updateActiveSection();
document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    if (!navigator.clipboard) throw new Error('Clipboard is unavailable');
    await navigator.clipboard.writeText('ytkim@mgh.harvard.edu');
    status.textContent = 'Email address copied.';
  } catch (_) { status.textContent = 'Select and copy: ytkim@mgh.harvard.edu'; }
});

// Keep research films from playing over one another.
const researchFilms = [...document.querySelectorAll('.paper-media video')];
researchFilms.forEach(film => film.addEventListener('play', () => {
  researchFilms.forEach(other => { if (other !== film) other.pause(); });
}));
