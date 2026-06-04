/* ==========================================================================
   Portfolio UI controller
   - navigation, theme, reveals, gallery modal, writings filters, contact form
   ========================================================================== */

(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('header');
  const nav = document.querySelector('.navbar');
  const menuToggle = document.querySelector('.menu-toggle');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const normalizePath = (path) => path.replace(/\/index\.html$/, '/').replace(/\/+$/, '/').replace(/^\//, '');
  const currentPath = normalizePath(window.location.pathname);

  function setTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem('portfolio-theme', theme);
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
      const isLight = theme === 'light';
      btn.setAttribute('aria-pressed', String(isLight));
      btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      btn.innerHTML = isLight ? '☾' : '☀';
    }
  }

  function getSavedTheme() {
    const saved = localStorage.getItem('portfolio-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function injectHeaderActions() {
    if (!header) return;

    if (!header.querySelector('.site-brand')) {
      const brand = document.createElement('a');
      brand.className = 'site-brand';
      brand.href = '/index.html';
      brand.setAttribute('aria-label', 'Go to homepage');
      brand.innerHTML = '<span>Nandakumar M.</span>';
      header.insertBefore(brand, header.firstChild);
    }

    if (!header.querySelector('.theme-toggle')) {
      const themeToggle = document.createElement('button');
      themeToggle.className = 'theme-toggle';
      themeToggle.type = 'button';
      themeToggle.setAttribute('aria-label', 'Switch theme');
      themeToggle.setAttribute('aria-pressed', 'false');
      themeToggle.innerHTML = '☀';
      header.appendChild(themeToggle);
      themeToggle.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        setTheme(next);
      });
    }
  }

  function initNavigation() {
    if (!nav || !menuToggle) return;

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'site-navigation');
    nav.id = nav.id || 'site-navigation';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Primary navigation');

    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.textContent = open ? '✕' : '☰';
      body.classList.toggle('nav-open', open);
    });

    nav.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;

      const linkPath = normalizePath(new URL(href, window.location.href).pathname);
      const isActive = currentPath === linkPath || (currentPath === '' && linkPath === 'index.html');
      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }

      link.addEventListener('click', () => {
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
        body.classList.remove('nav-open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('active')) return;
      if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
      nav.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.textContent = '☰';
      body.classList.remove('nav-open');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('active')) {
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
        body.classList.remove('nav-open');
        menuToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 960 && nav.classList.contains('active')) {
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
        body.classList.remove('nav-open');
      }
    }, { passive: true });
  }

  function initHeaderScrollState() {
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initRevealObserver() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('active'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -80px 0px' });

    items.forEach((el) => observer.observe(el));
  }

  function initSmoothScroll() {
    if (prefersReducedMotion) return;

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initPageEnhancements() {
    // Timeline treatment for the journey section
    document.querySelectorAll('.section').forEach((section) => {
      const title = section.querySelector('.section-title');
      const group = section.querySelector(':scope > div');
      if (!title || !group) return;

      const heading = title.textContent.trim().toLowerCase();
      if (heading === 'my journey') {
        section.classList.add('timeline-section');
        group.classList.add('timeline-stack');
        group.querySelectorAll('.card').forEach((card, index) => {
          card.classList.add('timeline-card');
          card.style.setProperty('--timeline-index', index);
        });
      }

      if (heading === 'skills & expertise' || heading === 'study categories' || heading === 'study materials') {
        section.classList.add('skills-section');
      }
    });

    // Make local images more performant and stable
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('loading')) {
        const isHero = img.closest('.hero, .profile-image');
        img.loading = isHero ? 'eager' : 'lazy';
      }
      img.decoding = 'async';
    });
  }

  function initGallery() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (galleryItems.length && filterButtons.length) {
      const applyFilter = (category) => {
        galleryItems.forEach((item) => {
          const visible = category === 'all' || item.dataset.category === category;
          item.hidden = !visible;
          item.setAttribute('aria-hidden', String(!visible));
        });
      };

      filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
          filterButtons.forEach((btn) => btn.classList.remove('active'));
          button.classList.add('active');
          applyFilter(button.dataset.category || 'all');
        });
      });
    }

    const open = (trigger) => {
      if (!modal || !modalImage || !trigger) return;
      const img = trigger.querySelector('img');
      if (!img) return;
      modalImage.src = img.src;
      modalImage.alt = img.alt || '';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      body.style.overflow = 'hidden';
      const closeButton = modal.querySelector('.modal-close');
      closeButton?.focus();
    };

    const close = () => {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      body.style.overflow = '';
      if (modalImage) {
        modalImage.src = '';
        modalImage.alt = '';
      }
    };

    window.openModal = open;
    window.closeModal = close;

    if (modal) {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-hidden', 'true');

      const closeButton = modal.querySelector('.modal-close');
      if (closeButton) {
        closeButton.setAttribute('role', 'button');
        closeButton.setAttribute('tabindex', '0');
        closeButton.setAttribute('aria-label', 'Close image preview');
        closeButton.addEventListener('click', close);
        closeButton.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            close();
          }
        });
      }

      modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  function initWritings() {
    window.__portfolioWritingsHandled = true;
    const filterButtons = document.querySelectorAll('.filter-btn');
    const writingItems = Array.from(document.querySelectorAll('.writing-item'));
    const searchInput = document.querySelector('.search-input');
    const prevBtn = document.querySelector('.pagination-prev');
    const nextBtn = document.querySelector('.pagination-next');
    const pageInfo = document.querySelector('.page-info');

    if (!writingItems.length) return;

    const itemsPerPage = 6;
    let currentPage = 1;
    let activeCategory = 'all';
    let searchTerm = '';

    const getVisibleItems = () => writingItems.filter((item) => {
      const catMatch = activeCategory === 'all' || item.dataset.category === activeCategory;
      const title = item.querySelector('h3')?.textContent.toLowerCase() ?? '';
      const desc = item.querySelector('p')?.textContent.toLowerCase() ?? '';
      const termMatch = !searchTerm || title.includes(searchTerm) || desc.includes(searchTerm);
      return catMatch && termMatch;
    });

    const render = () => {
      const visible = getVisibleItems();
      const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;

      writingItems.forEach((item, index) => {
        const matches = visible.includes(item);
        const show = matches && visible.indexOf(item) >= start && visible.indexOf(item) < end;
        item.hidden = !show;
        item.setAttribute('aria-hidden', String(!show));
        if (show) {
          item.style.animation = prefersReducedMotion ? 'none' : `fadeUp 420ms cubic-bezier(.2,.8,.2,1) ${Math.min(index, 6) * 40}ms both`;
        }
      });

      if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        activeCategory = button.dataset.category || 'all';
        currentPage = 1;
        render();
      });
    });

    searchInput?.addEventListener('input', (event) => {
      searchTerm = event.target.value.toLowerCase().trim();
      currentPage = 1;
      render();
    });

    prevBtn?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        render();
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });

    nextBtn?.addEventListener('click', () => {
      currentPage += 1;
      render();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    render();
  }

  function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const requiredFields = Array.from(form.querySelectorAll('[required]'));
      const invalid = requiredFields.find((field) => !String(field.value || '').trim());
      if (invalid) {
        invalid.focus();
        status.textContent = 'Please complete all required fields.';
        return;
      }

      const email = form.querySelector('input[type="email"]');
      if (email && !email.checkValidity()) {
        email.focus();
        status.textContent = 'Please enter a valid email address.';
        return;
      }

      status.textContent = 'Your message is ready to send. Connect this form to a mail service or endpoint for live submissions.';
      form.reset();
    });
  }

  function addPerformanceHints() {
    document.querySelectorAll('a[href^="http"]').forEach((link) => {
      if (link.hostname && link.hostname !== window.location.hostname) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });

    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h) {
          img.width = w;
          img.height = h;
        }
      }
    });
  }

  function init() {
    document.documentElement.dataset.theme = getSavedTheme();
    if (prefersReducedMotion) {
      document.documentElement.dataset.motion = 'reduced';
    }

    injectHeaderActions();
    setTheme(document.documentElement.dataset.theme);
    initNavigation();
    initHeaderScrollState();
    initRevealObserver();
    initSmoothScroll();
    initPageEnhancements();
    initGallery();
    initWritings();
    initContactForm();
    addPerformanceHints();

    const year = document.querySelector('.copyright-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
