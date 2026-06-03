/* ============================================
   WRITINGS PAGE JAVASCRIPT - Fixed Version
   ============================================ */

const filterButtons  = document.querySelectorAll('.filter-btn');
const writingItems   = document.querySelectorAll('.writing-item');
const searchInput    = document.querySelector('.search-input');
const prevBtn        = document.querySelector('.pagination-prev');
const nextBtn        = document.querySelector('.pagination-next');
const pageInfo       = document.querySelector('.page-info');

const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let activeCategory = 'all';
let searchTerm = '';

// --- helpers ---
function getVisibleItems() {
  return Array.from(writingItems).filter(item => {
    const catMatch = activeCategory === 'all' || item.getAttribute('data-category') === activeCategory;
    const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
    const desc  = item.querySelector('p')?.textContent.toLowerCase() || '';
    const termMatch = !searchTerm || title.includes(searchTerm) || desc.includes(searchTerm);
    return catMatch && termMatch;
  });
}

function render() {
  const visible = getVisibleItems();
  const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end   = start + ITEMS_PER_PAGE;

  writingItems.forEach(item => { item.style.display = 'none'; });
  visible.forEach((item, i) => {
    item.style.display = (i >= start && i < end) ? 'block' : 'none';
    if (i >= start && i < end) {
      item.style.animation = 'fadeIn 0.35s ease';
    }
  });

  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevBtn)  prevBtn.disabled = currentPage <= 1;
  if (nextBtn)  nextBtn.disabled = currentPage >= totalPages;
}

// --- filter buttons ---
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.getAttribute('data-category') || 'all';
    currentPage = 1;
    render();
  });
});

// --- search ---
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;
    render();
  });
}

// --- pagination ---
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
}
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    const total = Math.ceil(getVisibleItems().length / ITEMS_PER_PAGE);
    if (currentPage < total) { currentPage++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
}

// --- sort ---
const sortBtn = document.querySelector('.sort-btn');
if (sortBtn) {
  sortBtn.addEventListener('click', () => {
    const container = document.querySelector('.writings-grid');
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.writing-item'));
    items.sort((a, b) => new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date')));
    items.forEach(item => container.appendChild(item));
    currentPage = 1;
    render();
  });
}

// Initial render
window.addEventListener('load', render);
