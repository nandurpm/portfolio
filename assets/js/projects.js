/*
 * FILE: projects.js
 * FILE PURPOSE: Search, filter, sort, and render the public-only GitHub project catalog.
 */

function publicRepositoryCard(repository) {
  const escape = window.portfolioEscapeHtml;
  const tags = [repository.language, ...(repository.topics || [])]
    .filter(Boolean)
    .slice(0, 4)
    .map((tag) => `<span class="pill">${escape(tag)}</span>`)
    .join("");
  const description = repository.description || repository.readmeSummary || "Open-source project and development notes.";
  const searchText = [repository.title, repository.name, repository.category, description, repository.language, ...(repository.topics || [])].join(" ");

  return `
    <article class="repository-card" data-reveal="up" data-category="${escape(repository.category)}" data-search="${escape(searchText.toLowerCase())}" data-name="${escape(repository.title)}" data-stars="${Number(repository.stars || 0)}" data-updated="${escape(repository.updatedAt || "")}">
      <div class="repository-card-top"><span class="repo-icon" aria-hidden="true">⌁</span><span>${escape(repository.category)}</span></div>
      <h3>${escape(repository.title)}</h3>
      <p>${escape(description)}</p>
      <div class="card-meta">${tags}</div>
      <div class="repository-footer"><span>★ ${Number(repository.stars || 0)} · Updated ${escape(window.formatProjectDate(repository.updatedAt))}</span><span class="card-actions"><a href="${escape(repository.github)}" target="_blank" rel="noopener noreferrer">Repository ↗</a>${repository.demo ? `<a href="${escape(repository.demo)}" target="_blank" rel="noopener noreferrer">Demo ↗</a>` : ""}</span></div>
    </article>`;
}

function sortItems(items, mode, nameKey, dateKey) {
  return [...items].sort((a, b) => {
    if (mode === "name") return String(a[nameKey] || "").localeCompare(String(b[nameKey] || ""));
    if (mode === "stars") return Number(b.stars || 0) - Number(a.stars || 0) || String(b[dateKey] || "").localeCompare(String(a[dateKey] || ""));
    return String(b[dateKey] || "").localeCompare(String(a[dateKey] || ""));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const featuredGrid = document.querySelector("#projectsGrid");
  const moreGrid = document.querySelector("#moreProjectsGrid");
  if (!featuredGrid || !moreGrid) return;

  const search = document.querySelector("#projectSearch");
  const category = document.querySelector("#projectCategory");
  const sort = document.querySelector("#projectSort");
  const results = document.querySelector("#projectResults");

  try {
    const [featured, repositories] = await Promise.all([
      window.loadPortfolioJson(DATA_PATHS.projects),
      window.loadPortfolioJson(DATA_PATHS.githubProjects)
    ]);
    const repositoryByName = new Map(repositories.map((repository) => [repository.name, repository]));
    const enrichedFeatured = featured.map((project) => {
      const repository = repositoryByName.get(project.repository);
      return {
        ...project,
        language: repository?.language || project.language,
        stars: repository?.stars ?? project.stars,
        updated: repository?.updatedAt || project.updated,
        demo: project.demo || repository?.demo || ""
      };
    });
    const featuredNames = new Set(enrichedFeatured.map((project) => project.repository));
    const publicRepositories = repositories.filter((repository) => !featuredNames.has(repository.name) && repository.name !== "nandurpm");
    const categories = [...new Set(publicRepositories.map((repository) => repository.category).filter(Boolean))].sort();
    category.insertAdjacentHTML("beforeend", categories.map((item) => `<option value="${window.portfolioEscapeHtml(item)}">${window.portfolioEscapeHtml(item)}</option>`).join(""));

    const render = () => {
      const query = search.value.trim().toLowerCase();
      const selectedCategory = category.value;
      const matches = (item) => {
        const haystack = [item.title, item.name, item.category, item.description, item.readmeSummary, item.outcome, item.language, ...(item.topics || []), ...(item.technologies || [])].join(" ").toLowerCase();
        return (!query || haystack.includes(query)) && (selectedCategory === "all" || item.category === selectedCategory);
      };
      const visibleFeatured = enrichedFeatured.filter(matches).sort((a, b) => Number(a.rank) - Number(b.rank));
      const visibleMore = sortItems(publicRepositories.filter(matches), sort.value, "title", "updatedAt");

      featuredGrid.innerHTML = visibleFeatured.length ? visibleFeatured.map(window.portfolioProjectCard).join("") : '<p class="empty-state">No featured projects match this search.</p>';
      moreGrid.innerHTML = visibleMore.length ? visibleMore.map(publicRepositoryCard).join("") : '<p class="empty-state">No additional public repositories match this search.</p>';
      results.textContent = `${visibleFeatured.length + visibleMore.length} public project${visibleFeatured.length + visibleMore.length === 1 ? "" : "s"}`;
      notifyContentRendered(document);
    };

    [search, category, sort].forEach((control) => control.addEventListener(control === search ? "input" : "change", render));
    render();
  } catch (error) {
    console.warn(error.message);
    results.textContent = "Catalog unavailable";
  }
});
