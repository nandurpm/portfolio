/* ============================================
   ANIMATIONS JAVASCRIPT - Fixed Version
   ============================================ */

// Counter animation for .counter elements
class CounterAnimation {
  constructor(selector) {
    this.counters = document.querySelectorAll(selector);
    this.init();
  }

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    this.counters.forEach(counter => observer.observe(counter));
  }

  animateCounter(element) {
    const target = parseInt(element.textContent, 10);
    if (isNaN(target)) return;
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }
}

// Card 3-D tilt on hover
class CardHoverLift {
  constructor(selector) {
    document.querySelectorAll(selector).forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const rotateX = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
        const rotateY = (0.5 - (e.clientX - rect.left) / rect.width) * 10;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(15px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
}

// Floating animation for elements with class .floating
class FloatingAnimation {
  constructor(selector) {
    document.querySelectorAll(selector).forEach(el => {
      const duration = 3 + Math.random() * 2;
      el.style.animation = `float ${duration}s ease-in-out infinite`;
    });
  }
}

// Gradient text shift
class GradientAnimation {
  constructor(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.style.backgroundSize = '300% 300%';
      el.style.animation = 'gradientShift 5s ease infinite';
    });
  }
}

// Initialise all animations
new CounterAnimation('.counter');
new CardHoverLift('.card');
new FloatingAnimation('.floating');
new GradientAnimation('.gradient-text');

console.log('%c Animations ready ', 'background:#00d4ff;color:#000;padding:4px 10px;border-radius:3px;');
