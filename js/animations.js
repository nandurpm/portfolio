/* ==========================================================================
   Lightweight counter animation
   ========================================================================== */

(() => {
  const counters = Array.from(document.querySelectorAll('.counter'));
  if (!counters.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = (el) => {
    const target = Number.parseFloat(el.textContent.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(target)) return;

    const suffix = el.textContent.replace(/[\d\s.,-]/g, '');
    const duration = prefersReducedMotion ? 1 : 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.45 });

  counters.forEach((counter) => observer.observe(counter));
})();
