// ===================================================
// K-SOUNDRENTALS — Reusable UI Components
// (<PackageCard>, <PackageGrid>, <MediaFrame>, <MediaMarquee>)
// ===================================================

const PESO_SVG_18 = `<svg class="peso-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16"/><path d="M6 4h7a5 5 0 0 1 0 10H6"/><path d="M4 8h16"/><path d="M4 11.5h16"/></svg>`;

const ICON_SPEAKER = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/></svg>`;
const ICON_TV = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
const ICON_MIC = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
const ICON_CABLE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m8 6 10 10"/></svg>`;
const ICON_MUTED = `<svg class="icon-muted" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
const ICON_FB = `<svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;

export const PACKAGE_CARDS_DATA = [
  {
    id: 'pkg1',
    title: 'Speaker & Mic',
    badge: '',
    badgeClass: '',
    featured: false,
    themeClass: 'studio-cyan',
    img: '/images/pkg-speaker-mic.png',
    imgAlt: 'JBL PartyBox 520 & 2 Wireless Microphones',
    pkg12Key: 'pkg1_12',
    price12: '999',
    pkg22Key: 'pkg1_22',
    price22: '1,199',
    btnClass: 'btn-outline',
    features: [
      { icon: ICON_SPEAKER, label: 'JBL PartyBox 520 + Stand' },
      { icon: ICON_MIC, label: '2 Digital Wireless Mics' },
      { icon: ICON_CABLE, label: 'Power Cable & AUX Cord' }
    ]
  },
  {
    id: 'pkg2',
    title: 'Full Karaoke',
    badge: 'Popular',
    badgeClass: 'badge',
    featured: true,
    themeClass: 'studio-orange',
    img: '/images/pkg-full-karaoke.png',
    imgAlt: '32-Inch Smart TV, JBL PartyBox 520 & 2 Wireless Mics',
    pkg12Key: 'pkg2_12',
    price12: '1,299',
    pkg22Key: 'pkg2_22',
    price22: '1,499',
    btnClass: 'btn-primary btn-shine',
    features: [
      { icon: ICON_TV, label: '32" Smart TV + Karaoke Box' },
      { icon: ICON_SPEAKER, label: 'JBL PartyBox 520 + Stand' },
      { icon: ICON_MIC, label: '2 Digital Wireless Mics' }
    ]
  },
  {
    id: 'pkg3',
    title: 'Full Karaoke Pro',
    badge: '2× Speakers',
    badgeClass: 'badge badge-gold',
    featured: false,
    themeClass: 'studio-pink',
    img: '/images/pkg-full-karaoke-pro.png',
    imgAlt: '2× JBL PartyBox 520 Speakers, 32-Inch Smart TV & 2 Wireless Mics',
    pkg12Key: 'pkg3_12',
    price12: '2,099',
    pkg22Key: 'pkg3_22',
    price22: '2,299',
    btnClass: 'btn-outline',
    features: [
      { icon: ICON_TV, label: '32" Smart TV + Karaoke Box' },
      { icon: ICON_SPEAKER, label: '2× JBL PartyBox 520 + Stands' },
      { icon: ICON_MIC, label: '2 Digital Wireless Mics' }
    ]
  }
];

export const EVENT_VIDEOS_DATA = [
  { type: 'video', src: '/media/event-video-1.mp4', alt: 'Karaoke Event Video 1' },
  { type: 'video', src: '/media/event-video-2.mp4', alt: 'Karaoke Event Video 2' },
  { type: 'video', src: '/media/event-video-3.mp4', alt: 'Karaoke Event Video 3' },
  { type: 'video', src: '/media/event-video-4.mp4', alt: 'Karaoke Event Video 4' },
  { type: 'video', src: '/media/event-video-5.mp4', alt: 'Karaoke Event Video 5' }
];

export const EVENT_PHOTOS_DATA = [
  { type: 'photo', src: '/media/event-photo-1.jpg', alt: 'Indoor Karaoke Setup' },
  { type: 'photo', src: '/media/event-photo-2.jpg', alt: 'Disco Party Karaoke Setup' },
  { type: 'photo', src: '/media/event-photo-3.jpg', alt: 'Patio 32-Inch Smart TV Setup' },
  { type: 'photo', src: '/media/event-photo-4.jpg', alt: 'Birthday Celebration Setup' },
  { type: 'reel', src: '/media/video1.jpg', href: 'https://www.facebook.com/share/r/1Ns8TwmQs2/', alt: 'Birthday Party Reel' },
  { type: 'reel', src: '/media/video2.jpg', href: 'https://www.facebook.com/share/r/177mgxHSqY/', alt: 'Fiesta Night Reel' },
  { type: 'reel', src: '/media/video3.jpg', href: 'https://www.facebook.com/share/r/1JE5j95vvZ/', alt: 'Family Reunion Reel' }
];

export const HOME_MIXED_MEDIA = [
  EVENT_VIDEOS_DATA[0],
  EVENT_PHOTOS_DATA[0],
  EVENT_VIDEOS_DATA[1],
  EVENT_PHOTOS_DATA[1],
  EVENT_VIDEOS_DATA[2],
  EVENT_PHOTOS_DATA[2],
  EVENT_VIDEOS_DATA[3],
  EVENT_PHOTOS_DATA[3],
  EVENT_VIDEOS_DATA[4]
];

export function createPackageCardHTML(pkg) {
  const badgeHTML = pkg.badge
    ? `<span class="${pkg.badgeClass}">${pkg.badge}</span>`
    : '';
  const featuredClass = pkg.featured ? ' featured' : '';

  const featuresHTML = pkg.features
    .map(
      (f) => `
      <li>
        <span class="equip-icon">${f.icon}</span>
        <span>${f.label}</span>
      </li>`
    )
    .join('');

  return `
    <article class="package-card${featuredClass} spotlight-card anim-reveal" data-pkg-card="${pkg.id}">
      <div class="pkg-studio-header ${pkg.themeClass}">
        ${badgeHTML}
        <div class="pkg-studio-art">
          <img src="${pkg.img}" alt="${pkg.imgAlt}" class="pkg-studio-speaker float-anim">
        </div>
      </div>

      <h3>${pkg.title}</h3>

      <div class="price-options">
        <div class="price-row selectable selected" data-pkg-key="${pkg.pkg12Key}" role="button" tabindex="0">
          <span class="duration">12 Hours</span>
          <span class="price peso-inline">${PESO_SVG_18}${pkg.price12}</span>
        </div>
        <div class="price-divider"></div>
        <div class="price-row selectable" data-pkg-key="${pkg.pkg22Key}" role="button" tabindex="0">
          <span class="duration">22 Hours</span>
          <span class="price peso-inline">${PESO_SVG_18}${pkg.price22}</span>
        </div>
      </div>

      <ul class="pkg-feature-list">
        ${featuresHTML}
      </ul>

      <a href="booking.html?pkg=${pkg.pkg12Key}" class="btn ${pkg.btnClass} pkg-book-btn">
        Book 12 Hours — ₱${pkg.price12}
      </a>
    </article>
  `;
}

export function createMediaFrameHTML(item, extraClass = '') {
  const cls = `video-card media-frame-only spotlight-card ${extraClass}`.trim();

  // 1. On-Site Event Video (MP4) with Audio Toggle
  if (item.type === 'video') {
    return `
      <article class="${cls} media-card-video">
        <div class="video-thumb">
          <div class="media-type-pill media-pill-clip">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <span>Event Clip</span>
          </div>
          <video src="${item.src}" class="video-thumb-video" autoplay muted loop playsinline preload="metadata"></video>
          <button type="button" class="video-sound-btn" aria-label="Toggle sound">
            ${ICON_MUTED}
          </button>
        </div>
      </article>
    `;
  }

  // 2. Official Facebook Reel / Post Link
  if (item.type === 'reel' && item.href) {
    return `
      <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="${cls} media-card-fb-reel" title="Watch on Facebook">
        <div class="video-thumb">
          <div class="media-type-pill media-pill-fb">
            ${ICON_FB}
            <span>Facebook Reel &nearr;</span>
          </div>
          <img src="${item.src}" alt="${item.alt}" class="video-thumb-cover">
          <div class="fb-play-overlay" aria-hidden="true">
            <div class="fb-play-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <span class="fb-watch-tag">Watch on Facebook</span>
          </div>
        </div>
      </a>
    `;
  }

  // 3. Physical Party Setup Photo
  return `
    <article class="${cls} media-card-photo">
      <div class="video-thumb">
        <div class="media-type-pill media-pill-photo">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          <span>Real Setup</span>
        </div>
        <img src="${item.src}" alt="${item.alt}" class="video-thumb-cover">
      </div>
    </article>
  `;
}

export function initFloatingMessenger() {
  if (document.getElementById('floating-messenger-fab')) return;
  const a = document.createElement('a');
  a.id = 'floating-messenger-fab';
  a.href = 'https://m.me/KSoundRentals';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'floating-messenger-fab';
  a.setAttribute('aria-label', 'Chat on Facebook Messenger');
  a.innerHTML = `
    <span class="messenger-fab-pulse"></span>
    <div class="messenger-fab-icon">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="#ffffff">
        <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.908 1.45 5.512 3.725 7.205V22l3.39-1.86c.91.252 1.88.388 2.885.388 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.06 12.443l-2.618-2.793-5.105 2.793 5.613-5.962 2.68 2.793 5.044-2.793-5.614 5.962z"/>
      </svg>
    </div>
    <span class="messenger-fab-label">Chat with Us</span>
  `;
  document.body.appendChild(a);
}

export function initSharedComponents() {
  // 1. Render any [data-component="package-grid"] slots
  document.querySelectorAll('[data-component="package-grid"]').forEach((slot) => {
    slot.innerHTML = PACKAGE_CARDS_DATA.map((pkg) => createPackageCardHTML(pkg)).join('');
  });

  // 2. Render Home mixed auto-scrolling marquee
  document.querySelectorAll('[data-component="home-media-marquee"]').forEach((slot) => {
    slot.innerHTML = HOME_MIXED_MEDIA.map((item) =>
      createMediaFrameHTML(item, 'marquee-card')
    ).join('');
  });

  // 3. Render Events page top Video Carousel
  document.querySelectorAll('[data-component="events-video-carousel"]').forEach((slot) => {
    const items = [...EVENT_VIDEOS_DATA, ...EVENT_PHOTOS_DATA.filter((p) => p.type === 'reel')];
    slot.innerHTML = items
      .map((item, idx) => createMediaFrameHTML(item, idx === 0 ? 'active-slide' : ''))
      .join('');
  });

  // 4. Render Events page bottom Setup Photos Auto-Marquee
  document.querySelectorAll('[data-component="events-photo-marquee"]').forEach((slot) => {
    slot.innerHTML = EVENT_PHOTOS_DATA.map((item) =>
      createMediaFrameHTML(item, 'marquee-card')
    ).join('');
  });

  // 5. Inject Floating Messenger Quick-Chat Bubble
  initFloatingMessenger();
}
