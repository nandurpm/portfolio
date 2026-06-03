/* ============================================
   MAIN JAVASCRIPT FILE - Fixed Version
   ============================================ */

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navbar = document.querySelector('.navbar');

if (menuToggle && navbar) {
  menuToggle.addEventListener('click', () => {
    navbar.classList.toggle('active');
    const isOpen = navbar.classList.contains('active');
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.textContent = isOpen ? '✕' : '☰';
  });
}

// Close mobile menu when a nav link is clicked
const navLinks = document.querySelectorAll('.navbar a');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navbar && navbar.classList.contains('active')) {
      navbar.classList.remove('active');
      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', false);
        menuToggle.textContent = '☰';
      }
    }
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Navbar shadow on scroll
const header = document.querySelector('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 50
      ? '0 8px 32px rgba(0, 0, 0, 0.5)'
      : '0 8px 32px rgba(0, 0, 0, 0.3)';
  }, { passive: true });
}

// Single scroll-reveal via IntersectionObserver (removed duplicates)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Contact form handler (shows success state; wire to Formspree for real emails)
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name    = contactForm.querySelector('input[name="name"]');
    const email   = contactForm.querySelector('input[name="email"]');
    const message = contactForm.querySelector('textarea[name="message"]');

    if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
      showFormMessage('Please fill in all required fields.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
      showFormMessage('Please enter a valid email address.', 'error');
      return;
    }

    showFormMessage('Thank you for your message! I will get back to you soon.', 'success');
    contactForm.reset();
  });
}

function showFormMessage(text, type) {
  let msg = document.querySelector('.form-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'form-message';
    contactForm.appendChild(msg);
  }
  msg.textContent = text;
  msg.style.cssText = `
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    font-weight: 500;
    background: ${type === 'success' ? 'rgba(0,212,100,0.15)' : 'rgba(255,68,68,0.15)'};
    border: 1px solid ${type === 'success' ? 'rgba(0,212,100,0.4)' : 'rgba(255,68,68,0.4)'};
    color: ${type === 'success' ? '#00d464' : '#ff4444'};
  `;
  setTimeout(() => msg.remove(), 5000);
}

// Active nav link highlighting — works on all subpages
const highlightActiveLink = () => {
  const path = window.location.pathname;
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    // Resolve href relative to current page
    const a = document.createElement('a');
    a.href = href;
    if (path === a.pathname || (path.endsWith('/') && a.pathname === '/index.html')) {
      link.style.color = 'var(--primary-color)';
      link.style.textShadow = '0 0 10px rgba(0, 212, 255, 0.5)';
    }
  });
};
window.addEventListener('load', highlightActiveLink);

// Keyboard navigation — close menu on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navbar && navbar.classList.contains('active')) {
    navbar.classList.remove('active');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', false);
      menuToggle.textContent = '☰';
    }
  }
});

// Ripple effect on buttons
const addRipple = (button, e) => {
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `
    position:absolute;border-radius:50%;pointer-events:none;
    width:${size}px;height:${size}px;
    left:${e.clientX - rect.left - size/2}px;
    top:${e.clientY - rect.top - size/2}px;
    background:rgba(255,255,255,0.4);
    transform:scale(0);
    animation:ripple-anim 0.6s ease-out;
  `;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
};

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes ripple-anim{to{transform:scale(4);opacity:0}}`;
document.head.appendChild(rippleStyle);

document.querySelectorAll('.btn').forEach(btn => {
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.addEventListener('click', (e) => addRipple(btn, e));
});

// Auto-update copyright year
document.querySelectorAll('.copyright-year').forEach(el => {
  el.textContent = new Date().getFullYear();
});

// Page load fade-in (transition set BEFORE opacity change)
document.body.style.transition = 'opacity 0.4s ease';
document.body.style.opacity = '0';
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});

// Scroll progress bar
const progressBar = document.createElement('div');
progressBar.style.cssText = `
  position:fixed;top:0;left:0;height:3px;z-index:10000;width:0%;
  background:linear-gradient(90deg,#00d4ff,#ff006e);
  transition:width 0.1s ease;pointer-events:none;
`;
document.body.appendChild(progressBar);
window.addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
}, { passive: true });

console.log('%c Portfolio loaded ', 'background:linear-gradient(135deg,#00d4ff,#ff006e);color:white;font-size:14px;padding:8px 16px;border-radius:4px;');
