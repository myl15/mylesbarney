/* ─────────────────────────────────────────────
   MYLES BARNEY — app.js
   Star field canvas + scroll effects
───────────────────────────────────────────── */

// ── Star Field ──────────────────────────────────
(function initStars() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, stars = [], dpr;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.width  = window.innerWidth  * dpr;
    H = canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    buildStars();
  }

  function buildStars() {
    stars = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 4000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x:     Math.random() * window.innerWidth,
        y:     Math.random() * window.innerHeight,
        r:     Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 0.003 + 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    t += 0.008;

    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed * 200 + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 255, ${s.alpha * twinkle})`;
      ctx.fill();
    }

    // Subtle nebula glow in top-right
    const grad = ctx.createRadialGradient(
      window.innerWidth * 0.85, window.innerHeight * 0.15, 0,
      window.innerWidth * 0.85, window.innerHeight * 0.15, window.innerWidth * 0.35
    );
    grad.addColorStop(0, 'rgba(79, 156, 249, 0.04)');
    grad.addColorStop(0.5, 'rgba(167, 139, 250, 0.02)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();


// ── Navbar scroll state ───────────────────────────
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let scrolled = false;
  window.addEventListener('scroll', () => {
    const now = window.scrollY > 20;
    if (now !== scrolled) {
      scrolled = now;
      navbar.style.borderBottomColor = scrolled
        ? 'rgba(100, 160, 255, 0.15)'
        : 'rgba(100, 160, 255, 0.1)';
    }
  }, { passive: true });
})();


// ── Active nav link on scroll ─────────────────────
(function initActiveLinks() {
  const links = document.querySelectorAll('.nav-link');
  const sections = ['about', 'research', 'publications', 'beyond', 'contact'];

  function setActive() {
    const scrollY = window.scrollY + 100;
    let current = '';
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) current = id;
    }
    links.forEach(link => {
      const target = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', target === current);
    });
  }

  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
})();


// ── Reveal on scroll ──────────────────────────────
(function initReveal() {
  // Add .reveal class to section children
  const targets = document.querySelectorAll(
    '.section-label, .section-heading, .about-main, .about-sidebar, ' +
    '.about-photo-col, .hobby-card, .gallery-header, .gallery-item, ' +
    '.featured-project, .project-card, .pub-card, ' +
    '.contact-left, .contact-right, .pub-note'
  );
  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger siblings
        const siblings = [...entry.target.parentElement.children].filter(c => c.classList.contains('reveal'));
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
})();


// ── Smooth scroll for nav links ───────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();

    const navH = document.getElementById('navbar')?.offsetHeight || 64;
    const top = target.getBoundingClientRect().top + window.scrollY - navH;

    window.scrollTo({ top, behavior: 'smooth' });
  });
});


// ── Hero name entrance ────────────────────────────
(function heroEntrance() {
  const content = document.querySelector('.hero-content');
  if (!content) return;
  content.style.opacity = '0';
  content.style.transform = 'translateY(30px)';
  content.style.transition = 'opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1)';
  setTimeout(() => {
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }, 200);
})();


// ── Film Gallery Lightbox ─────────────────────
(function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lightbox-img');
  const lbMeta   = document.getElementById('lightbox-meta');
  if (!lightbox || !lbImg) return;

  let items = [];
  let current = 0;

  function getItems() {
    return [...document.querySelectorAll('.gallery-item:not(.gallery-placeholder)')];
  }

  function updateMeta(el) {
    if (!lbMeta || !el) return;
    const fields = ['camera', 'film', 'date', 'location'];
    let anyVisible = false;
    fields.forEach(field => {
      const item = lbMeta.querySelector(`.meta-item[data-field="${field}"]`);
      if (!item) return;
      const value = (el.dataset[field] || '').trim();
      const valueEl = item.querySelector('.meta-value');
      if (value) {
        valueEl.textContent = value;
        item.hidden = false;
        anyVisible = true;
      } else {
        valueEl.textContent = '';
        item.hidden = true;
      }
    });
    lbMeta.style.display = anyVisible ? '' : 'none';
  }

  window.openLightbox = function(el) {
    items = getItems();
    current = items.indexOf(el);
    if (current === -1 || !items.length) return;
    const img = el.querySelector('img');
    if (!img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    updateMeta(el);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 300);
  };

  window.shiftLightbox = function(dir) {
    items = getItems();
    if (!items.length) return;
    current = (current + dir + items.length) % items.length;
    const nextEl = items[current];
    const img = nextEl.querySelector('img');
    if (!img) return;
    lbImg.style.transform = `translateX(${dir > 0 ? '30px' : '-30px'})`;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      updateMeta(nextEl);
      lbImg.style.transform = 'translateX(0)';
      lbImg.style.opacity = '1';
    }, 150);
  };

  // Keyboard nav
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      window.closeLightbox();
    if (e.key === 'ArrowRight')  window.shiftLightbox(1);
    if (e.key === 'ArrowLeft')   window.shiftLightbox(-1);
  });
})();