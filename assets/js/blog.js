/* Search and paginate build-rendered articles, preserving their DOM nodes. */
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('blogList');
  const pagination = document.getElementById('blogPagination');
  if (!list || !pagination) return;
  const cards = [...list.querySelectorAll('.blog-card')];
  const search = document.getElementById('blogSearch');
  const category = document.getElementById('blogCategory');
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = 'No blog posts match your search.';
  empty.hidden = true;
  list.after(empty);
  let page = 1;
  const perPage = 6;
  function render() {
    const query = search.value.trim().toLowerCase();
    const filtered = cards.filter((card) => (category.value === 'all' || card.dataset.category === category.value) &&
      (!query || card.dataset.search.includes(query)));
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    page = Math.min(page, pages);
    const visible = new Set(filtered.slice((page - 1) * perPage, page * perPage));
    cards.forEach((card) => { card.hidden = !visible.has(card); });
    empty.hidden = filtered.length > 0;
    pagination.replaceChildren();
    if (pages > 1) for (let n = 1; n <= pages; n++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = n;
      button.setAttribute('aria-label', `Open blog page ${n}`);
      if (n === page) { button.className = 'active'; button.setAttribute('aria-current', 'page'); }
      button.addEventListener('click', () => {
        page = n;
        render();
        pagination.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
        list.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      });
      pagination.append(button);
    }
  }
  search.addEventListener('input', () => { page = 1; render(); });
  category.addEventListener('change', () => { page = 1; render(); });
  render();
});
