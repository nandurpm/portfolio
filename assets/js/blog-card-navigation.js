(() => {
  const list = document.querySelector("#blogList");
  if (!list) return;

  function enhanceCards() {
    list.querySelectorAll(".blog-card").forEach((card) => {
      const link = card.querySelector('a[href]');
      if (!link) return;
      card.dataset.articleUrl = link.getAttribute("href");
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      const title = card.querySelector("h3")?.textContent?.trim();
      if (title) card.setAttribute("aria-label", `Read ${title}`);
    });
  }

  list.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, select, textarea")) return;
    const card = event.target.closest(".blog-card[data-article-url]");
    if (card) window.location.href = card.dataset.articleUrl;
  });

  list.addEventListener("keydown", (event) => {
    if (!event.target.matches(".blog-card[data-article-url]")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = event.target.dataset.articleUrl;
    }
  });

  new MutationObserver(enhanceCards).observe(list, { childList: true, subtree: true });
  enhanceCards();
})();
