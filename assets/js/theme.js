/*
 * FILE: theme.js
 * FILE PURPOSE: Theme preference controller plus the annual Independence Day event theme.
 */

(function () {
  const root = document.documentElement;
  let storedTheme;
  try { storedTheme = localStorage.getItem("portfolio-series-theme"); } catch { /* Storage is optional. */ }
  const initialTheme = storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : "dark";

  /**
   * Independence Day is intentionally evaluated against the user's local date.
   * Month is zero-based, so 7 represents August. Keeping this check in one
   * utility prevents date logic from leaking into individual components.
   */
  function isIndependenceDay(date = new Date()) {
    return date.getMonth() === 7 && date.getDate() === 15;
  }

  const independenceDayActive = isIndependenceDay();

  function applyEventTheme() {
    if (independenceDayActive) {
      root.setAttribute("data-event-theme", "independence-day");
    } else {
      root.removeAttribute("data-event-theme");
    }
  }

  root.setAttribute("data-theme", initialTheme);
  applyEventTheme();

  if (independenceDayActive && !document.querySelector("link[data-portfolio-independence-day]")) {
    const eventStylesheet = document.createElement("link");
    eventStylesheet.rel = "stylesheet";
    eventStylesheet.href = new URL("../css/independence-day.css", document.currentScript?.src || window.location.href).href;
    eventStylesheet.dataset.portfolioIndependenceDay = "true";
    document.head.appendChild(eventStylesheet);
  }

  function updateThemeColor(isLight) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    if (independenceDayActive) {
      document.querySelectorAll('meta[name="theme-color"]').forEach((item) => { item.content = isLight ? "#fffaf2" : "#07131f"; });
    } else {
      document.querySelectorAll('meta[name="theme-color"]').forEach((item) => { item.content = isLight ? "#f6f3ef" : "#07070a"; });
    }
  }

  function updateButton() {
    const icon = document.querySelector(".theme-icon");
    const button = document.querySelector(".theme-toggle");
    const isLight = root.getAttribute("data-theme") === "light";

    if (icon) icon.textContent = isLight ? "☀" : "☾";
    if (button) {
      button.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
      button.setAttribute("title", isLight ? "Switch to dark theme" : "Switch to light theme");
    }
    updateThemeColor(isLight);
  }

  function insertIndependenceBanner() {
    if (!independenceDayActive || document.querySelector(".independence-banner")) return;

    const banner = document.createElement("section");
    banner.className = "independence-banner";
    banner.setAttribute("aria-label", "Independence Day special message");
    banner.innerHTML = `
      <span class="independence-banner__flag" aria-hidden="true">
        <span class="independence-banner__chakra"></span>
      </span>
      <span class="independence-banner__copy">
        <span class="independence-banner__eyebrow">15 August · India</span>
        <strong class="independence-banner__title">Happy Independence Day</strong>
        <span class="independence-banner__message">Celebrating the freedom to imagine, build and move forward together.</span>
      </span>
      <span class="independence-banner__seal" aria-hidden="true">JAI<br>HIND</span>
    `;

    const main = document.querySelector(".site-shell > main, main");
    if (main?.parentNode) {
      main.parentNode.insertBefore(banner, main);
    } else {
      document.body.prepend(banner);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateButton();
    insertIndependenceBanner();

    const button = document.querySelector(".theme-toggle");
    if (!button) return;

    button.addEventListener("click", () => {
      const nextTheme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", nextTheme);
      try { localStorage.setItem("portfolio-series-theme", nextTheme); } catch { /* Keep the in-memory preference. */ }
      updateButton();
    });
  });

  // Expose the pure date utility for lightweight browser smoke tests without
  // coupling components to the event-theme implementation.
  window.PortfolioTheme = Object.freeze({ isIndependenceDay });
})();
