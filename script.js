// ============================================================
// script.js — NanduRPM Portfolio
// Loads JSON data and renders cards on the relevant page
// ============================================================

// ---------- HELPERS ----------

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryIcon(cat) {
  const icons = {
    Technical: '⚡', Job: '💼', News: '📰', Tool: '🔧',
    Civil: '🏗️', Mechanical: '⚙️', Electrical: '🔌',
    Electronics: '📡', Computer: '💻', Common: '📘'
  };
  return icons[cat] || '📄';
}

function renderCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.dataset.category = item.category || '';

  const badgeClass = 'badge-' + (item.category || '').replace(/\s+/g, '');

  card.innerHTML = `
    <div class="item-card-top">
      <span class="item-badge ${badgeClass}">${categoryIcon(item.category)} ${item.category || 'General'}</span>
      <span class="item-date">${formatDate(item.date)}</span>
    </div>
    <div class="item-title">${item.title || 'Untitled'}</div>
    <div class="item-desc">${item.description || ''}</div>
    ${item.link ? `<a class="item-link" href="${item.link}" target="_blank" rel="noopener">Open ↗</a>` : ''}
  `;
  return card;
}

function renderEmpty(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <div style="font-size:2.5rem">📭</div>
      <p>${message}</p>
    </div>
  `;
}

// ---------- PAGE: HOME (index.html) ----------
const latestList = document.getElementById('latest-list');
if (latestList) {
  // Fetch both JSONs and merge, show 6 most recent
  Promise.all([
    fetch('technical.json').then(r => r.json()).catch(() => []),
    fetch('notes.json').then(r => r.json()).catch(() => [])
  ]).then(([techItems, noteItems]) => {
    const all = [...techItems, ...noteItems]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6);

    if (all.length === 0) {
      renderEmpty(latestList, 'No updates yet. Check back soon!');
      return;
    }
    all.forEach(item => latestList.appendChild(renderCard(item)));
  });
}

// ---------- PAGE: TECHNICAL (technical.html) ----------
const technicalList = document.getElementById('technical-list');
if (technicalList) {
  fetch('technical.json')
    .then(r => r.json())
    .then(items => {
      const sorted = items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      if (sorted.length === 0) {
        renderEmpty(technicalList, 'No items yet. Come back soon for daily updates!');
        return;
      }
      sorted.forEach(item => technicalList.appendChild(renderCard(item)));
    })
    .catch(() => renderEmpty(technicalList, 'Could not load data. Please try again.'));
}

// ---------- PAGE: NOTES (notes.html) ----------
const notesList = document.getElementById('notes-list');
if (notesList) {
  fetch('notes.json')
    .then(r => r.json())
    .then(items => {
      const sorted = items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      if (sorted.length === 0) {
        renderEmpty(notesList, 'Notes are being prepared. Stay tuned!');
        return;
      }
      sorted.forEach(item => notesList.appendChild(renderCard(item)));
    })
    .catch(() => renderEmpty(notesList, 'Could not load notes. Please try again.'));
}
