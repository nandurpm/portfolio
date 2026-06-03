/* ============================================
   ADVANCED ANIMATIONS JAVASCRIPT
   ============================================ */

// Smooth scroll reveal animation
class ScrollReveal {
  constructor(selector, options = {}) {
    this.elements = document.querySelectorAll(selector);
    this.options = {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px 0px -100px 0px',
      delay: options.delay || 0
    };
    
    this.init();
  }
  
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('active');
          }, this.options.delay * index);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: this.options.threshold,
      rootMargin: this.options.rootMargin
    });
    
    this.elements.forEach(el => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }
}

// Initialize scroll reveals
new ScrollReveal('.card', { threshold: 0.1, delay: 50 });
new ScrollReveal('.section', { threshold: 0.1, delay: 100 });

// Parallax effect
class ParallaxEffect {
  constructor(selector, speed = 0.5) {
    this.elements = document.querySelectorAll(selector);
    this.speed = speed;
    this.init();
  }
  
  init() {
    window.addEventListener('scroll', () => {
      this.elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const scrollPosition = window.scrollY;
        const elementPosition = el.offsetTop;
        
        if (rect.top < window.innerHeight) {
          el.style.transform = `translateY(${(scrollPosition - elementPosition) * this.speed}px)`;
        }
      });
    });
  }
}

// Initialize parallax
new ParallaxEffect('.hero::before', 0.5);
new ParallaxEffect('.hero::after', 0.3);

// Text animation - character by character
class TextAnimation {
  constructor(selector) {
    this.elements = document.querySelectorAll(selector);
    this.animate();
  }
  
  animate() {
    this.elements.forEach(element => {
      const text = element.textContent;
      element.textContent = '';
      
      Array.from(text).forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.animation = `slideInUp 0.5s ease ${index * 0.05}s both`;
        element.appendChild(span);
      });
    });
  }
}

// Initialize text animation for headings
new TextAnimation('.hero-content h1');

// Cursor glow effect
class CursorGlow {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.init();
  }
  
  init() {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.style.cssText = `
      position: fixed;
      width: 30px;
      height: 30px;
      border: 2px solid #00d4ff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      display: none;
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
    `;
    document.body.appendChild(glow);
    
    document.addEventListener('mousemove', (e) => {
      this.x = e.clientX;
      this.y = e.clientY;
      glow.style.left = (this.x - 15) + 'px';
      glow.style.top = (this.y - 15) + 'px';
      glow.style.display = 'block';
    });
    
    document.addEventListener('mouseleave', () => {
      glow.style.display = 'none';
    });
  }
}

// Initialize cursor glow
new CursorGlow();

// Hover card lift effect
class CardHoverLift {
  constructor(selector) {
    this.cards = document.querySelectorAll(selector);
    this.init();
  }
  
  init() {
    this.cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });
  }
}

// Initialize card hover lift
new CardHoverLift('.card');

// Gradient animation background
class GradientAnimation {
  constructor(selector) {
    this.elements = document.querySelectorAll(selector);
    this.init();
  }
  
  init() {
    this.elements.forEach(el => {
      el.style.backgroundSize = '300% 300%';
      el.style.animation = 'gradientShift 5s ease infinite';
    });
  }
}

// Initialize gradient animation
new GradientAnimation('.gradient-text');

// Number counter animation
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
    });
    
    this.counters.forEach(counter => observer.observe(counter));
  }
  
  animateCounter(element) {
    const target = parseInt(element.textContent);
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }
}

// Initialize counter animation
new CounterAnimation('.counter');

// Staggered list animation
class StaggeredAnimation {
  constructor(selector, delay = 100) {
    this.items = document.querySelectorAll(selector);
    this.delay = delay;
    this.init();
  }
  
  init() {
    this.items.forEach((item, index) => {
      item.style.animation = `slideInUp 0.6s ease ${index * this.delay}ms both`;
    });
  }
}

// Initialize staggered animations
new StaggeredAnimation('.writing-item', 100);
new StaggeredAnimation('.project-item', 100);

// Typewriter effect
class TypewriterEffect {
  constructor(selector, speed = 50) {
    this.elements = document.querySelectorAll(selector);
    this.speed = speed;
    this.init();
  }
  
  init() {
    this.elements.forEach(element => {
      const text = element.textContent;
      element.textContent = '';
      this.type(element, text, 0);
    });
  }
  
  type(element, text, index) {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      setTimeout(() => this.type(element, text, index + 1), this.speed);
    }
  }
}

// Initialize typewriter effect
new TypewriterEffect('.typewriter', 50);

// Scroll progress bar
class ScrollProgress {
  constructor() {
    this.init();
  }
  
  init() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #00d4ff, #ff006e);
      z-index: 10000;
      width: 0%;
      transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / scrollHeight) * 100;
      progressBar.style.width = scrolled + '%';
    });
  }
}

// Initialize scroll progress
new ScrollProgress();

// Floating animation for elements
class FloatingAnimation {
  constructor(selector, intensity = 20) {
    this.elements = document.querySelectorAll(selector);
    this.intensity = intensity;
    this.init();
  }
  
  init() {
    this.elements.forEach(el => {
      const duration = 3 + Math.random() * 2;
      el.style.animation = `float ${duration}s ease-in-out infinite`;
    });
  }
}

// Initialize floating animation
new FloatingAnimation('.floating', 20);

// Blur scroll effect
class BlurScroll {
  constructor(selector) {
    this.elements = document.querySelectorAll(selector);
    this.init();
  }
  
  init() {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      this.elements.forEach(el => {
        const blur = Math.min(scrolled / 100, 5);
        el.style.filter = `blur(${blur}px)`;
      });
    });
  }
}

// Initialize blur scroll
new BlurScroll('.blur-on-scroll');

// Confetti animation
class ConfettiAnimation {
  constructor(selector) {
    this.buttons = document.querySelectorAll(selector);
    this.init();
  }
  
  init() {
    this.buttons.forEach(button => {
      button.addEventListener('click', () => {
        this.createConfetti(button);
      });
    });
  }
  
  createConfetti(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        width: 10px;
        height: 10px;
        background: #00d4ff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
      `;
      document.body.appendChild(confetti);
      
      const angle = (Math.PI * 2 * i) / 10;
      const velocity = 5;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;
      let opacity = 1;
      
      const animate = () => {
        x += vx;
        y += vy;
        opacity -= 0.02;
        
        confetti.style.left = x + 'px';
        confetti.style.top = y + 'px';
        confetti.style.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          confetti.remove();
        }
      };
      
      animate();
    }
  }
}

// Initialize confetti animation
new ConfettiAnimation('.confetti-btn');

console.log('%c Animations loaded successfully! ', 'background: #00d4ff; color: #000; padding: 5px 10px; border-radius: 3px;');
