/* ============================================================
   PORTFOLIO — script.js
   ============================================================ */

// ── DATA ─────────────────────────────────────────────────────
const WORKS = [
  // ── Add your projects here ──
  // { id:1, category:"web", emoji:"🌐", title:"Your Project Title", date:"2026-06-01", desc:"Short description of what it does.", link:"https://your-link.com" },
  // Categories: "technical" | "design" | "college" | "web" | "docs"
  { id:1, category:"web", emoji:"🌐", title:"Portfolio Website", date:"2026-06-01", desc:"This personal portfolio site — built with HTML, CSS, JS and hosted on GitHub Pages.", link:"https://github.com/nandurpm/portfolio" },
  { id:2, category:"college", emoji:"📐", title:"Your College Project", date:"2026-01-01", desc:"Add your college project title and description here. Update the link to your project or report.", link:"#" },
  { id:3, category:"technical", emoji:"🔧", title:"Your Technical Project", date:"2026-01-01", desc:"Add a personal technical project here — a script, tool, app, or anything you built yourself.", link:"#" },
];

const WRITINGS = [
  // ── Add your blog posts / thoughts here ──
  { id:1, category:"personal", title:"My First Blog Post", date:"2026-06-01", tags:["Personal","Life"], preview:"This is where your first personal blog post preview will appear. Write about anything — your interests, experiences, or opinions.", link:"#" },
  { id:2, category:"personal", title:"Things I'm Learning This Year", date:"2026-05-01", tags:["Personal","Growth"], preview:"A reflection on new skills, habits, and ideas I've been exploring this year. Replace this with your own thoughts.", link:"#" },
  { id:3, category:"personal", title:"Why I Built This Portfolio", date:"2026-04-01", tags:["Personal","Web"], preview:"The story behind creating this site — what motivated me to build a personal space online and share my journey.", link:"#" },
];

const FEATURED = [
  { emoji:"🌐", title:"Portfolio Website", desc:"This personal portfolio — built from scratch with HTML, CSS and JS, hosted on GitHub Pages.", date:"2026-06-01", link:"https://github.com/nandurpm/portfolio", badge:"Live" },
  { emoji:"📐", title:"Your College Project", desc:"Add your best college project here with a short description. Update title, description and link.", date:"2026-01-01", link:"#", badge:"Featured" },
  { emoji:"🔧", title:"Your Personal Project", desc:"Showcase your personal side project here. Could be an app, a tool, a design, or anything creative.", date:"2026-01-01", link:"#", badge:"New" },
];

const RESOURCES = [
  { emoji:"📚", title:"Recommended Books", category:"Study Materials", date:"2026-01-01", desc:"A curated list of books I've read and recommend. Add your own reading list here.", link:"#" },
  { emoji:"🔗", title:"Useful Links", category:"Reference Links", date:"2026-01-01", desc:"Websites, tools, and references I find genuinely useful. Update with your own bookmarks.", link:"#" },
  { emoji:"🛠", title:"Tools I Use", category:"Tools", date:"2026-01-01", desc:"My personal toolkit for learning and building projects. Add the tools that matter to you.", link:"#" },
  { emoji:"📝", title:"Notes & Downloads", category:"Downloads", date:"2026-01-01", desc:"Study notes and downloadable resources. Link to your Google Drive or GitHub files here.", link:"#" },
];

const UPDATES = {
  daily: [
    { emoji:"🎉", title:"Portfolio is Live!", date:"2026-06-01", desc:"My personal portfolio website is now live on GitHub Pages. More updates coming soon!", link:"#" },
    { emoji:"📌", title:"Add your daily update here", date:"2026-06-01", desc:"Share what you're working on, learning, or thinking about. Keep it short and personal.", link:"#" },
  ],
  announcements: [
    { emoji:"📢", title:"Portfolio Launched", date:"2026-06-01", desc:"Welcome to my personal website! I'll be sharing projects, thoughts, and resources here.", link:"#" },
  ],
  learnings: [
    { emoji:"💡", title:"Add a learning here", date:"2026-06-01", desc:"What's something interesting you learned recently? Share a tip, insight, or discovery.", link:"#" },
  ],
};

// ── RENDER HELPERS ────────────────────────────────────────────
function makeCard({ emoji, title, category, date, desc, link, badge }) {
  return `
  <div class="card fade-in">
    <div class="card-img">${emoji || "📁"}</div>
    ${category ? `<p class="card-category">${category}</p>` : ""}
    ${badge ? `<span class="card-category" style="color:var(--green)">${badge}</span>` : ""}
    <h3 class="card-title">${title}</h3>
    ${date ? `<p class="card-date">${formatDate(date)}</p>` : ""}
    ${desc ? `<p class="card-desc">${desc}</p>` : ""}
    ${link ? `<a href="${link}" class="card-link" target="${link.startsWith("http") ? "_blank" : "_self"}">Read More →</a>` : ""}
  </div>`;
}

function makeWritingCard({ title, category, date, tags, preview, link }) {
  const tagHtml = (tags || []).map(t => `<span style="background:var(--bg3);border:1px solid var(--border);padding:2px 8px;border-radius:4px;font-size:11px;color:var(--text3)">${t}</span>`).join("");
  return `
  <div class="card fade-in">
    <p class="card-category">${category}</p>
    <h3 class="card-title">${title}</h3>
    <p class="card-date">${formatDate(date)}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${tagHtml}</div>
    <p class="card-desc">${preview}</p>
    <a href="${link}" class="card-link">Read More →</a>
  </div>`;
}

function formatDate(str) {
  try { return new Date(str).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return str; }
}

// ── RENDER SECTIONS ───────────────────────────────────────────
function renderWorks(filter="all") {
  const grid = document.getElementById("worksGrid");
  if (!grid) return;
  const items = filter === "all" ? WORKS : WORKS.filter(w => w.category === filter);
  grid.innerHTML = items.length ? items.map(makeCard).join("") : `<p style="color:var(--text2);grid-column:1/-1;text-align:center;padding:40px">No projects in this category yet.</p>`;
  observeFadeIns();
}

function renderWritings(filter="all") {
  const grid = document.getElementById("writingsGrid");
  if (!grid) return;
  const items = filter === "all" ? WRITINGS : WRITINGS.filter(w => w.category === filter);
  grid.innerHTML = items.length ? items.map(makeWritingCard).join("") : `<p style="color:var(--text2);grid-column:1/-1;text-align:center;padding:40px">No writings in this category yet.</p>`;
  observeFadeIns();
}

function renderFeatured() {
  const grid = document.getElementById("featuredBig");
  const preview = document.getElementById("featuredCards");
  if (grid) { grid.innerHTML = FEATURED.map(makeCard).join(""); observeFadeIns(); }
  if (preview) { preview.innerHTML = FEATURED.slice(0,3).map(makeCard).join(""); observeFadeIns(); }
}

function renderResources() {
  const grid = document.getElementById("resourcesGrid");
  if (!grid) return;
  grid.innerHTML = RESOURCES.map(r => makeCard({ ...r, category: r.category })).join("");
  observeFadeIns();
}

function renderUpdates(tab="daily") {
  const grid = document.getElementById("updatesGrid");
  if (!grid) return;
  const items = UPDATES[tab] || [];
  grid.innerHTML = items.map(makeCard).join("");
  observeFadeIns();
}

// ── FILTER BUTTONS ────────────────────────────────────────────
function initFilters() {
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderWorks(btn.dataset.filter);
    });
  });
  document.querySelectorAll("[data-wfilter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-wfilter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderWritings(btn.dataset.wfilter);
    });
  });
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderUpdates(btn.dataset.tab);
    });
  });
}

// ── NAV ACTIVE + SCROLL ───────────────────────────────────────
function initNav() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");
  const nav = document.getElementById("navbar");

  window.addEventListener("scroll", () => {
    // scrolled style
    nav.style.background = window.scrollY > 40
      ? "rgba(15,17,23,0.98)"
      : "rgba(15,17,23,0.92)";

    // active link
    let current = "";
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 80) current = sec.id;
    });
    links.forEach(l => {
      l.classList.toggle("active", l.getAttribute("href") === "#" + current);
    });
  }, { passive: true });

  // smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        document.getElementById("mobileMenu")?.classList.remove("open");
      }
    });
  });

  // hamburger
  document.getElementById("hamburger")?.addEventListener("click", () => {
    document.getElementById("mobileMenu")?.classList.toggle("open");
  });
}

// ── FADE IN OBSERVER ──────────────────────────────────────────
function observeFadeIns() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add("visible"), i * 60);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".fade-in:not(.visible)").forEach(el => io.observe(el));
}

// ── CONTACT FORM ──────────────────────────────────────────────
function initContactForm() {
  document.getElementById("contactForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const note = document.getElementById("formNote");
    note.textContent = "✓ Message sent! I'll get back to you soon.";
    e.target.reset();
    setTimeout(() => { note.textContent = ""; }, 5000);
  });
}

// ── NEWSLETTER ────────────────────────────────────────────────
function subscribeNewsletter() {
  const input = document.getElementById("newsletterEmail");
  if (input?.value) {
    alert("Thanks for subscribing! You'll hear from me soon.");
    input.value = "";
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderWorks();
  renderWritings();
  renderFeatured();
  renderResources();
  renderUpdates();
  initFilters();
  initNav();
  initContactForm();
  observeFadeIns();
});
