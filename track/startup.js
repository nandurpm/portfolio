// A bundle-load failure must leave a useful screen, even if React never starts.
(() => {
  const failure = () => {
    const boot = document.querySelector("[data-tracker-bootstrap]");
    if (!boot) return;
    boot.querySelector("[data-boot-spinner]")?.setAttribute("hidden", "");
    const message = boot.querySelector("[data-boot-message]");
    if (message) {
      message.textContent =
        "We couldn’t load the tracker. Check your connection and try again.";
      message.setAttribute("role", "alert");
    }
    boot.querySelector("[data-boot-retry]")?.removeAttribute("hidden");
  };
  document
    .querySelector("[data-boot-retry]")
    ?.addEventListener("click", () => location.reload());
  window.addEventListener("tracker:startup-failed", failure);
  window.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLScriptElement) failure();
    },
    true,
  );
  window.addEventListener("vite:preloadError", failure);
  setTimeout(failure, 20000);
})();
