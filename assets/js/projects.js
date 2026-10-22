/* Filter and sort build-rendered cards without replacing their DOM nodes. */
document.addEventListener('DOMContentLoaded', () => {
  const grids = ['projectsGrid', 'moreProjectsGrid'].map((id) => document.getElementById(id));
  if (grids.some((grid) => !grid)) return;
  const search = document.getElementById('projectSearch');
  const category = document.getElementById('projectCategory');
  const sort = document.getElementById('projectSort');
  const results = document.getElementById('projectResults');
  const groups = grids.map((grid) => [...grid.querySelectorAll('article')]);
  const existing = new Set([...category.options].map((option) => option.value));
  [...new Set(groups.flat().map((card) => card.dataset.category))].filter(Boolean).sort().forEach((value) => {
    if (!existing.has(value)) category.add(new Option(value, value));
  });
  const empty = grids.map((grid) => {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = 'No projects match this search.';
    message.hidden = true;
    grid.after(message);
    return message;
  });
  function render(reorder = false) {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    groups.forEach((cards, index) => {
      let visible = 0;
      cards.forEach((card) => {
        card.hidden = (category.value !== 'all' && card.dataset.category !== category.value) ||
          Boolean(query && !card.dataset.search.includes(query));
        if (!card.hidden) visible++;
      });
      if (reorder && index === 1) {
        [...cards].sort((a, b) => {
          if (sort.value === 'name') return a.dataset.name.localeCompare(b.dataset.name);
          if (sort.value === 'stars') return Number(b.dataset.stars) - Number(a.dataset.stars) || b.dataset.updated.localeCompare(a.dataset.updated);
          return b.dataset.updated.localeCompare(a.dataset.updated);
        }).forEach((card) => grids[index].append(card));
      }
      count += visible;
      empty[index].hidden = visible > 0;
    });
    results.textContent = `${count} public project${count === 1 ? '' : 's'}`;
  }
  search.addEventListener('input', () => render());
  category.addEventListener('change', () => render());
  sort.addEventListener('change', () => render(true));
  render();
});
