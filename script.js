/* ============================================================
   PORTFOLIO — script.js (REDESIGNED & FIXED)
   ============================================================ */

// ── DATA ─────────────────────────────────────────────────────
const WORKS = [
  { id:1, category:"web", emoji:"🌐", title:"Portfolio Website", date:"2026-06-01", desc:"A modern personal portfolio built with HTML, CSS, and JavaScript. Features responsive design, smooth animations, and dynamic content filtering.", link:"https://github.com/nandurpm/portfolio" },
  { id:2, category:"web", emoji:"💼", title:"E-Commerce Platform", date:"2026-05-15", desc:"Full-stack e-commerce solution with product catalog, shopping cart, and payment integration. Built with React and Node.js.", link:"#" },
  { id:3, category:"technical", emoji:"🔧", title:"Task Management Tool", date:"2026-04-20", desc:"A productivity app for managing tasks and projects. Features include task scheduling, priority levels, and progress tracking.", link:"#" },
  { id:4, category:"design", emoji:"🎨", title:"UI Design System", date:"2026-03-10", desc:"Comprehensive design system with reusable components, typography guidelines, and color palettes for modern web applications.", link:"#" },
  { id:5, category:"college", emoji:"📐", title:"IoT Smart Home System", date:"2026-02-05", desc:"College project: Smart home automation system using Arduino and IoT sensors for controlling lights, temperature, and security.", link:"#" },
  { id:6, category:"electrical", emoji:"⚡", title:"Power Distribution Analysis", date:"2026-01-15", desc:"Analysis and simulation of electrical power distribution networks using MATLAB and ETAP software.", link:"#" },
];

const WRITINGS = [
  { id:1, category:"personal", title:"My Journey into Web Development", date:"2026-06-01", tags:["Personal","Web","Learning"], preview:"How I transitioned from electrical engineering to full-stack web development and the lessons I learned along the way.", link:"#" },
  { id:2, category:"technical", title:"Building Scalable APIs with Node.js", date:"2026-05-20", tags:["Technical","Backend","Node.js"], preview:"Best practices for designing and building scalable REST APIs using Node.js, Express, and MongoDB.", link:"#" },
  { id:3, category:"personal", title:"Why I Love Open Source", date:"2026-04-15", tags:["Personal","Open Source"], preview:"The benefits of contributing to open source projects and how it has shaped my career as a developer.", link:"#" },
  { id:4, category:"technical", title:"React Hooks: A Complete Guide", date:"2026-03-10", tags:["Technical","React","JavaScript"], preview:"Deep dive into React Hooks: useState, useEffect, useContext, and custom hooks with practical examples.", link:"#" },
  { id:5, category:"college", title:"Digital Signal Processing Fundamentals", date:"2026-02-05", tags:["College","DSP","Engineering"], preview:"College notes on digital signal processing: sampling, filtering, and Fourier transforms with MATLAB implementations.", link:"#" },
  { id:6, category:"personal", title:"2026 Learning Goals and Reflections", date:"2026-01-01", tags:["Personal","Growth","Goals"], preview:"My learning goals for 2026 and reflections on the technologies I want to master this year.", link:"#" },
];

const FEATURED = [
  { emoji:"🌐", title:"Portfolio Website", desc:"Modern personal portfolio with responsive design, smooth animations, and dynamic content filtering. Built with vanilla HTML, CSS, and JavaScript.", date:"2026-06-01", link:"https://github.com/nandurpm/portfolio", badge:"Live" },
  { emoji:"💼", title:"E-Commerce Platform", desc:"Full-stack e-commerce solution with product catalog, shopping cart, and payment integration using React and Node.js.", date:"2026-05-15", link:"#", badge:"Featured" },
  { emoji:"🔧", title:"Task Management Tool", desc:"Productivity app for managing tasks and projects with scheduling, priority levels, and progress tracking features.", date:"2026-04-20", link:"#", badge:"New" },
];

const RESOURCES = [
  { emoji:"📚", title:"Recommended Books", category:"Study Materials", date:"2026-01-01", desc:"A curated list of books on web development, software engineering, and personal growth that have shaped my career.", link:"#" },
  { emoji:"🔗", title:"Useful Links & Tools", category:"Reference Links", date:"2026-01-01", desc:"Websites, tools, and resources I use daily for development, design, and productivity. Includes documentation and tutorials.", link:"#" },
  { emoji:"🛠", title:"My Development Stack", category:"Tools", date:"2026-01-01", desc:"The tools and technologies I use for building projects: VS Code, Git, Docker, Node.js, React, and more.", link:"#" },
  { emoji:"📝", title:"Study Notes & Guides", category:"Downloads", date:"2026-01-01", desc:"Comprehensive study notes and guides on web development, algorithms, data structures, and electrical engineering topics.", link:"#" },
  { emoji:"🎓", title:"Online Courses", category:"Learning", date:"2026-01-01", desc:"Recommended online courses and certifications for learning web development, cloud computing, and software engineering.", link:"#" },
  { emoji:"💻", title:"Code Snippets", category:"Code", date:"2026-01-01", desc:"Useful code snippets and solutions for common programming problems and patterns.", link:"#" },
];

const UPDATES = {
  daily: [
    { emoji:"🎉", title:"Portfolio Redesigned!", date:"2026-06-01", desc:"Completely redesigned my portfolio with modern UI, smooth animations, and improved user experience. Check it out!", link:"#" },
    { emoji:"💡", title:"Learning React Hooks", date:"2026-05-28", desc:"Spent the day diving deep into React Hooks. Built a custom hook for managing form state. Great progress!", link:"#" },
    { emoji:"🚀", title:"Deployed New Project", date:"2026-05-25", desc:"Successfully deployed my e-commerce platform to production. Excited to see it live and gather user feedback!", link:"#" },
    { emoji:"📚", title:"Reading Clean Code", date:"2026-05-20", desc:"Started reading 'Clean Code' by Robert C. Martin. Already learning so much about writing better code.", link:"#" },
  ],
  announcements: [
    { emoji:"📢", title:"Portfolio Website Launched", date:"2026-06-01", desc:"Welcome to my personal website! I'll be sharing projects, thoughts, insights, and resources here regularly.", link:"#" },
    { emoji:"🎯", title:"New Blog Series Starting", date:"2026-05-15", desc:"Starting a new blog series on 'Building Scalable Web Applications'. First post coming soon!", link:"#" },
    { emoji:"🤝", title:"Open for Collaborations", date:"2026-04-01", desc:"I'm open to collaborating on interesting projects. If you have an idea, let's connect and build something great!", link:"#" },
  ],
  learnings: [
    { emoji:"💡", title:"Async/Await vs Promises", date:"2026-05-25", desc:"Learned the differences between async/await and promises. Async/await makes code more readable and easier to debug.", link:"#" },
    { emoji:"🔍", title:"CSS Grid vs Flexbox", date:"2026-05-20", desc:"Deep dive into CSS Grid and Flexbox. Grid is better for 2D layouts, Flexbox for 1D. Both are essential for modern web design.", link:"#" },
    { emoji:"⚙️", title:"Microservices Architecture", date:"2026-05-15", desc:"Explored microservices architecture patterns. Learned about service discovery, API gateways, and distributed tracing.", link:"#" },
    { emoji:"🔐", title:"Web Security Best Practices", date:"2026-05-10", desc:"Studied web security: HTTPS, CSRF protection, XSS prevention, and secure password storage. Security is not optional!", link:"#" },
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
  const tagHtml = (tags || []).map(t => `<span style="background:var(--bg3);border:1px solid var(--border);padding:4px 10px;border-radius:4px;font-size:11px;color:var(--text3);font-weight:600">${t}</span>`).join("");
  return `
  <div class="card fade-in">
    <p class="card-category">${category}</p>
    <h3 class="card-title">${title}</h3>
    <p class="card-date">${formatDate(date)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${tagHtml}</div>
    <p class="card-desc">${preview}</p>
    <a href="${link}" class="card-link">Read More →</a>
  </div>`;
}

function formatDate(str) {
  try {
    return new Date(str).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return str;
  }
}

// ── RENDER SECTIONS ───────────────────────────────────────────
function renderWorks(filter = "all") {
  const grid = document.getElementById("worksGrid");
  if (!grid) return;
  const items = filter === "all" ? WORKS : WORKS.filter(w => w.category === filter);
  grid.innerHTML = items.length
    ? items.map(makeCard).join("")
    : `<p style="color:var(--text2);grid-column:1/-1;text-align:center;padding:60px 20px">No projects in this category yet. Check back soon!</p>`;
  observeFadeIns();
}

function renderWritings(filter = "all") {
  const grid = document.getElementById("writingsGrid");
  if (!grid) return;
  const items = filter === "all" ? WRITINGS : WRITINGS.filter(w => w.category === filter);
  grid.innerHTML = items.length
    ? items.map(makeWritingCard).join("")
    : `<p style="color:var(--text2);grid-column:1/-1;text-align:center;padding:60px 20px">No writings in this category yet. Check back soon!</p>`;
  observeFadeIns();
}

function renderFeatured() {
  const grid = document.getElementById("featuredBig");
  const preview = document.getElementById("featuredCards");
  if (grid) {
    grid.innerHTML = FEATURED.map(makeCard).join("");
    observeFadeIns();
  }
  if (preview) {
    preview.innerHTML = FEATURED.slice(0, 3).map(makeCard).join("");
    observeFadeIns();
  }
}

function renderResources() {
  const grid = document.getElementById("resourcesGrid");
  if (!grid) return;
  grid.innerHTML = RESOURCES.map(r => makeCard({ ...r, category: r.category })).join("");
  observeFadeIns();
}

function renderUpdates(tab = "daily") {
  const grid = document.getElementById("updatesGrid");
  if (!grid) return;
  const items = UPDATES[tab] || [];
  grid.innerHTML = items.length
    ? items.map(makeCard).join("")
    : `<p style="color:var(--text2);grid-column:1/-1;text-align:center;padding:60px 20px">No updates in this category yet.</p>`;
  observeFadeIns();
}

// ── FILTER BUTTONS ────────────────────────────────────────────
function initFilters() {
  // Works filter
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderWorks(btn.dataset.filter);
    });
  });

  // Writings filter
  document.querySelectorAll("[data-wfilter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-wfilter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderWritings(btn.dataset.wfilter);
    });
  });

  // Updates tabs
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
      ? "rgba(10,14,39,0.95)"
      : "rgba(10,14,39,0.85)";

    // active link
    let current = "";
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
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
        // Close mobile menu if open
        const mobileMenu = document.getElementById("mobileMenu");
        if (mobileMenu) {
          mobileMenu.classList.remove("open");
        }
      }
    });
  });

  // hamburger menu toggle
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
  }
}

// ── FADE IN OBSERVER ──────────────────────────────────────────
function observeFadeIns() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add("visible"), i * 50);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".fade-in:not(.visible)").forEach(el => io.observe(el));
}

// ── CONTACT FORM (FIXED) ──────────────────────────────────────
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("contactName")?.value || "";
    const email = document.getElementById("contactEmail")?.value || "";
    const subject = document.getElementById("contactSubject")?.value || "";
    const message = document.getElementById("contactMessage")?.value || "";
    const note = document.getElementById("formNote");

    // Validate form
    if (!name || !email || !message) {
      if (note) {
        note.textContent = "✗ Please fill in all required fields.";
        note.style.color = "var(--pink)";
      }
      return;
    }

    // Show loading state
    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
      // Simulate sending (in production, this would call your backend API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success message
      if (note) {
        note.textContent = "✓ Message sent successfully! I'll get back to you soon.";
        note.style.color = "var(--green)";
      }

      // Reset form
      form.reset();

      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      // Clear message after 5 seconds
      setTimeout(() => {
        if (note) note.textContent = "";
      }, 5000);
    } catch (error) {
      if (note) {
        note.textContent = "✗ Error sending message. Please try again.";
        note.style.color = "var(--pink)";
      }
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ── NEWSLETTER (FIXED) ────────────────────────────────────────
function subscribeNewsletter() {
  const input = document.getElementById("newsletterEmail");
  if (!input || !input.value) {
    alert("Please enter a valid email address.");
    return;
  }

  const email = input.value;

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  // Show success message
  alert("✓ Thanks for subscribing! You'll hear from me soon.");
  input.value = "";
}

// ── SMOOTH SCROLL ENHANCEMENT ────────────────────────────────
function initSmoothScroll() {
  // Enhance scroll performance
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  console.log("Portfolio loaded successfully!");

  // Render all sections
  renderWorks();
  renderWritings();
  renderFeatured();
  renderResources();
  renderUpdates();

  // Initialize features
  initFilters();
  initNav();
  initContactForm();
  initSmoothScroll();
  observeFadeIns();
});

// ── ERROR HANDLING ────────────────────────────────────────────
window.addEventListener("error", (event) => {
  console.error("Error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});
