function createCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  card.innerHTML = `
    <h3>${item.title}</h3>
    <p class="meta">${item.category} | ${item.date}</p>
    <p>${item.description || ""}</p>
    <a href="${item.link}" target="_blank" rel="noopener noreferrer">Open / Download</a>
  `;

  return card;
}

function renderItems(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = `<p class="empty-message">No items found.</p>`;
    return;
  }

  items.forEach(item => {
    container.appendChild(createCard(item));
  });
}

function setupSearch(inputId, containerId, items) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    const keyword = input.value.toLowerCase();

    const filtered = items.filter(item => {
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
      );
    });

    renderItems(containerId, filtered);
  });
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

async function loadNotesPage() {
  try {
    const notes = await loadJson("data/notes.json");
    renderItems("notes-list", notes);
    setupSearch("notes-search", "notes-list", notes);
  } catch (error) {
    console.error(error);
  }
}

async function loadTechnicalPage() {
  try {
    const technical = await loadJson("data/technical.json");
    renderItems("technical-list", technical);
    setupSearch("technical-search", "technical-list", technical);
  } catch (error) {
    console.error(error);
  }
}

async function loadHomePage() {
  const latestContainer = document.getElementById("latest-list");
  if (!latestContainer) return;

  try {
    const notes = await loadJson("data/notes.json");
    const technical = await loadJson("data/technical.json");

    const latest = [...notes, ...technical]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    renderItems("latest-list", latest);
  } catch (error) {
    console.error(error);
  }
}

loadHomePage();
loadNotesPage();
loadTechnicalPage();
