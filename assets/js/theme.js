(function () {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem("portfolio-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initialTheme = storedTheme || (prefersLight ? "light" : "dark");

  // Load the audit stylesheet from one shared entry point so every page receives
  // the same responsive, accessibility and interaction improvements.
  if (!document.querySelector('link[data-portfolio-polish]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("../css/polish.css", document.currentScript?.src || window.location.href).href;
    stylesheet.dataset.portfolioPolish = "true";
    document.head.appendChild(stylesheet);
  }

  root.setAttribute("data-theme", initialTheme);

  function updateThemeColor(isLight) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = isLight ? "#f4f8fb" : "#07111f";
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

  document.addEventListener("DOMContentLoaded", () => {
    updateButton();
    const button = document.querySelector(".theme-toggle");
    if (!button) return;

    button.addEventListener("click", () => {
      const nextTheme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", nextTheme);
      localStorage.setItem("portfolio-theme", nextTheme);
      updateButton();
    });
  });
})();
