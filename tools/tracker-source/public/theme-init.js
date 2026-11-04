// Apply only the last device UI preferences before first paint; no financial data is read.
(() => {
  let theme = "system";
  let palette = "violet";
  try {
    theme = localStorage.getItem("tracker-theme") || theme;
    const savedPalette = localStorage.getItem("tracker-palette");
    if (savedPalette && ["violet", "ocean", "emerald", "rose", "sunset", "indigo"].includes(savedPalette)) {
      palette = savedPalette;
    }
  } catch {
    /* Storage may be disabled. */
  }
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.palette = palette;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#1d2134" : "#ffffff");
})();
