const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('#navMenu');
const links = [...document.querySelectorAll('.nav-menu a')];
const sections = links
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

navToggle?.addEventListener('click', () => {
  const isOpen = navMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

links.forEach((link) => {
  link.addEventListener('click', () => {
    navMenu?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-35% 0px -55% 0px' });

  sections.forEach((section) => sectionObserver.observe(section));
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const canvas = document.querySelector('#neuralCanvas');
const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && motionAllowed) {
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let nodes = [];

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    width = canvas.width = Math.floor(window.innerWidth * ratio);
    height = canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const count = Math.min(86, Math.max(34, Math.floor(window.innerWidth / 18)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.42 * ratio,
      vy: (Math.random() - 0.5) * 0.42 * ratio,
      r: (Math.random() * 1.8 + 0.7) * ratio
    }));
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(39, 232, 255, 0.72)';
    context.strokeStyle = 'rgba(92, 255, 177, 0.16)';

    nodes.forEach((node, index) => {
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;

      context.beginPath();
      context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      context.fill();

      for (let nextIndex = index + 1; nextIndex < nodes.length; nextIndex += 1) {
        const next = nodes[nextIndex];
        const dx = node.x - next.x;
        const dy = node.y - next.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const limit = 125 * (window.devicePixelRatio || 1);

        if (distance < limit) {
          context.globalAlpha = 1 - distance / limit;
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(next.x, next.y);
          context.stroke();
          context.globalAlpha = 1;
        }
      }
    });

    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  draw();
}
