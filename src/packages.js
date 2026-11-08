// ===================================================
// K-SOUNDRENTALS — Shared Package Catalog, Payment & Web3Forms Config
// ===================================================

export const API_BASE_URL = 'http://localhost:3000';

// Supabase Cloud Database: set in .env or paste your credentials here
export const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL ||
  localStorage.getItem('supabase_url') ||
  '';

export const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  localStorage.getItem('supabase_anon_key') ||
  '';

// Google Maps API Key: set in .env (VITE_GOOGLE_MAPS_KEY) or paste your key here
export const GOOGLE_MAPS_API_KEY =
  import.meta.env?.VITE_GOOGLE_MAPS_KEY ||
  localStorage.getItem('google_maps_api_key') ||
  '';

// Web3Forms Access Key for automated email notifications
export const WEB3FORMS_ACCESS_KEY =
  import.meta.env?.VITE_WEB3FORMS_KEY ||
  'be665f3d-3ae0-41ff-9d6e-b1053c0b2dd9';

export const PAYMENT_METHODS = {
  gcash: {
    id: 'gcash',
    name: 'GCash',
    accountNumber: '0995 985 9549',
    rawNumber: '09959859549',
    accountName: 'Kyle B. (K-SoundRentals)',
    qrImage: '/images/gcashref.jpg',
    accent: '#007dfe'
  }
};

export const PACKAGES = {
  pkg1_12: {
    id: 'pkg1_12',
    tierId: '1',
    tier: 'Speaker & Mic',
    durationHours: 12,
    durationTag: '12 Hours',
    price: 999,
    deposit: 200,
    label: 'Speaker & Mic — ₱999 (12 hrs)',
    image: '/images/pkg-speaker-mic.png',
    equipment: [
      'JBL PartyBox 520 + Stand',
      '2 Digital Wireless Mics',
      'Power Cable & AUX Cord'
    ]
  },
  pkg1_22: {
    id: 'pkg1_22',
    tierId: '1',
    tier: 'Speaker & Mic',
    durationHours: 22,
    durationTag: '22 Hours',
    price: 1199,
    deposit: 200,
    label: 'Speaker & Mic — ₱1,199 (22 hrs)',
    image: '/images/pkg-speaker-mic.png',
    equipment: [
      'JBL PartyBox 520 + Stand',
      '2 Digital Wireless Mics',
      'Power Cable & AUX Cord'
    ]
  },
  pkg2_12: {
    id: 'pkg2_12',
    tierId: '2',
    tier: 'Full Karaoke',
    durationHours: 12,
    durationTag: '12 Hours',
    price: 1299,
    deposit: 200,
    label: 'Full Karaoke — ₱1,299 (12 hrs)',
    image: '/images/pkg-full-karaoke.png',
    equipment: [
      '32" Smart TV + Karaoke Box',
      'JBL PartyBox 520 + Stand',
      '2 Digital Wireless Mics'
    ]
  },
  pkg2_22: {
    id: 'pkg2_22',
    tierId: '2',
    tier: 'Full Karaoke',
    durationHours: 22,
    durationTag: '22 Hours',
    price: 1499,
    deposit: 200,
    label: 'Full Karaoke — ₱1,499 (22 hrs)',
    image: '/images/pkg-full-karaoke.png',
    equipment: [
      '32" Smart TV + Karaoke Box',
      'JBL PartyBox 520 + Stand',
      '2 Digital Wireless Mics'
    ]
  },
  pkg3_12: {
    id: 'pkg3_12',
    tierId: '3',
    tier: 'Full Karaoke Pro',
    durationHours: 12,
    durationTag: '12 Hours',
    price: 2099,
    deposit: 200,
    label: 'Full Karaoke Pro — ₱2,099 (12 hrs)',
    image: '/images/pkg-full-karaoke-pro.png',
    equipment: [
      '32" Smart TV + Karaoke Box',
      '2× JBL PartyBox 520 + Stands',
      '2 Digital Wireless Mics'
    ]
  },
  pkg3_22: {
    id: 'pkg3_22',
    tierId: '3',
    tier: 'Full Karaoke Pro',
    durationHours: 22,
    durationTag: '22 Hours',
    price: 2299,
    deposit: 200,
    label: 'Full Karaoke Pro — ₱2,299 (22 hrs)',
    image: '/images/pkg-full-karaoke-pro.png',
    equipment: [
      '32" Smart TV + Karaoke Box',
      '2× JBL PartyBox 520 + Stands',
      '2 Digital Wireless Mics'
    ]
  }
};

export const PACKAGE_TIERS = {
  1: {
    id: '1',
    tier: 'Speaker & Mic',
    prices: { '12h': 999, '22h': 1199 },
    keys: { '12h': 'pkg1_12', '22h': 'pkg1_22' }
  },
  2: {
    id: '2',
    tier: 'Full Karaoke',
    prices: { '12h': 1299, '22h': 1499 },
    keys: { '12h': 'pkg2_12', '22h': 'pkg2_22' }
  },
  3: {
    id: '3',
    tier: 'Full Karaoke Pro',
    prices: { '12h': 2099, '22h': 2299 },
    keys: { '12h': 'pkg3_12', '22h': 'pkg3_22' }
  }
};

export function findPackageByLabel(labelOrKey) {
  if (!labelOrKey) return null;
  if (PACKAGES[labelOrKey]) return PACKAGES[labelOrKey];
  return (
    Object.values(PACKAGES).find(
      (p) => p.label === labelOrKey || p.id === labelOrKey
    ) || null
  );
}

export function pesoIconSvg(sizeOrClass = 16) {
  if (typeof sizeOrClass === 'number') {
    return `<svg class="peso-icon" width="${sizeOrClass}" height="${sizeOrClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16"/><path d="M6 4h7a5 5 0 0 1 0 10H6"/><path d="M4 8h16"/><path d="M4 11.5h16"/></svg>`;
  }
  return `<svg class="${sizeOrClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16"/><path d="M6 4h7a5 5 0 0 1 0 10H6"/><path d="M4 8h16"/><path d="M4 11.5h16"/></svg>`;
}
