
/* Main JavaScript for the futuristic portfolio website */
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const page = document.body.dataset.page;

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
}[char]));

const formatTags = (tags = []) => tags.map((tag) => `<span class="tag-chip">${escapeHTML(tag)}</span>`).join('');
const safeLink = (link = '#') => link || '#';

async function fetchJSON(path) {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return await response.json();
  } catch (error) {
    console.warn(error.message);
    return [];
  }
}

function applyLimit(items, container) {
  const limit = Number(container?.dataset?.limit || 0);
  return limit > 0 ? items.slice(0, limit) : items;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHTML(message)}</div>`;
}

function renderFeatured(items, container) {
  const visible = applyLimit(items, container);
  container.innerHTML = visible.length ? visible.map((item) => `
    <article class="featured-card reveal tilt-card">
      <div class="card-topline">
        <span class="card-icon">${escapeHTML(item.icon || '✦')}</span>
        <span class="card-date">${escapeHTML(item.date || '')}</span>
      </div>
      <span class="badge">${escapeHTML(item.type || 'Featured')}</span>
      <h3 class="card-title">${escapeHTML(item.title)}</h3>
      <p class="card-description">${escapeHTML(item.description)}</p>
      <a class="card-link" href="${safeLink(item.link)}">${escapeHTML(item.actionLabel || 'Read More')} →</a>
    </article>
  `).join('') : emptyState('No featured content found. Edit data/featured.json.');
  observeReveals();
}

function workCard(item) {
  return `
    <article class="work-card reveal tilt-card" data-category="${escapeHTML(item.category)}">
      <img class="card-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)} preview" loading="lazy" />
      <div class="card-topline"><span class="badge">${escapeHTML(item.category)}</span><span class="card-date">${escapeHTML(item.date)}</span></div>
      <h3 class="card-title">${escapeHTML(item.title)}</h3>
      <p class="card-description">${escapeHTML(item.description)}</p>
      <div class="tag-row">${formatTags(item.tags)}</div>
      <div class="card-actions">
        <a class="btn btn-ghost" href="${safeLink(item.link)}">Open</a>
        ${item.github ? `<a class="btn btn-soft" href="${safeLink(item.github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
      </div>
    </article>`;
}

function renderWorks(items, container, filter = 'all') {
  const filtered = filter === 'all' ? items : items.filter((item) => item.category === filter);
  const visible = applyLimit(filtered, container);
  container.innerHTML = visible.length ? visible.map(workCard).join('') : emptyState('No work items found for this category.');
  observeReveals();
  enableTilt();
}

function writingCard(item) {
  return `
    <article class="writing-card reveal" data-category="${escapeHTML(item.category)}">
      <div class="card-topline"><span class="badge">${escapeHTML(item.category)}</span><span class="card-date">${escapeHTML(item.date)}</span></div>
      <h3 class="card-title">${escapeHTML(item.title)}</h3>
      <p class="card-description">${escapeHTML(item.preview)}</p>
      <div class="tag-row">${formatTags(item.tags)}</div>
      <a class="card-link" href="${safeLink(item.link)}">Read More →</a>
    </article>`;
}

function renderWritings(items, container, filter = 'all', search = '') {
  const term = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesFilter = filter === 'all' || item.category === filter;
    const haystack = `${item.title} ${item.category} ${item.preview} ${(item.tags || []).join(' ')}`.toLowerCase();
    return matchesFilter && (!term || haystack.includes(term));
  });
  const visible = applyLimit(filtered, container);
  container.innerHTML = visible.length ? visible.map(writingCard).join('') : emptyState('No writing posts matched your search or filter.');
  observeReveals();
}

function resourceCard(item) {
  return `
    <article class="resource-card reveal" data-category="${escapeHTML(item.category)}">
      <div class="card-topline"><span class="badge">${escapeHTML(item.category)}</span><span class="card-date">${escapeHTML(item.date)}</span></div>
      <h3 class="card-title">${escapeHTML(item.title)}</h3>
      <p class="card-description">${escapeHTML(item.description)}</p>
      <p><strong>File type:</strong> ${escapeHTML(item.fileType)}</p>
      <div class="tag-row">${formatTags(item.tags)}</div>
      <div class="card-actions">
        <a class="btn btn-ghost" href="${safeLink(item.downloadLink)}" ${item.downloadLink && item.downloadLink !== '#' ? 'download' : ''}>Download</a>
        <a class="btn btn-soft" href="${safeLink(item.referenceLink)}" target="_blank" rel="noopener">Reference</a>
      </div>
    </article>`;
}

function renderResources(items, container, filter = 'all', search = '') {
  const term = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesFilter = filter === 'all' || item.category === filter;
    const haystack = `${item.title} ${item.category} ${item.description} ${item.fileType} ${(item.tags || []).join(' ')}`.toLowerCase();
    return matchesFilter && (!term || haystack.includes(term));
  });
  container.innerHTML = filtered.length ? filtered.map(resourceCard).join('') : emptyState('No resources matched your search or filter.');
  observeReveals();
}

function renderUpdates(items, container) {
  container.innerHTML = items.length ? items.map((item) => `
    <article class="update-card reveal">
      <div class="update-meta"><span class="badge">${escapeHTML(item.category)}</span><span class="card-date">${escapeHTML(item.date)}</span></div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.description)}</p>
      <a class="card-link" href="${safeLink(item.link)}">Read More →</a>
    </article>
  `).join('') : emptyState('No updates found. Edit data/updates.json.');
  observeReveals();
}

function bindFilters(buttonContainer, onChange) {
  if (!buttonContainer) return;
  qsa('button[data-filter]', buttonContainer).forEach((button) => {
    button.addEventListener('click', () => {
      qsa('button[data-filter]', buttonContainer).forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      onChange(button.dataset.filter);
    });
  });
}

async function loadPageData() {
  const featuredGrid = qs('#featuredGrid');
  if (featuredGrid) renderFeatured(await fetchJSON('data/featured.json'), featuredGrid);

  const worksGrid = qs('#worksGrid');
  if (worksGrid) {
    const works = await fetchJSON('data/works.json');
    let workFilter = 'all';
    renderWorks(works, worksGrid, workFilter);
    bindFilters(qs('#workFilters'), (filter) => { workFilter = filter; renderWorks(works, worksGrid, workFilter); });
  }

  const writingsGrid = qs('#writingsGrid');
  if (writingsGrid) {
    const writings = await fetchJSON('data/writings.json');
    let writingFilter = 'all';
    const writingSearch = qs('#writingSearch');
    const refresh = () => renderWritings(writings, writingsGrid, writingFilter, writingSearch?.value || '');
    refresh();
    bindFilters(qs('#writingFilters'), (filter) => { writingFilter = filter; refresh(); });
    writingSearch?.addEventListener('input', refresh);
  }

  const resourcesGrid = qs('#resourcesGrid');
  if (resourcesGrid) {
    const resources = await fetchJSON('data/resources.json');
    let resourceFilter = 'all';
    const resourceSearch = qs('#resourceSearch');
    const refresh = () => renderResources(resources, resourcesGrid, resourceFilter, resourceSearch?.value || '');
    refresh();
    bindFilters(qs('#resourceFilters'), (filter) => { resourceFilter = filter; refresh(); });
    resourceSearch?.addEventListener('input', refresh);
  }

  const updatesTimeline = qs('#updatesTimeline');
  if (updatesTimeline) renderUpdates(await fetchJSON('data/updates.json'), updatesTimeline);
}

function setupNavigation() {
  const navToggle = qs('.nav-toggle');
  const navMenu = qs('#navMenu');
  navToggle?.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  qsa('[data-nav]').forEach((link) => {
    if (link.dataset.nav === page) link.classList.add('active');
    link.addEventListener('click', () => navMenu?.classList.remove('open'));
  });
}

let revealObserver;
function observeReveals() {
  if (!('IntersectionObserver' in window)) {
    qsa('.reveal').forEach((el) => el.classList.add('visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
  }
  qsa('.reveal:not(.visible)').forEach((el) => revealObserver.observe(el));
}

function setupBackToTop() {
  const button = qs('.back-to-top');
  const update = () => button?.classList.toggle('visible', window.scrollY > 420);
  window.addEventListener('scroll', update, { passive: true });
  button?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  update();
}

function setupContactForm() {
  const form = qs('#contactForm');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('name');
    const email = data.get('email');
    const subject = data.get('subject');
    const message = data.get('message');
    const body = `Name: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0A${encodeURIComponent(message)}`;
    window.location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${body}`;
  });
}

function enableTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  qsa('.tilt-card').forEach((card) => {
    if (card.dataset.tiltReady) return;
    card.dataset.tiltReady = 'true';
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -8;
      const rotateY = ((x / rect.width) - 0.5) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

function setupParticles() {
  const canvas = qs('#particle-canvas');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let width, height, particles;
  const resize = () => {
    width = canvas.width = window.innerWidth * devicePixelRatio;
    height = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const count = Math.min(90, Math.max(35, Math.floor(window.innerWidth / 18)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      r: (Math.random() * 1.8 + 0.6) * devicePixelRatio
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(32,230,255,0.72)';
    ctx.strokeStyle = 'rgba(138,92,255,0.13)';
    particles.forEach((p, index) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      for (let j = index + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130 * devicePixelRatio) {
          ctx.globalAlpha = 1 - dist / (130 * devicePixelRatio);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
    });
    requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener('resize', resize);
  draw();
}

function setupYear() {
  const year = qs('#year');
  if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupBackToTop();
  setupContactForm();
  setupParticles();
  setupYear();
  observeReveals();
  loadPageData().then(enableTilt);
});
