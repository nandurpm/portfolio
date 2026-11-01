// Apply the last UI preference before the first paint; no financial data is read.
(() => {
  let theme = "system";
  try {
    theme = localStorage.getItem("tracker-theme") || theme;
  } catch {
    /* Storage may be disabled. */
  }
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#1d2134" : "#ffffff");
})();
