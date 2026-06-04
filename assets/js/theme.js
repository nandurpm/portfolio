(function () {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem("portfolio-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initialTheme = storedTheme || (prefersLight ? "light" : "dark");

  root.setAttribute("data-theme", initialTheme);

  function updateButton() {
    const icon = document.querySelector(".theme-icon");
    const button = document.querySelector(".theme-toggle");
    const isLight = root.getAttribute("data-theme") === "light";
    if (icon) {
      icon.textContent = isLight ? "☀" : "☾";
    }
    if (button) {
      button.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    }
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
