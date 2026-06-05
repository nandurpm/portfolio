document.addEventListener("DOMContentLoaded", () => {
  const search = document.querySelector("[data-subject-search]");
  const semester = document.querySelector("[data-semester-filter]");
  const cards = [...document.querySelectorAll(".subject-card")];
  const apply = () => {
    const q = (search?.value || "").trim().toLowerCase();
    const sem = semester?.value || "all";
    cards.forEach((card) => {
      const text = [card.dataset.code, card.dataset.name, card.dataset.department].join(" ").toLowerCase();
      const show = (!q || text.includes(q)) && (sem === "all" || card.dataset.semester === sem);
      card.style.display = show ? "" : "none";
    });
  };
  search?.addEventListener("input", apply);
  semester?.addEventListener("change", apply);
});
