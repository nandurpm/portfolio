const DATA_PATHS = {
  projects: "assets/data/projects.json",
  blog: "assets/data/blog.json"
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function projectCard(project) {
  const tags = project.technologies.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  return `
    <article class="project-card" data-aos="fade-up" data-category="${escapeHtml(project.category)}">
      <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}">
      <div class="card-body">
        <div class="card-meta"><span class="pill">${escapeHtml(project.category)}</span>${tags}</div>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <div class="card-actions">
          <a href="${escapeHtml(project.github)}" target="_blank" rel="noopener">GitHub</a>
          <a href="${escapeHtml(project.download)}" download>Download</a>
        </div>
      </div>
    </article>
  `;
}

function blogCard(post) {
  return `
    <article class="blog-card" id="post-${escapeHtml(post.slug)}" data-aos="fade-up">
      <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}">
      <div class="card-body">
        <div class="card-meta">
          <span class="pill">${escapeHtml(post.category)}</span>
          <span class="pill">${escapeHtml(post.readTime)}</span>
        </div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        <div class="card-actions">
          <a href="${escapeHtml(post.url)}">Read More</a>
          <span>${escapeHtml(post.date)}</span>
        </div>
      </div>
    </article>
  `;
}

async function renderProjects() {
  const allGrid = document.querySelector("#projectsGrid");
  const featuredGrid = document.querySelector("#featuredProjects");
  if (!allGrid && !featuredGrid) return;

  try {
    const projects = await loadJson(DATA_PATHS.projects);

    if (featuredGrid) {
      const limit = Number(featuredGrid.dataset.limit || 3);
      featuredGrid.innerHTML = projects.slice(0, limit).map(projectCard).join("");
    }

    if (allGrid) {
      let activeFilter = "all";
      const render = () => {
        const visibleProjects = activeFilter === "all"
          ? projects
          : projects.filter((project) => project.category === activeFilter);
        allGrid.innerHTML = visibleProjects.length
          ? visibleProjects.map(projectCard).join("")
          : '<p class="empty-state">No projects match this filter.</p>';
        refreshAos();
      };

      document.querySelectorAll("[data-project-filter]").forEach((button) => {
        button.addEventListener("click", () => {
          activeFilter = button.dataset.projectFilter;
          document.querySelectorAll("[data-project-filter]").forEach((item) => item.classList.remove("active"));
          button.classList.add("active");
          render();
        });
      });

      render();
    }
  } catch (error) {
    const target = allGrid || featuredGrid;
    target.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

async function renderRecentPosts() {
  const container = document.querySelector("#recentPosts");
  if (!container) return;

  try {
    const posts = await loadJson(DATA_PATHS.blog);
    const limit = Number(container.dataset.limit || 3);
    container.innerHTML = posts.slice(0, limit).map(blogCard).join("");
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function setupTyping() {
  const target = document.querySelector("[data-typing]");
  if (!target) return;

  const words = JSON.parse(target.dataset.typing);
  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    const word = words[wordIndex];
    target.textContent = word.slice(0, charIndex);

    if (!deleting && charIndex < word.length) {
      charIndex += 1;
    } else if (deleting && charIndex > 0) {
      charIndex -= 1;
    } else if (!deleting) {
      deleting = true;
      setTimeout(tick, 1200);
      return;
    } else {
      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
    }

    setTimeout(tick, deleting ? 45 : 85);
  };

  tick();
}

function setupNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open");
  });
}

function setupContactForm() {
  const form = document.querySelector("#contactForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(data.get("subject"));
    const body = encodeURIComponent(
      `Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`
    );
    window.location.href = `mailto:nandakumarmkdpm@gmail.com?subject=${subject}&body=${body}`;
    const note = document.querySelector("#formNote");
    if (note) note.textContent = "Your email app should open with the message prepared.";
  });
}

function setupSlideDeck() {
  const deck = document.querySelector("[data-slide-deck]");
  if (!deck) return;

  const slides = [...deck.querySelectorAll("[data-slide]")];
  const dotsWrap = document.querySelector("[data-slide-dots]");
  const progress = document.querySelector("[data-slide-progress]");
  const prev = document.querySelector("[data-slide-prev]");
  const next = document.querySelector("[data-slide-next]");
  const intervalMs = 5200;
  let current = 0;
  let timer;
  let progressTimer;
  let startedAt = Date.now();

  const setProgress = () => {
    if (!progress) return;
    const elapsed = Date.now() - startedAt;
    const percent = Math.min(100, (elapsed / intervalMs) * 100);
    progress.style.width = `${percent}%`;
  };

  const render = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === current);
    });
    if (dotsWrap) {
      dotsWrap.querySelectorAll("button").forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === current);
      });
    }
    startedAt = Date.now();
    setProgress();
    refreshAos();
  };

  const restart = () => {
    window.clearInterval(timer);
    window.clearInterval(progressTimer);
    timer = window.setInterval(() => render(current + 1), intervalMs);
    progressTimer = window.setInterval(setProgress, 90);
    startedAt = Date.now();
  };

  if (dotsWrap) {
    dotsWrap.innerHTML = slides.map((_, index) => (
      `<button type="button" aria-label="Go to slide ${index + 1}"></button>`
    )).join("");
    dotsWrap.querySelectorAll("button").forEach((dot, index) => {
      dot.addEventListener("click", () => {
        render(index);
        restart();
      });
    });
  }

  if (prev) {
    prev.addEventListener("click", () => {
      render(current - 1);
      restart();
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      render(current + 1);
      restart();
    });
  }

  render(0);
  restart();
}

function refreshAos() {
  if (window.AOS) {
    window.AOS.refreshHard();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  setupNavigation();
  setupTyping();
  setupContactForm();
  setupSlideDeck();
  renderProjects().then(refreshAos);
  renderRecentPosts().then(refreshAos);

  if (window.AOS) {
    window.AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      offset: 80
    });
  }
});
