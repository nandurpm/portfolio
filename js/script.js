/* ====================================
   FUTURISTIC PORTFOLIO - MAIN JAVASCRIPT
   ==================================== */

// ====================================
// NAVIGATION & MOBILE MENU
// ====================================

const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Close menu when a link is clicked
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Update active nav link based on current page
function updateActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

updateActiveNav();

// ====================================
// SMOOTH SCROLLING
// ====================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ====================================
// BACK TO TOP BUTTON
// ====================================

const backToTopBtn = document.getElementById('backToTop');

if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ====================================
// SCROLL REVEAL ANIMATION
// ====================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.featured-card, .skill-card, .work-card, .writing-card, .resource-card, .cert-card').forEach(el => {
    observer.observe(el);
});

// ====================================
// LOAD FEATURED CONTENT (HOME PAGE)
// ====================================

async function loadFeatured() {
    try {
        const response = await fetch('data/featured.json');
        const data = await response.json();
        const featuredGrid = document.getElementById('featuredGrid');
        
        if (!featuredGrid) return;
        
        featuredGrid.innerHTML = '';
        
        data.featured.forEach(item => {
            const card = document.createElement('div');
            card.className = 'featured-card fade-in';
            card.innerHTML = `
                <div class="featured-card-header">
                    <span class="featured-category">${item.category}</span>
                    <span class="featured-date">${item.date}</span>
                </div>
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <div class="featured-buttons">
                    ${item.link ? `<a href="${item.link}" class="btn btn-primary">View</a>` : ''}
                    ${item.downloadLink ? `<a href="${item.downloadLink}" class="btn btn-secondary" download>Download</a>` : ''}
                </div>
            `;
            featuredGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading featured content:', error);
    }
}

// ====================================
// LOAD WORKS (MY WORKS PAGE)
// ====================================

let allWorks = [];

async function loadWorks() {
    try {
        const response = await fetch('data/works.json');
        const data = await response.json();
        allWorks = data.works;
        displayWorks(allWorks);
        setupFilterButtons();
    } catch (error) {
        console.error('Error loading works:', error);
    }
}

function displayWorks(works) {
    const worksGrid = document.getElementById('worksGrid');
    if (!worksGrid) return;
    
    worksGrid.innerHTML = '';
    
    works.forEach(work => {
        const card = document.createElement('div');
        card.className = 'work-card fade-in';
        card.setAttribute('data-category', work.category);
        card.innerHTML = `
            <div class="work-image">
                ${work.image ? `<img src="${work.image}" alt="${work.title}">` : '📁'}
            </div>
            <div class="work-content">
                <span class="work-category">${work.category}</span>
                <p class="work-date">${work.date}</p>
                <h3>${work.title}</h3>
                <p>${work.description}</p>
                <div class="work-buttons">
                    ${work.link ? `<a href="${work.link}" target="_blank" class="btn btn-primary">View Project</a>` : ''}
                    ${work.github ? `<a href="${work.github}" target="_blank" class="btn btn-secondary">GitHub</a>` : ''}
                </div>
            </div>
        `;
        worksGrid.appendChild(card);
    });
}

function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            if (filter === 'all') {
                displayWorks(allWorks);
            } else {
                const filtered = allWorks.filter(work => work.category.toLowerCase() === filter);
                displayWorks(filtered);
            }
        });
    });
}

// ====================================
// LOAD WRITINGS (MY WRITINGS PAGE)
// ====================================

let allWritings = [];

async function loadWritings() {
    try {
        const response = await fetch('data/writings.json');
        const data = await response.json();
        allWritings = data.writings;
        displayWritings(allWritings);
        setupWritingFilters();
    } catch (error) {
        console.error('Error loading writings:', error);
    }
}

function displayWritings(writings) {
    const writingsGrid = document.getElementById('writingsGrid');
    if (!writingsGrid) return;
    
    writingsGrid.innerHTML = '';
    
    if (writings.length === 0) {
        writingsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No writings found.</p>';
        return;
    }
    
    writings.forEach(writing => {
        const card = document.createElement('div');
        card.className = 'writing-card fade-in';
        card.setAttribute('data-category', writing.category.toLowerCase());
        card.innerHTML = `
            <div class="writing-header">
                <span class="writing-category">${writing.category}</span>
                <span class="writing-date">${writing.date}</span>
            </div>
            <h3>${writing.title}</h3>
            <p class="writing-preview">${writing.preview}</p>
            <div class="writing-tags">
                ${writing.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <a href="${writing.link || '#'}" class="btn btn-primary">Read More</a>
        `;
        writingsGrid.appendChild(card);
    });
}

function setupWritingFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            if (filter === 'all') {
                displayWritings(allWritings);
            } else {
                const filtered = allWritings.filter(writing => 
                    writing.category.toLowerCase() === filter
                );
                displayWritings(filtered);
            }
        });
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = allWritings.filter(writing =>
                writing.title.toLowerCase().includes(searchTerm) ||
                writing.preview.toLowerCase().includes(searchTerm) ||
                writing.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
            displayWritings(filtered);
        });
    }
}

// ====================================
// LOAD RESOURCES (NOTES & RESOURCES PAGE)
// ====================================

let allResources = [];

async function loadResources() {
    try {
        const response = await fetch('data/resources.json');
        const data = await response.json();
        allResources = data.resources;
        displayResources(allResources);
        setupResourceFilters();
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

function displayResources(resources) {
    const resourcesGrid = document.getElementById('resourcesGrid');
    if (!resourcesGrid) return;
    
    resourcesGrid.innerHTML = '';
    
    if (resources.length === 0) {
        resourcesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No resources found.</p>';
        return;
    }
    
    resources.forEach(resource => {
        const card = document.createElement('div');
        card.className = 'resource-card fade-in';
        card.setAttribute('data-category', resource.category.toLowerCase());
        card.innerHTML = `
            <div class="resource-header">
                <span class="resource-category">${resource.category}</span>
                <span class="resource-type">${resource.type}</span>
            </div>
            <h3>${resource.title}</h3>
            <p>${resource.description}</p>
            <div class="resource-buttons">
                ${resource.downloadLink ? `<a href="${resource.downloadLink}" class="btn btn-primary" download>Download</a>` : ''}
                ${resource.referenceLink ? `<a href="${resource.referenceLink}" target="_blank" class="btn btn-secondary">View</a>` : ''}
            </div>
        `;
        resourcesGrid.appendChild(card);
    });
}

function setupResourceFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            if (filter === 'all') {
                displayResources(allResources);
            } else {
                const filtered = allResources.filter(resource => 
                    resource.category.toLowerCase() === filter
                );
                displayResources(filtered);
            }
        });
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = allResources.filter(resource =>
                resource.title.toLowerCase().includes(searchTerm) ||
                resource.description.toLowerCase().includes(searchTerm)
            );
            displayResources(filtered);
        });
    }
}

// ====================================
// LOAD UPDATES (BLOG & UPDATES PAGE)
// ====================================

async function loadUpdates() {
    try {
        const response = await fetch('data/updates.json');
        const data = await response.json();
        displayUpdates(data.updates);
    } catch (error) {
        console.error('Error loading updates:', error);
    }
}

function displayUpdates(updates) {
    const updatesTimeline = document.getElementById('updatesTimeline');
    if (!updatesTimeline) return;
    
    updatesTimeline.innerHTML = '';
    
    updates.forEach(update => {
        const item = document.createElement('div');
        item.className = 'update-item fade-in';
        item.innerHTML = `
            <div class="update-marker"></div>
            <div class="update-card">
                <p class="update-date">${update.date}</p>
                <span class="update-category">${update.category}</span>
                <h3>${update.title}</h3>
                <p>${update.content}</p>
                ${update.link ? `<a href="${update.link}" class="btn btn-primary">Read More</a>` : ''}
            </div>
        `;
        updatesTimeline.appendChild(item);
    });
}

// ====================================
// LOAD FEATURED ON HOME PAGE
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('featuredGrid')) {
        loadFeatured();
    }
});

// ====================================
// CARD HOVER TILT EFFECT (Optional)
// ====================================

function setupCardTilt() {
    const cards = document.querySelectorAll('.work-card, .writing-card, .resource-card, .featured-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    });
}

document.addEventListener('DOMContentLoaded', setupCardTilt);

// ====================================
// UTILITY FUNCTIONS
// ====================================

// Format date to readable format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ====================================
// PAGE LOAD ANIMATION
// ====================================

window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ====================================
// KEYBOARD SHORTCUTS
// ====================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to close mobile menu
    if (e.key === 'Escape') {
        navMenu.classList.remove('active');
    }
});

// ====================================
// DARK MODE TOGGLE (Optional)
// ====================================

function initDarkMode() {
    // Check for saved preference or default to dark mode
    const isDarkMode = localStorage.getItem('darkMode') !== 'false';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
}

initDarkMode();

// ====================================
// PERFORMANCE OPTIMIZATION
// ====================================

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
}

// ====================================
// CONSOLE MESSAGE
// ====================================

console.log('%cWelcome to YourName.dev', 'font-size: 20px; color: #00d4ff; font-weight: bold;');
console.log('%cFuturistic Portfolio Website', 'font-size: 14px; color: #b000ff;');
