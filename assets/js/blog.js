const BLOG_STATE = {
  posts: [],
  page: 1,
  perPage: 6,
  query: "",
  category: "all"
};

function filterPosts() {
  const query = BLOG_STATE.query.trim().toLowerCase();
  return BLOG_STATE.posts.filter((post) => {
    const categoryMatch = BLOG_STATE.category === "all" || post.category === BLOG_STATE.category;
    const searchText = `${post.title} ${post.excerpt} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
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

  pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button type="button" class="${page === BLOG_STATE.page ? "active" : ""}" data-page="${page}">${page}</button>`;
  }).join("");

  pagination.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      BLOG_STATE.page = Number(button.dataset.page);
      renderBlogPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  refreshAos();
}

async function setupBlog() {
  const list = document.querySelector("#blogList");
  if (!list) return;

  try {
    BLOG_STATE.posts = await loadJson(DATA_PATHS.blog);
    renderBlogPage();
  } catch (error) {
    list.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }

  const search = document.querySelector("#blogSearch");
  const category = document.querySelector("#blogCategory");

  if (search) {
    search.addEventListener("input", () => {
      BLOG_STATE.query = search.value;
      BLOG_STATE.page = 1;
      renderBlogPage();
    });
  }

  if (category) {
    category.addEventListener("change", () => {
      BLOG_STATE.category = category.value;
      BLOG_STATE.page = 1;
      renderBlogPage();
    });
  }
}

document.addEventListener("DOMContentLoaded", setupBlog);
