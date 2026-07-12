const DATA_PATHS = {
  projects: "assets/data/works.json",
  blog: "assets/data/blog.json"
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
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
  const tags = (project.technologies || [])
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`)
    .join("");
  const image = `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy">`;
  const title = `<h3>${escapeHtml(project.title)}</h3>`;
  const url = project.url ? escapeHtml(project.url) : "";

  return `
    <article class="project-card" data-aos="fade-up" data-category="${escapeHtml(project.category)}">
      ${url ? `<a href="${url}" aria-label="Open ${escapeHtml(project.title)} project page">${image}</a>` : image}
      <div class="card-body">
        <div class="card-meta"><span class="pill">${escapeHtml(project.category)}</span>${tags}</div>
        ${url ? `<a href="${url}">${title}</a>` : title}
        <p>${escapeHtml(project.description)}</p>
      </div>
    </article>`;
}

function blogCard(post) {
  const url = escapeHtml(post.url);
  return `
    <article class="blog-card" id="post-${escapeHtml(post.slug)}" data-aos="fade-up">
      <a href="${url}" aria-label="Open ${escapeHtml(post.title)}">
        <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" loading="lazy">
      </a>
      <div class="card-body">
        <div class="card-meta"><span class="pill">${escapeHtml(post.category)}</span><span class="pill">${escapeHtml(post.readTime)}</span></div>
        <a href="${url}"><h3>${escapeHtml(post.title)}</h3></a>
        <p>${escapeHtml(post.excerpt)}</p>
        <div class="card-actions"><a href="${url}">Read More</a><span>${escapeHtml(post.date)}</span></div>
      </div>
    </article>`;
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
        const visible = activeFilter === "all" ? projects : projects.filter((item) => item.category === activeFilter);
        allGrid.innerHTML = visible.length ? visible.map(projectCard).join("") : '<p class="empty-state">No projects match this filter.</p>';
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
    if (target) target.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
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
  let words;
  try {
    words = JSON.parse(target.dataset.typing);
  } catch {
    return;
  }
  if (!Array.isArray(words) || !words.length) return;

  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;
  const tick = () => {
    const word = String(words[wordIndex]);
    target.textContent = word.slice(0, charIndex);
    if (!deleting && charIndex < word.length) charIndex += 1;
    else if (deleting && charIndex > 0) charIndex -= 1;
    else if (!deleting) {
      deleting = true;
      window.setTimeout(tick, 1200);
      return;
    } else {
      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
    }
    window.setTimeout(tick, deleting ? 45 : 85);
  };
  tick();
}

function setupNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  };

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open", !expanded);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function setupContactForm() {
  const form = document.querySelector("#contactForm");
  if (!form) return;
  const recipient = "nandakumarmkdpm@gmail.com";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const subjectText = String(data.get("subject") || "Portfolio Contact").trim() || "Portfolio Contact";
    const message = String(data.get("message") || "").trim();
    const body = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n");

    const note = document.querySelector("#formNote");
    if (note) note.textContent = "Opening your email application with the message prepared.";
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(body)}`;
  });
}

function setupSlideDeck() {
  const deck = document.querySelector("[data-slide-deck]");
  if (!deck) return;
  const slides = [...deck.querySelectorAll("[data-slide]")];
  if (!slides.length) return;

  const dotsWrap = document.querySelector("[data-slide-dots]");
  const progress = document.querySelector("[data-slide-progress]");
  const counter = document.querySelector("[data-slide-counter]");
  const prev = document.querySelector("[data-slide-prev]");
  const next = document.querySelector("[data-slide-next]");
  const intervalMs = 5200;
  let current = 0;
  let timer = 0;
  let progressTimer = 0;
  let startedAt = Date.now();
  let paused = false;

  const updateProgress = () => {
    if (!progress || paused) return;
    progress.style.width = `${Math.min(100, ((Date.now() - startedAt) / intervalMs) * 100)}%`;
  };

  const render = (index, direction = 1) => {
    const previous = slides[current];
    current = (index + slides.length) % slides.length;
    const incoming = slides[current];
    if (previous !== incoming) {
      previous.classList.remove("active");
      previous.classList.add(direction >= 0 ? "exit-left" : "exit-right");
      incoming.classList.add(direction >= 0 ? "enter-right" : "enter-left");
      incoming.getBoundingClientRect();
      incoming.classList.remove("enter-right", "enter-left");
      incoming.classList.add("active");
      window.setTimeout(() => previous.classList.remove("exit-left", "exit-right"), 540);
    } else {
      incoming.classList.add("active");
    }
    dotsWrap?.querySelectorAll("button").forEach((dot, i) => {
      dot.classList.toggle("active", i === current);
      dot.setAttribute("aria-current", i === current ? "true" : "false");
    });
    if (counter) counter.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    startedAt = Date.now();
    if (progress) progress.style.width = "0%";
  };

  const restart = () => {
    window.clearInterval(timer);
    window.clearInterval(progressTimer);
    startedAt = Date.now();
    if (!paused) {
      timer = window.setInterval(() => render(current + 1, 1), intervalMs);
      progressTimer = window.setInterval(updateProgress, 90);
    }
  };

  if (dotsWrap) {
    dotsWrap.innerHTML = slides.map((_, index) => `<button type="button" aria-label="Go to slide ${index + 1}" aria-current="${index === 0}"></button>`).join("");
    dotsWrap.querySelectorAll("button").forEach((dot, index) => dot.addEventListener("click", () => {
      render(index, index >= current ? 1 : -1);
      restart();
    }));
  }
  prev?.addEventListener("click", () => { render(current - 1, -1); restart(); });
  next?.addEventListener("click", () => { render(current + 1, 1); restart(); });
  deck.addEventListener("mouseenter", () => {
    paused = true;
    window.clearInterval(timer);
    window.clearInterval(progressTimer);
    if (progress) progress.style.opacity = "0.4";
  });
  deck.addEventListener("mouseleave", () => {
    paused = false;
    if (progress) progress.style.opacity = "";
    restart();
  });
  render(0);
  restart();
}

function refreshAos() {
  if (window.AOS) window.AOS.refresh();
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
    window.AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 80 });
  }

  if (window.location.hash) {
    const tryScroll = (attempt = 0) => {
      const target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (attempt < 20) window.setTimeout(() => tryScroll(attempt + 1), 100);
    };
    tryScroll();
  }
});
