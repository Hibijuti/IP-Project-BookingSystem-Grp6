// ===================================================
// K-SOUNDRENTALS — Clean Breadcrumbs Booking & Deposit Module
// ===================================================

import {
  API_BASE_URL,
  WEB3FORMS_ACCESS_KEY,
  PAYMENT_METHODS,
  PACKAGES,
  findPackageByLabel,
  pesoIconSvg
} from './packages.js';
import { isBlocked, blockDateLocally } from './calendar.js';
import { saveBookingToDB } from './db.js';

let activePaymentChannel = 'gcash';
let currentStep = 1;
let maxStepUnlocked = 1;

function showError(inputEl, message) {
  if (!inputEl) return;
  clearError(inputEl);
  const error = document.createElement('p');
  error.className = 'error-msg';
  error.textContent = message;
  inputEl.parentNode.appendChild(error);
  inputEl.style.borderColor = '#ef4444';
}

function clearError(inputEl) {
  if (!inputEl) return;
  const existing = inputEl.parentNode.querySelector('.error-msg');
  if (existing) existing.remove();
  inputEl.style.borderColor = '';
}

function parseHour24(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

function formatHour12(hour24) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}:00 ${period}`;
}

export function updateLiveSummary() {
  const pkgSelect = document.getElementById('package-select');
  const dateInput = document.getElementById('input-date');
  const timeSelect = document.getElementById('delivery-time');

  const selectedPkg = findPackageByLabel(pkgSelect?.value) || PACKAGES.pkg2_12;
  const dateVal = dateInput?.value || '';
  const timeVal = timeSelect?.value || '';

  const recapDateTimeEl = document.getElementById('recap-datetime');
  const recapPkgTitleEl = document.getElementById('recap-pkg-title');
  const recapPkgImgEl = document.getElementById('recap-pkg-img');
  const recapPriceEl = document.getElementById('recap-price');
  const recapBalanceEl = document.getElementById('recap-balance');

  if (recapDateTimeEl) {
    if (dateVal) {
      const [y, m, d] = dateVal.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const shortDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      recapDateTimeEl.textContent = timeVal ? `${shortDate} @ ${timeVal}` : shortDate;
    } else {
      recapDateTimeEl.textContent = 'Select date & time';
    }
  }

  if (selectedPkg) {
    if (recapPkgTitleEl) {
      recapPkgTitleEl.textContent = `${selectedPkg.tier} (${selectedPkg.durationHours} Hours)`;
    }
    if (recapPkgImgEl && selectedPkg.image) {
      recapPkgImgEl.src = selectedPkg.image;
      recapPkgImgEl.alt = selectedPkg.label;
    }
    if (recapPriceEl) {
      recapPriceEl.innerHTML = `${pesoIconSvg(18)}${selectedPkg.price.toLocaleString()}`;
    }
    if (recapBalanceEl) {
      const bal = Math.max(0, selectedPkg.price - selectedPkg.deposit);
      recapBalanceEl.innerHTML = `${pesoIconSvg(14)}${bal.toLocaleString()}`;
    }

    const dpTotalEl = document.getElementById('dp-recap-total');
    const dpBalanceEl = document.getElementById('dp-recap-balance');
    if (dpTotalEl) {
      dpTotalEl.innerHTML = `${pesoIconSvg(13)}${selectedPkg.price.toLocaleString()}`;
    }
    if (dpBalanceEl) {
      const bal = Math.max(0, selectedPkg.price - selectedPkg.deposit);
      dpBalanceEl.innerHTML = `${pesoIconSvg(13)}${bal.toLocaleString()}`;
    }
  }

  const addressInput = document.getElementById('input-address');
  const recapVenueEl = document.getElementById('recap-venue');
  if (recapVenueEl) {
    const addr = addressInput?.value?.trim() || '';
    recapVenueEl.textContent = addr || 'Lapu-Lapu City';
  }

  updatePaymentQRWidget(selectedPkg);
}

function updatePaymentQRWidget(selectedPkg) {
  const qrImg = document.getElementById('pay-qr-img');
  const channelLabel = document.getElementById('pay-channel-label');
  const acctNumberEl = document.getElementById('pay-acct-number');
  const acctNameEl = document.getElementById('pay-acct-name');
  const copyBtn = document.getElementById('pay-copy-btn');
  const amountDueEl = document.getElementById('pay-amount-due');

  const method = PAYMENT_METHODS[activePaymentChannel] || PAYMENT_METHODS.gcash;
  const pkg =
    selectedPkg ||
    findPackageByLabel(document.getElementById('package-select')?.value) ||
    PACKAGES.pkg2_12;

  const amountDue = pkg.deposit; // Strictly ₱500 reservation deposit

  if (qrImg) {
    qrImg.src = method.qrImage;
    qrImg.alt = `${method.name} QR Code`;
  }
  if (channelLabel) channelLabel.textContent = method.name;
  if (acctNumberEl) acctNumberEl.textContent = method.accountNumber;
  if (acctNameEl) acctNameEl.textContent = method.accountName;
  if (copyBtn) copyBtn.setAttribute('data-copy', method.rawNumber);
  if (amountDueEl) {
    amountDueEl.innerHTML = `${pesoIconSvg(16)}${amountDue.toLocaleString()}`;
  }
}

function initPaymentFlowControls() {
  const channelBtns = document.querySelectorAll('.pay-channel-btn[data-channel]');

  channelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activePaymentChannel = btn.dataset.channel;
      channelBtns.forEach((b) => {
        const isMatch = b.dataset.channel === activePaymentChannel;
        b.classList.toggle('active', isMatch);
        b.setAttribute('aria-pressed', String(isMatch));
      });
      updateLiveSummary();
    });
  });

  updatePaymentQRWidget();
}

function syncVisualWidgetsFromInputs() {
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');

  if (pkgSelect) {
    const selectedPkg = findPackageByLabel(pkgSelect.value);
    const tierCards = document.querySelectorAll('.pkg-choice-card[data-tier]');
    const durBtns = document.querySelectorAll('.dur-pill-btn[data-hours]');

    if (selectedPkg) {
      tierCards.forEach((card) => {
        const isMatch = card.dataset.tier === selectedPkg.tier;
        card.classList.toggle('active', isMatch);
        card.setAttribute('aria-pressed', String(isMatch));
      });

      durBtns.forEach((btn) => {
        const isMatch = Number(btn.dataset.hours) === selectedPkg.durationHours;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });

      updateTierCardPrices(selectedPkg.durationHours);
    }
  }

  if (timeSelect) {
    const chips = document.querySelectorAll('.time-chip[data-time]');
    chips.forEach((chip) => {
      const isMatch = chip.dataset.time === timeSelect.value;
      chip.classList.toggle('active', isMatch);
      chip.setAttribute('aria-pressed', String(isMatch));
    });
  }
}

function updateTierCardPrices(durationHours) {
  const tierCards = document.querySelectorAll('.pkg-choice-card[data-tier]');
  tierCards.forEach((card) => {
    const tierName = card.dataset.tier;
    const pkg = Object.values(PACKAGES).find(
      (p) => p.tier === tierName && p.durationHours === Number(durationHours)
    );
    const priceEl = card.querySelector('.choice-price');
    const hrsEl = card.querySelector('.choice-hrs');
    if (pkg && priceEl) {
      priceEl.innerHTML = `${pesoIconSvg(15)}${pkg.price.toLocaleString()}`;
    }
    if (pkg && hrsEl) {
      hrsEl.textContent = `/ ${pkg.durationHours} hrs`;
    }
  });
}

function initInteractiveFormPickers() {
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');

  const tierCards = document.querySelectorAll('.pkg-choice-card[data-tier]');
  const durBtns = document.querySelectorAll('.dur-pill-btn[data-hours]');
  const timeChips = document.querySelectorAll('.time-chip[data-time]');

  let activeDuration = 12;
  let activeTier = 'Full Karaoke';

  if (pkgSelect && pkgSelect.value) {
    const current = findPackageByLabel(pkgSelect.value);
    if (current) {
      activeDuration = current.durationHours;
      activeTier = current.tier;
    }
  }

  function applySelection() {
    const matched = Object.values(PACKAGES).find(
      (p) => p.tier === activeTier && p.durationHours === activeDuration
    );
    if (matched && pkgSelect) {
      pkgSelect.value = matched.label;
      pkgSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncVisualWidgetsFromInputs();
    updatePickupHelper();
    updateLiveSummary();
  }

  tierCards.forEach((card) => {
    card.addEventListener('click', () => {
      activeTier = card.dataset.tier;
      applySelection();
    });
  });

  durBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeDuration = Number(btn.dataset.hours);
      updateTierCardPrices(activeDuration);
      applySelection();
    });
  });

  timeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const selectedTime = chip.dataset.time;
      if (timeSelect) {
        timeSelect.value = selectedTime;
        timeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncVisualWidgetsFromInputs();
      updatePickupHelper();
      updateLiveSummary();
    });
  });

  syncVisualWidgetsFromInputs();
  updateLiveSummary();
}

function updatePickupHelper() {
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');
  const helperEl = document.getElementById('pickup-helper');

  syncVisualWidgetsFromInputs();
  updateLiveSummary();

  if (!pkgSelect || !timeSelect || !helperEl) return;

  const pkg = findPackageByLabel(pkgSelect.value);
  const startHour = parseHour24(timeSelect.value);

  if (!pkg || startHour === null) {
    helperEl.style.display = 'none';
    return;
  }

  const endHour = startHour + pkg.durationHours;
  const nextDay = endHour >= 24;
  const formattedEnd = formatHour12(endHour);

  helperEl.style.display = 'flex';
  helperEl.innerHTML = `
    <span class="pickup-dot"></span>
    <span>Pickup: <strong>${formattedEnd}${nextDay ? ' (next day)' : ''}</strong></span>
  `;
}

function buildBookingSummaryText(data) {
  const gmapsLink = data.mapLink || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(data.address || 'Lapu-Lapu City'));
  return [
    '🎤 K-SOUNDRENTALS RESERVATION #' + (data.id || 'BOOKING'),
    '----------------------------------------',
    'Customer: ' + data.name,
    data.fbName ? 'Facebook: ' + data.fbName : null,
    'Mobile: ' + data.phone,
    'Schedule: ' + data.date + ' @ ' + data.deliveryTime,
    'Package: ' + data.packageChosen,
    'Venue: ' + data.address,
    'Google Maps: ' + gmapsLink,
    'Deposit Required: ₱' + Number(data.amountDue || 500).toLocaleString() + ' (GCash 0995 985 9549)',
    '----------------------------------------',
    'Screenshot to be sent to Messenger: https://m.me/KSoundRentals'
  ]
    .filter(Boolean)
    .join('\n');
}

function showBookingConfirmation(bookingData, isOfflineFallback = false) {
  const formCard = document.getElementById('booking-form-card');
  const successBox = document.getElementById('success-message');
  const contentEl = document.getElementById('booking-confirmation-content');
  const stepperBar = document.querySelector('.booking-breadcrumbs-wrap');

  blockDateLocally(bookingData.date);
  saveBookingToDB(bookingData);

  if (formCard) formCard.style.display = 'none';
  if (stepperBar) stepperBar.style.display = 'none';

  const dateParts = (bookingData.date || '').split('-').map(Number);
  const dateObj = dateParts.length === 3 && !dateParts.some(isNaN)
    ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
    : new Date();

  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const pkgObj = findPackageByLabel(bookingData.packageChosen) || PACKAGES.pkg2_12;
  const totalPrice = pkgObj.price || 1299;
  const depositAmt = bookingData.amountDue || 500;
  const balanceAmt = Math.max(0, totalPrice - depositAmt);
  const mapsUrl = bookingData.mapLink || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(bookingData.address || 'Lapu-Lapu City'));

  if (contentEl) {
    contentEl.innerHTML = [
      '<div class="conf-hero">',
      '  <div class="conf-success-icon" aria-hidden="true">',
      '    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      '  </div>',
      '  <h3>Reservation Received</h3>',
      '  <p class="conf-subtitle">',
      '    Your setup is on hold. Complete your <strong>₱500 GCash deposit</strong> below and message our Facebook page to lock in your date.',
      '  </p>',
      '</div>',
      '<!-- UNIFIED VIP RESERVATION & PAYMENT PASS -->',
      '<div class="conf-pass-card">',
      '  <!-- PASS HEADER: REFERENCE & STATUS -->',
      '  <div class="conf-pass-header">',
      '    <div class="conf-ref-pill">',
      '      <span class="ref-label">REF</span>',
      '      <strong class="ref-code">#' + (bookingData.id || 'CONFIRMED') + '</strong>',
      '    </div>',
      '    <div class="conf-status-tag">',
      '      <span>Awaiting <span class="peso-inline">' + pesoIconSvg(12) + depositAmt.toLocaleString() + '</span> Deposit</span>',
      '    </div>',
      '  </div>',
      '  <!-- PACKAGE HIGHLIGHT STRIP -->',
      '  <div class="conf-pkg-strip">',
      '    <div class="conf-pkg-thumb-box">',
      '      <img src="' + (pkgObj.image || '/images/pkg-full-karaoke.png') + '" alt="' + (pkgObj.label || 'Package') + '" class="conf-pkg-strip-img">',
      '    </div>',
      '    <div class="conf-pkg-strip-info">',
      '      <span class="conf-pkg-strip-tier">' + (pkgObj.tier || 'Karaoke Package') + '</span>',
      '      <h4 class="conf-pkg-strip-name">' + (pkgObj.label || bookingData.packageChosen) + '</h4>',
      '      <span class="conf-pkg-strip-dur">' + (pkgObj.durationTag || '12 Hours Rental') + '</span>',
      '    </div>',
      '    <div class="conf-pkg-strip-price">',
      '      <span class="conf-rate-label">Package Rate</span>',
      '      <strong class="peso-inline conf-rate-val">' + pesoIconSvg(15) + totalPrice.toLocaleString() + '</strong>',
      '    </div>',
      '  </div>',
      '  <!-- EVENT DETAILS GRID -->',
      '  <div class="conf-pass-details">',
      '    <div class="conf-detail-cell">',
      '      <span class="conf-cell-label">',
      '        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      '        <span>Schedule</span>',
      '      </span>',
      '      <strong class="conf-cell-val">' + formattedDate + ' • ' + bookingData.deliveryTime + '</strong>',
      '    </div>',
      '    <div class="conf-detail-cell">',
      '      <span class="conf-cell-label">',
      '        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      '        <span>Customer</span>',
      '      </span>',
      '      <strong class="conf-cell-val">' + bookingData.name + ' (<a href="tel:' + bookingData.phone + '" class="conf-tel-link">' + bookingData.phone + '</a>)</strong>',
      '    </div>',
      '    <div class="conf-detail-cell">',
      '      <span class="conf-cell-label">',
      '        <svg viewBox="0 0 24 24" width="13" height="13" fill="#0084ff"><path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.454 5.518 3.734 7.202V22l3.411-1.872c.905.251 1.867.387 2.855.387 5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2zm1.002 12.443-2.56-2.73-4.996 2.73 5.496-5.834 2.624 2.73 4.932-2.73-5.496 5.834z"/></svg>',
      '        <span>Facebook</span>',
      '      </span>',
      '      <strong class="conf-cell-val">' + (bookingData.fbName || '—') + '</strong>',
      '    </div>',
      '    <div class="conf-detail-cell full-width">',
      '      <span class="conf-cell-label">',
      '        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
      '        <span>Delivery Venue</span>',
      '      </span>',
      '      <div class="conf-venue-line">',
      '        <strong class="conf-cell-val">' + bookingData.address + '</strong>',
      '        <a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" class="conf-map-pill">',
      '          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
      '          <span>Map ↗</span>',
      '        </a>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <!-- FINANCIAL BREAKDOWN BAR -->',
      '  <div class="conf-financial-bar">',
      '    <div class="conf-fin-col">',
      '      <span class="fin-label">Package Rate</span>',
      '      <span class="fin-val peso-inline">' + pesoIconSvg(13) + totalPrice.toLocaleString() + '</span>',
      '    </div>',
      '    <div class="conf-fin-col highlight">',
      '      <span class="fin-label">Reservation Deposit</span>',
      '      <strong class="fin-val highlight-val peso-inline">' + pesoIconSvg(15) + depositAmt.toLocaleString() + '</strong>',
      '    </div>',
      '    <div class="conf-fin-col">',
      '      <span class="fin-label">Balance on Handover</span>',
      '      <span class="fin-val peso-inline">' + pesoIconSvg(13) + balanceAmt.toLocaleString() + '</span>',
      '    </div>',
      '  </div>',
      '  <!-- TICKET NOTCH DIVIDER -->',
      '  <div class="conf-pass-tear">',
      '    <span class="tear-notch left"></span>',
      '    <div class="tear-dashed-line"></div>',
      '    <span class="tear-notch right"></span>',
      '  </div>',
      '  <!-- GCASH INSTANT DEPOSIT HUB -->',
      '  <div class="conf-gcash-hub">',
      '    <div class="conf-gcash-head">',
      '      <div class="gcash-badge-wrap">',
      '        <span class="gcash-logo-pill">GCash</span>',
      '        <span class="gcash-head-text">Reservation Downpayment</span>',
      '      </div>',
      '      <div class="gcash-due-chip">',
      '        <span class="gcash-due-label">Deposit Due:</span>',
      '        <strong class="peso-inline gcash-due-num">' + pesoIconSvg(15) + depositAmt.toLocaleString() + '</strong>',
      '      </div>',
      '    </div>',
      '    <!-- TWO CLEAN PAYMENT PATHS -->',
      '    <div class="conf-gcash-methods">',
      '      <!-- METHOD 1: QR CODE VOUCHER -->',
      '      <div class="conf-qr-card" id="conf-qr-trigger" title="Tap to expand QR code">',
      '        <div class="conf-qr-media">',
      '          <img src="/images/gcashref.jpg" alt="GCash Deposit QR Voucher" class="conf-qr-img">',
      '        </div>',
      '        <span class="conf-qr-hint">',
      '          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
      '          <span>Tap QR to enlarge</span>',
      '        </span>',
      '      </div>',
      '      <!-- METHOD 2: DIRECT ACCOUNT & QUICK COPY -->',
      '      <div class="conf-acct-card">',
      '        <div class="acct-data-block">',
      '          <span class="acct-field-label">GCash Mobile Number</span>',
      '          <div class="acct-num-row">',
      '            <strong class="acct-num-display">0995 985 9549</strong>',
      '            <button type="button" class="btn-copy-acct copy-btn" data-copy="09959859549" title="Copy GCash number">',
      '              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      '              <span>Copy</span>',
      '            </button>',
      '          </div>',
      '        </div>',
      '        <div class="acct-data-block">',
      '          <span class="acct-field-label">Account Name</span>',
      '          <strong class="acct-name-display">Kyle B. &bull; K-SoundRentals</strong>',
      '        </div>',
      '        <div class="acct-data-block acct-balance-info">',
      '          <span class="acct-field-label">Remaining Balance on Handover</span>',
      '          <span class="acct-balance-val peso-inline">' + pesoIconSvg(13) + balanceAmt.toLocaleString() + '</span>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <!-- MINIMAL 3-STEP FLOW STRIP -->',
      '    <div class="conf-steps-strip">',
      '      <div class="conf-step-node">',
      '        <span class="conf-step-idx">1</span>',
      '        <span class="conf-step-label">Send <strong>₱500</strong> via GCash</span>',
      '      </div>',
      '      <div class="conf-step-arrow" aria-hidden="true">→</div>',
      '      <div class="conf-step-node">',
      '        <span class="conf-step-idx">2</span>',
      '        <span class="conf-step-label">Save Screenshot</span>',
      '      </div>',
      '      <div class="conf-step-arrow" aria-hidden="true">→</div>',
      '      <div class="conf-step-node">',
      '        <span class="conf-step-idx">3</span>',
      '        <span class="conf-step-label">Send on Messenger</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
      '<!-- PRIMARY ACTION BUTTONS -->',
      '<div class="conf-actions-container">',
      '  <a href="https://m.me/KSoundRentals" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-shine conf-messenger-btn">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.454 5.518 3.734 7.202V22l3.411-1.872c.905.251 1.867.387 2.855.387 5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2zm1.002 12.443-2.56-2.73-4.996 2.73 5.496-5.834 2.624 2.73 4.932-2.73-5.496 5.834z"/></svg>',
      '    <span>Open Messenger & Send Screenshot</span>',
      '  </a>',
      '  <div class="conf-secondary-actions">',
      '    <a href="https://www.facebook.com/KSoundRentals" target="_blank" rel="noopener noreferrer" class="btn btn-outline conf-sub-btn">',
      '      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      '      <span>Facebook Page ↗</span>',
      '    </a>',
      '    <button type="button" id="copy-booking-summary" class="btn btn-outline conf-sub-btn">',
      '      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      '      <span>Copy Reservation Summary</span>',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="conf-new-booking">',
      '  <a href="booking.html" class="conf-reset-link">Make another reservation &rarr;</a>',
      '</div>'
    ].filter(Boolean).join('\n');

    // Attach QR lightbox trigger
    const qrTrigger = document.getElementById('conf-qr-trigger');
    const qrModal = document.getElementById('qr-lightbox-modal');
    if (qrTrigger && qrModal) {
      qrTrigger.addEventListener('click', () => {
        qrModal.style.display = 'flex';
      });
    }
  }

  if (successBox) {
    successBox.style.display = 'block';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const copySummaryBtn = document.getElementById('copy-booking-summary');
  if (copySummaryBtn) {
    copySummaryBtn.onclick = async () => {
      const text = buildBookingSummaryText(bookingData);
      try {
        await navigator.clipboard.writeText(text);
        copySummaryBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style="color:#86efac">✓ Copied</span>';
        setTimeout(() => {
          copySummaryBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy Reservation Summary</span>';
        }, 2200);
      } catch {
        alert(text);
      }
    };
  }
}

async function submitToWeb3Forms(bookingPayload) {
  if (
    !WEB3FORMS_ACCESS_KEY ||
    WEB3FORMS_ACCESS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY_HERE'
  ) {
    return false;
  }

  const gmapsLink =
    bookingPayload.mapLink ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      bookingPayload.address || 'Lapu-Lapu City, Cebu'
    )}`;

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `New Reservation [${bookingPayload.id}]: ${bookingPayload.name} - ${bookingPayload.packageChosen} (${bookingPayload.date})`,
      from_name: 'K-SoundRentals Booking System',
      'Booking Reference': bookingPayload.id,
      'Customer Full Name': bookingPayload.name,
      'Facebook Name': bookingPayload.fbName || 'Not specified',
      'Mobile Phone': bookingPayload.phone,
      'Event Date': bookingPayload.date,
      'Delivery Time': bookingPayload.deliveryTime,
      'Package Chosen': bookingPayload.packageChosen,
      'Delivery Venue Address': bookingPayload.address,
      'Google Maps Location Link': gmapsLink,
      'Deposit Amount Required': `PHP ${bookingPayload.amountDue}`,
      'Messenger Action Required': 'Customer will send ₱500 deposit screenshot to Facebook Page (m.me/KSoundRentals)'
    })
  });

  const data = await response.json();
  return Boolean(data && data.success);
}

// ===================================================
// BREADCRUMBS STEPPER NAVIGATION & VALIDATION
// ===================================================

export function validateStep(stepIndex) {
  const dateInput = document.getElementById('input-date');
  const timeSelect = document.getElementById('delivery-time');
  const pkgSelect = document.getElementById('package-select');
  const addressInput = document.getElementById('input-address');
  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');

  if (stepIndex === 1) {
    let valid = true;
    const calRoot = document.getElementById('calendar-root');
    const chipsGrid = document.querySelector('.time-chips-grid');
    if (calRoot) clearError(calRoot);
    clearError(dateInput);
    if (chipsGrid) clearError(chipsGrid);
    clearError(timeSelect);

    if (!dateInput || !dateInput.value) {
      showError(calRoot || dateInput, 'Select an available date.');
      valid = false;
    } else {
      const [y, m, d] = dateInput.value.split('-').map(Number);
      const chosenDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (chosenDate < today) {
        showError(calRoot || dateInput, 'Date cannot be in the past.');
        valid = false;
      } else if (isBlocked(dateInput.value)) {
        showError(calRoot || dateInput, 'This date is unavailable.');
        valid = false;
      }
    }

    if (!timeSelect || !timeSelect.value) {
      showError(chipsGrid || timeSelect, 'Select a delivery time.');
      valid = false;
    }

    return valid;
  }

  if (stepIndex === 2) {
    clearError(pkgSelect);
    if (!pkgSelect || !pkgSelect.value) {
      showError(pkgSelect, 'Select a package.');
      return false;
    }
    return true;
  }

  if (stepIndex === 3) {
    clearError(addressInput);
    if (!addressInput || !addressInput.value.trim()) {
      showError(addressInput, 'Enter or pin your delivery address.');
      return false;
    }
    return true;
  }

  if (stepIndex === 4) {
    let valid = true;
    const fbInput = document.getElementById('input-fb');
    clearError(nameInput);
    if (fbInput) clearError(fbInput);
    clearError(phoneInput);

    if (!nameInput || !nameInput.value.trim()) {
      showError(nameInput, 'Enter your full name.');
      valid = false;
    }

    if (fbInput && !fbInput.value.trim()) {
      showError(fbInput, 'Enter your Facebook account name.');
      valid = false;
    }

    const phoneVal = (phoneInput?.value || '').trim().replace(/[\s-]/g, '');
    if (!/^09\d{9}$/.test(phoneVal)) {
      showError(phoneInput, 'Enter a valid 11-digit mobile number (09XXXXXXXXX).');
      valid = false;
    }

    return valid;
  }

  return true;
}

export function goToStep(targetStep) {
  if (targetStep < 1 || targetStep > 4 || targetStep === currentStep) return;

  // Validate current step(s) when moving forward
  if (targetStep > currentStep) {
    for (let s = currentStep; s < targetStep; s++) {
      if (!validateStep(s)) {
        return;
      }
    }
  }

  const direction = targetStep > currentStep ? 'forward' : 'backward';
  currentStep = targetStep;
  if (targetStep > maxStepUnlocked) {
    maxStepUnlocked = targetStep;
  }

  // 1. Update Step Panes with directional animation
  const panes = document.querySelectorAll('.wizard-step-pane');
  panes.forEach((pane) => {
    const paneIndex = Number(pane.dataset.stepIndex);
    const isActive = paneIndex === currentStep;
    pane.classList.remove('active', 'step-enter-forward', 'step-enter-backward');
    if (isActive) {
      pane.classList.add(
        'active',
        direction === 'forward' ? 'step-enter-forward' : 'step-enter-backward'
      );
    }
  });

  // 2. Update Breadcrumb Pills with pop animation
  const pills = document.querySelectorAll('.crumb-pill[data-step]');
  pills.forEach((pill) => {
    const s = Number(pill.dataset.step);
    const wasCompleted = pill.classList.contains('completed');
    pill.classList.remove('active', 'completed', 'disabled', 'crumb-pop');

    if (s === currentStep) {
      pill.classList.add('active', 'crumb-pop');
      pill.setAttribute('aria-current', 'step');
    } else if (s < currentStep || s <= maxStepUnlocked) {
      pill.classList.add('completed');
      if (!wasCompleted) {
        pill.classList.add('crumb-pop');
      }
      pill.removeAttribute('aria-current');
    } else {
      pill.classList.add('disabled');
      pill.removeAttribute('aria-current');
    }
  });

  // 3. Update Pure Green Connectors
  const connectors = document.querySelectorAll('.crumb-connector[data-connector]');
  connectors.forEach((conn) => {
    const cIndex = Number(conn.dataset.connector);
    conn.classList.toggle('completed', cIndex < currentStep);
  });

  // 4. Refresh Leaflet map size when entering Step 3
  if (currentStep === 3 && typeof window.refreshVenueMap === 'function') {
    window.refreshVenueMap();
  }

  // 5. Update recap
  updateLiveSummary();
}

export async function handleBooking(event) {
  event.preventDefault();

  for (let s = 1; s <= 4; s++) {
    if (!validateStep(s)) {
      goToStep(s);
      return;
    }
  }

  // Honeypot bot protection
  const honeypot = document.getElementById('booking-hp-trap');
  if (honeypot && honeypot.value.trim() !== '') {
    console.warn('Bot submission blocked via honeypot.');
    return;
  }

  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const fbInput = document.getElementById('input-fb');
  const dateInput = document.getElementById('input-date');
  const addressInput = document.getElementById('input-address');
  const mapLinkInput = document.getElementById('input-map-link');
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');

  const nameVal = nameInput?.value?.trim() || '';
  if (nameVal.length < 2) {
    alert('Please enter your full name.');
    nameInput?.focus();
    return;
  }

  const phoneVal = (phoneInput?.value || '').trim().replace(/[\s-]/g, '');
  const phPhoneRegex = /^(09|\+639)\d{9}$/;
  if (!phPhoneRegex.test(phoneVal)) {
    alert('Please enter a valid 11-digit Philippine mobile number (e.g. 0917 123 4567).');
    phoneInput?.focus();
    return;
  }

  const fbVal = fbInput?.value?.trim() || '';
  if (fbVal.length < 2) {
    alert('Please enter your Facebook account name so we can verify your deposit screenshot.');
    fbInput?.focus();
    return;
  }

  const dateVal = dateInput?.value || '';
  if (!dateVal) {
    alert('Please select an event date on the calendar.');
    goToStep(1);
    return;
  }

  // Double check if date is already booked
  if (typeof isBlocked === 'function' && isBlocked(dateVal)) {
    alert('Sorry, this date is already booked or reserved. Please choose another date on the calendar.');
    goToStep(1);
    return;
  }

  // Device rate limiting / anti-spam cooldown check (120 seconds)
  const LAST_BOOKING_KEY = 'ksound_last_booking_ts';
  const lastBookingTs = Number(localStorage.getItem(LAST_BOOKING_KEY) || 0);
  const now = Date.now();
  const cooldownSecs = 120;
  const elapsedSecs = Math.floor((now - lastBookingTs) / 1000);
  if (lastBookingTs && elapsedSecs < cooldownSecs) {
    alert(`A reservation was recently submitted from this device. Please wait ${cooldownSecs - elapsedSecs}s before submitting another, or message us directly on Facebook.`);
    return;
  }

  const selectedPkg = findPackageByLabel(pkgSelect.value) || PACKAGES.pkg2_12;
  const methodObj = PAYMENT_METHODS[activePaymentChannel] || PAYMENT_METHODS.gcash;
  const amountDue = selectedPkg.deposit;
  const bookingId = 'KS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const addressVal = addressInput.value.trim();
  const mapLinkVal = mapLinkInput?.value?.trim() || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addressVal || 'Lapu-Lapu City'));

  const bookingPayload = {
    id: bookingId,
    name: nameVal,
    fbName: fbVal,
    phone: phoneVal,
    date: dateVal,
    deliveryTime: timeSelect.value,
    packageChosen: pkgSelect.value,
    address: addressVal,
    mapLink: mapLinkVal,
    paymentChannel: methodObj.name,
    paymentTypeLabel: 'Reservation Deposit',
    amountDue,
    referenceNo: ''
  };

  try {
    localStorage.setItem(LAST_BOOKING_KEY, String(Date.now()));
  } catch (e) {}

  const submitBtn = document.querySelector('.wizard-submit-btn');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : 'Reserve';
  if (submitBtn) {
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
  }

  try {
    const web3Sent = await submitToWeb3Forms(bookingPayload).catch(() => false);

    let backendSent = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const response = await fetch(`${API_BASE_URL}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      backendSent = Boolean(result && result.success);
    } catch {
      backendSent = false;
    }

    showBookingConfirmation(bookingPayload, !web3Sent && !backendSent);
  } catch {
    showBookingConfirmation(bookingPayload, true);
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = origBtnHtml;
      submitBtn.disabled = false;
    }
  }
}

function initCopyButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-btn[data-copy]');
    if (!btn) return;
    const valueToCopy = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(valueToCopy);
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 1800);
    } catch {
      alert(`Account number: ${valueToCopy}`);
    }
  });
}

function initBreadcrumbsInteraction() {
  const pills = document.querySelectorAll('.crumb-pill[data-step]');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const target = Number(pill.dataset.step);
      goToStep(target);
    });
  });
}

export function initBookingForm() {
  const form = document.getElementById('booking-stepper-form') || document.querySelector('.booking-form');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const selectedKey = params.get('pkg') || params.get('package');
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');
  const dateInput = document.getElementById('input-date');

  if (pkgSelect) {
    if (selectedKey && PACKAGES[selectedKey]) {
      pkgSelect.value = PACKAGES[selectedKey].label;
    } else if (!pkgSelect.value) {
      pkgSelect.value = PACKAGES.pkg2_12.label;
    }
  }

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const calRoot = document.getElementById('calendar-root');
      if (calRoot) clearError(calRoot);
      clearError(dateInput);
      updateLiveSummary();
    });
  }

  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      const chipsGrid = document.querySelector('.time-chips-grid');
      if (chipsGrid) clearError(chipsGrid);
      clearError(timeSelect);
      updateLiveSummary();
    });
  }

  const watchedInputs = document.querySelectorAll(
    '#input-name, #input-phone, #input-date, #delivery-time, #input-address, #package-select'
  );
  watchedInputs.forEach((input) => {
    input.addEventListener('input', () => {
      clearError(input);
      updateLiveSummary();
    });
    input.addEventListener('change', () => {
      clearError(input);
      updateLiveSummary();
    });
  });

  initInteractiveFormPickers();
  initPaymentFlowControls();
  initBreadcrumbsInteraction();
  updatePickupHelper();
  initCopyButtons();
  updateLiveSummary();

  const qrTrigger = document.getElementById('gcash-qr-trigger');
  const qrModal = document.getElementById('qr-lightbox-modal');
  if (qrTrigger && qrModal) {
    qrTrigger.addEventListener('click', () => {
      qrModal.style.display = 'flex';
    });
  }

  window.copyGCashNumber = function(btn) {
    navigator.clipboard.writeText('09959859549').then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style="color:#22c55e;font-weight:700;">Copied!</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }).catch(() => {
      alert('GCash number: 0995 985 9549');
    });
  };

  window.handleBooking = handleBooking;
  window.goToStep = goToStep;
}
