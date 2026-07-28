(() => {
  const selector = '[data-reveal]';
  const validReveals = new Set(['fade', 'up', 'down', 'left', 'right', 'zoom', 'zoom-up', 'zoom-down']);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toNumber = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const configureElement = (element) => {
    const reveal = element.getAttribute('data-reveal') || 'up';
    if (!validReveals.has(reveal)) element.setAttribute('data-reveal', 'up');

    element.style.setProperty('--reveal-delay', `${toNumber(element.dataset.delay, 0)}ms`);
    element.style.setProperty('--reveal-duration', `${toNumber(element.dataset.duration, 700)}ms`);
    element.style.setProperty('--reveal-distance', `${toNumber(element.dataset.distance, 40)}px`);
  };

  const applyStagger = (root = document) => {
    root.querySelectorAll('[data-stagger]').forEach((group) => {
      group.querySelectorAll(':scope > [data-reveal]').forEach((item, index) => {
        if (!item.hasAttribute('data-delay')) item.dataset.delay = String(index * 80);
      });
    });
  };

  const revealAll = (elements) => {
    elements.forEach((element) => element.classList.add('is-revealed'));
  };

  const init = (root = document) => {
    applyStagger(root);
    const elements = Array.from(root.querySelectorAll(selector)).filter((element) => !element.dataset.revealReady);
    if (!elements.length) return;

    elements.forEach((element) => {
      element.dataset.revealReady = 'true';
      configureElement(element);
    });

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealAll(elements);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        const repeat = element.dataset.repeat === 'true';

        if (entry.isIntersecting) {
          element.classList.add('is-revealed');
          if (!repeat) observer.unobserve(element);
        } else if (repeat) {
          element.classList.remove('is-revealed');
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    elements.forEach((element) => observer.observe(element));
  };

  document.addEventListener('DOMContentLoaded', () => init());
  document.addEventListener('portfolio:content-rendered', (event) => init(event.target || document));
})();
