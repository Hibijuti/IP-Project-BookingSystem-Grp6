// ===================================================
// K-SOUNDRENTALS — Auto-Scrolling Event Videos Carousel
// ===================================================

export function initCarousel() {
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const dotsContainer = document.getElementById('carousel-dots');

  if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

  const cards = Array.from(track.querySelectorAll('.video-card'));
  const total = cards.length;
  if (total === 0) return;

  // Auto-play any <video> inside the carousel
  track.querySelectorAll('video').forEach((v) => {
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.play().catch(() => {});
  });

  let currentIndex = 0;
  let autoSlideTimer = null;
  let isPaused = false;

  // Build pagination dots
  dotsContainer.innerHTML = '';
  const dots = cards.map((_, idx) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = idx === 0 ? 'dot active' : 'dot';
    dot.setAttribute('aria-label', `Slide ${idx + 1}`);
    dot.addEventListener('click', () => {
      goToSlide(idx);
      restartAutoSlide();
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  function getVisibleCount() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  }

  function updateCarousel() {
    cards.forEach((card, idx) => {
      card.classList.toggle('active-slide', idx === currentIndex);
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });

    const visibleCards = getVisibleCount();
    const firstCardWidth = cards[0].getBoundingClientRect().width;
    const gap = 16;

    if (total > visibleCards) {
      const maxOffsetIndex = Math.min(currentIndex, total - visibleCards);
      const offset = maxOffsetIndex * (firstCardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;
    } else if (visibleCards === 1) {
      const offset = currentIndex * (firstCardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;
    } else {
      track.style.transform = 'translateX(0)';
    }
  }

  function goToSlide(index) {
    currentIndex = ((index % total) + total) % total;
    updateCarousel();
  }

  function startAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(() => {
      if (!isPaused) {
        goToSlide(currentIndex + 1);
      }
    }, 2800);
  }

  function restartAutoSlide() {
    startAutoSlide();
  }

  prevBtn.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
    restartAutoSlide();
  });

  nextBtn.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
    restartAutoSlide();
  });

  const carouselWrapper = track.closest('.carousel');
  if (carouselWrapper) {
    carouselWrapper.addEventListener('mouseenter', () => {
      isPaused = true;
    });
    carouselWrapper.addEventListener('mouseleave', () => {
      isPaused = false;
    });
  }

  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener(
    'touchstart',
    (e) => {
      isPaused = true;
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  track.addEventListener(
    'touchend',
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          goToSlide(currentIndex + 1);
        } else {
          goToSlide(currentIndex - 1);
        }
      }
      setTimeout(() => {
        isPaused = false;
      }, 2500);
    },
    { passive: true }
  );

  window.addEventListener('resize', updateCarousel);
  updateCarousel();
  startAutoSlide();
}
