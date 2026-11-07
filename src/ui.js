// ===================================================
// K-SOUNDRENTALS — UI Interactions, Auto-Play & Auto-Scroll
// ===================================================

import { PACKAGES } from './packages.js';

const ICON_MUTED = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
const ICON_UNMUTED = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

export function initNavigation() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  const navbar = document.querySelector('.navbar');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (navbar) {
    window.addEventListener(
      'scroll',
      () => {
        navbar.classList.toggle('nav-scrolled', window.scrollY > 24);
      },
      { passive: true }
    );
  }

  initAutoPlayVideosAndMarquees();
  initHomeBentoPackageExplorer();
  initCardSpotlightsAndReveals();
}

function initCardSpotlightsAndReveals() {
  document.querySelectorAll('.spotlight-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  const revealTargets = document.querySelectorAll(
    '.anim-reveal, .calendar-panel, .booking-form-card, .live-package-card'
  );
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }
}

function initAutoPlayVideosAndMarquees() {
  // Clone marquee items so cloned videos also get auto-play & sound controls
  document.querySelectorAll('.auto-marquee-track').forEach((track) => {
    if (track.dataset.cloned === 'true') return;
    track.dataset.cloned = 'true';
    const children = Array.from(track.children);
    children.forEach((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  // Ensure every <video> auto-plays muted & loops seamlessly on mobile & desktop
  const allVideos = Array.from(document.querySelectorAll('video'));
  allVideos.forEach((vid) => {
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.play().catch(() => {});

    const container = vid.closest('.video-thumb, .bento-video-showcase');
    const soundBtn = container ? container.querySelector('.video-sound-btn') : null;

    if (!container) return;

    const toggleSound = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willUnmute = vid.muted;
      // Mute all other videos first
      allVideos.forEach((other) => {
        other.muted = true;
        const otherContainer = other.closest('.video-thumb, .bento-video-showcase');
        const otherBtn = otherContainer?.querySelector('.video-sound-btn');
        if (otherBtn) {
          otherBtn.classList.remove('is-unmuted');
          otherBtn.innerHTML = ICON_MUTED;
        }
      });

      vid.muted = !willUnmute;
      vid.play().catch(() => {});
      if (soundBtn) {
        soundBtn.classList.toggle('is-unmuted', willUnmute);
        soundBtn.innerHTML = willUnmute ? ICON_UNMUTED : ICON_MUTED;
      }
    };

    if (soundBtn) {
      soundBtn.addEventListener('click', toggleSound);
    }
    if (vid.classList.contains('video-thumb-video')) {
      vid.addEventListener('click', toggleSound);
    }
  });
}

function initHomeBentoPackageExplorer() {
  const explorer = document.getElementById('home-pkg-explorer');
  if (!explorer) return;

  const tabs = Array.from(explorer.querySelectorAll('.bento-pkg-tab'));
  const price12El = document.getElementById('bento-price-12');
  const price22El = document.getElementById('bento-price-22');
  const listEl = document.getElementById('bento-inclusion-list');
  const stageImgEl = document.getElementById('bento-stage-img');
  const bookCtaEl = document.getElementById('bento-book-cta');

  const BENTO_TIERS = {
    pkg1: {
      price12: '₱999',
      price22: '₱1,199',
      items: [
        'JBL PartyBox 520 + Tripod Stand',
        '2 Digital Wireless Microphones',
        'Power Cable & AUX Cord'
      ],
      img: '/images/jbl-partybox-520-front.png',
      ctaText: 'Book Speaker & Mic →',
      ctaHref: 'booking.html?pkg=pkg1_12'
    },
    pkg2: {
      price12: '₱1,299',
      price22: '₱1,499',
      items: [
        '32" Smart TV + Karaoke Box & Stand',
        'JBL PartyBox 520 + Tripod Stand',
        '2 Digital Wireless Microphones'
      ],
      img: '/images/jbl-partybox-520-hero.png',
      ctaText: 'Book 32" TV Karaoke →',
      ctaHref: 'booking.html?pkg=pkg2_12'
    },
    pkg3: {
      price12: '₱2,099',
      price22: '₱2,299',
      items: [
        '2× JBL PartyBox 520 Speakers + Stands',
        '32" Smart TV + Karaoke Box & Stand',
        '2 Digital Wireless Microphones'
      ],
      img: '/images/jbl-partybox-520-hero2.png',
      ctaText: 'Book 2× Speakers Pro →',
      ctaHref: 'booking.html?pkg=pkg3_12'
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.getAttribute('data-bento-pkg');
      const data = key ? BENTO_TIERS[key] : null;
      if (!data) return;

      tabs.forEach((t) => t.classList.toggle('active', t === tab));

      if (price12El) price12El.textContent = data.price12;
      if (price22El) price22El.textContent = data.price22;
      if (listEl) {
        listEl.innerHTML = data.items.map((item) => `<li>${item}</li>`).join('');
      }
      if (stageImgEl) {
        stageImgEl.src = data.img;
      }
      if (bookCtaEl) {
        bookCtaEl.textContent = data.ctaText;
        bookCtaEl.setAttribute('href', data.ctaHref);
      }
    });
  });
}

export function initPackageRowSelectors() {
  const cards = document.querySelectorAll('.package-card');
  if (cards.length === 0) return;

  cards.forEach((card) => {
    const rows = card.querySelectorAll('.price-row.selectable');
    const bookBtn = card.querySelector('.pkg-book-btn');

    rows.forEach((row) => {
      const activateRow = () => {
        rows.forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');

        const pkgKey = row.getAttribute('data-pkg-key');
        const pkg = pkgKey ? PACKAGES[pkgKey] : null;
        if (pkg && bookBtn) {
          bookBtn.setAttribute('href', `booking.html?pkg=${pkg.id}`);
          bookBtn.textContent = `Book ${pkg.durationTag} — ₱${pkg.price.toLocaleString()}`;
        }
      };

      row.addEventListener('click', activateRow);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateRow();
        }
      });
    });
  });
}

export function initHeroProductGallery() {
  const mainImg = document.getElementById('hero-product-img');
  const stageEl = document.querySelector('.studio-stage');
  const thumbBtns = Array.from(document.querySelectorAll('.hero-thumb-btn'));
  if (!mainImg || thumbBtns.length === 0) return;

  let currentIdx = 0;
  let autoTimer = null;
  let isPaused = false;

  function showAngle(index) {
    currentIdx = ((index % thumbBtns.length) + thumbBtns.length) % thumbBtns.length;
    const btn = thumbBtns[currentIdx];
    const src = btn.getAttribute('data-img-src');
    if (!src) return;

    thumbBtns.forEach((b, i) => b.classList.toggle('active', i === currentIdx));

    mainImg.classList.add('switching');
    setTimeout(() => {
      mainImg.src = src;
      mainImg.classList.remove('switching');
    }, 140);
  }

  thumbBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      showAngle(idx);
      restartAutoCycle();
    });
  });

  function startAutoCycle() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (!isPaused) {
        showAngle(currentIdx + 1);
      }
    }, 3000);
  }

  function restartAutoCycle() {
    startAutoCycle();
  }

  if (stageEl) {
    stageEl.addEventListener('mouseenter', () => {
      isPaused = true;
    });
    stageEl.addEventListener('mouseleave', () => {
      isPaused = false;
    });
    stageEl.addEventListener(
      'touchstart',
      () => {
        isPaused = true;
      },
      { passive: true }
    );
    stageEl.addEventListener(
      'touchend',
      () => {
        setTimeout(() => {
          isPaused = false;
        }, 2500);
      },
      { passive: true }
    );
  }

  startAutoCycle();
}
