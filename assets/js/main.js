/* Shared progressive enhancements; content is rendered at build time. */

function setupNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;

  const close = (restoreFocus = false) => {
    if (restoreFocus && toggle.getAttribute('aria-expanded') === 'true') toggle.focus();
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  };

  document.documentElement.classList.add("navigation-ready");
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open", !expanded);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close(true);
  });
}

function setupContactForm() {
  const form = document.querySelector("#contactForm");
  if (!form) return;
  const recipient = "nandakumarmkdpm@gmail.com";

  document.querySelector("#copyEmail")?.addEventListener("click", async () => {
    const note = document.querySelector("#formNote");
    try {
      await navigator.clipboard.writeText(recipient);
      if (note) note.textContent = "Email address copied.";
    } catch {
      if (note) note.textContent = `Copy this address: ${recipient}`;
    }
  });

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
    if (note) note.textContent = "Opening your email app. If it does not open, copy the address and message below.";
    const fallback = document.querySelector("#emailFallback");
    document.getElementById("emailFallbackLabel")?.removeAttribute("hidden");
    if (fallback) { fallback.value = `To: ${recipient}\nSubject: ${subjectText}\n\n${body}`; fallback.hidden = false; }
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(body)}`;
    if (mailto.length > 1800) {
      if (note) note.textContent = "This message is long. Copy the prepared email below into your email application.";
      return;
    }
    window.location.href = mailto;
  });
}

// -----------------------------------------------------------------------------
// DYNAMIC-CONTENT SIGNALING AND PAGE INITIALIZATION
// -----------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach((item) => {
    item.textContent = new Date().getFullYear();
  });
  setupNavigation();
  setupContactForm();

  if (window.location.hash) {
    const tryScroll = (attempt = 0) => {
      let id;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      else if (attempt < 20) window.setTimeout(() => tryScroll(attempt + 1), 100);
    };
    tryScroll();
  }
});
