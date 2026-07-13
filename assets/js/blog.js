const BLOG_STATE = {
  posts: [],
  page: 1,
  perPage: 6,
  query: "",
  category: "all",
  source: "static"
};

function filterPosts() {
  const query = BLOG_STATE.query.trim().toLowerCase();
  return BLOG_STATE.posts.filter((post) => {
    const categoryMatch = BLOG_STATE.category === "all" || post.category === BLOG_STATE.category;
    const searchText = `${post.title} ${post.excerpt} ${post.category} ${(post.tags || []).join(" ")}`.toLowerCase();
    return categoryMatch && (!query || searchText.includes(query));
  });
}

function renderBlogPage() {
  const list = document.querySelector("#blogList");
  const pagination = document.querySelector("#blogPagination");
  if (!list || !pagination) return;

  const filtered = filterPosts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / BLOG_STATE.perPage));
  BLOG_STATE.page = Math.min(BLOG_STATE.page, totalPages);

  const start = (BLOG_STATE.page - 1) * BLOG_STATE.perPage;
  const posts = filtered.slice(start, start + BLOG_STATE.perPage);

  list.innerHTML = posts.length
    ? posts.map(blogCard).join("")
    : '<p class="empty-state">No blog posts match your search.</p>';

  pagination.innerHTML = totalPages > 1
    ? Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button type="button" class="${page === BLOG_STATE.page ? "active" : ""}" data-page="${page}" aria-label="Open blog page ${page}">${page}</button>`;
      }).join("")
    : "";

  pagination.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      BLOG_STATE.page = Number(button.dataset.page);
      renderBlogPage();
      document.querySelector("#blogList")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  refreshAos();
}

function filterStaticCards() {
  const list = document.querySelector("#blogList");
  const pagination = document.querySelector("#blogPagination");
  if (!list) return;
  const query = BLOG_STATE.query.trim().toLowerCase();
  const cards = [...list.querySelectorAll(".blog-card")];
  let visibleCount = 0;

  cards.forEach((card) => {
    const categoryMatch = BLOG_STATE.category === "all" || card.dataset.category === BLOG_STATE.category;
    const searchMatch = !query || String(card.dataset.search || card.textContent).toLowerCase().includes(query);
    const visible = categoryMatch && searchMatch;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  let empty = list.querySelector(".static-filter-empty");
  if (!empty) {
    empty = document.createElement("p");
    empty.className = "empty-state static-filter-empty";
    list.append(empty);
  }
  empty.textContent = visibleCount ? "" : "No blog posts match your search.";
  empty.hidden = visibleCount > 0;
  if (pagination) pagination.innerHTML = "";
  refreshAos();
}

function applyBlogFilters() {
  if (BLOG_STATE.source === "json") renderBlogPage();
  else filterStaticCards();
}

async function setupBlog() {
  const list = document.querySelector("#blogList");
  if (!list) return;

  try {
    const posts = await loadJson(DATA_PATHS.blog);
    if (posts.length) {
      BLOG_STATE.posts = posts;
      BLOG_STATE.source = "json";
      renderBlogPage();
    }
  } catch (error) {
    console.warn(error.message);
    BLOG_STATE.source = "static";
  }

  const search = document.querySelector("#blogSearch");
  const category = document.querySelector("#blogCategory");

  search?.addEventListener("input", () => {
    BLOG_STATE.query = search.value;
    BLOG_STATE.page = 1;
    applyBlogFilters();
  });

  category?.addEventListener("change", () => {
    BLOG_STATE.category = category.value;
    BLOG_STATE.page = 1;
    applyBlogFilters();
  });
}

document.addEventListener("DOMContentLoaded", setupBlog);
