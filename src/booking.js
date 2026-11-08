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
  const recapPkgEl = document.getElementById('recap-pkg');
  const recapPriceEl = document.getElementById('recap-price');

  if (recapDateTimeEl) {
    if (dateVal) {
      const [y, m, d] = dateVal.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const shortDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      recapDateTimeEl.textContent = timeVal ? `${shortDate} • ${timeVal}` : shortDate;
    } else {
      recapDateTimeEl.textContent = '—';
    }
  }

  if (recapPkgEl && selectedPkg) {
    recapPkgEl.textContent = `${selectedPkg.tier} (${selectedPkg.durationHours}h)`;
  }

  if (recapPriceEl && selectedPkg) {
    recapPriceEl.innerHTML = `${pesoIconSvg(14)}${selectedPkg.price.toLocaleString()}`;
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

  if (contentEl) {
    contentEl.innerHTML = [
      '<div class="conf-hero">',
      '  <div class="conf-badge-pulse">',
      '    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"/></svg>',
      '  </div>',
      '  <h3>Reservation Received!</h3>',
      '  <p class="conf-subtitle">',
      '    Your setup is on hold. Complete your <strong>₱500 GCash deposit</strong> below and send your screenshot on Messenger to lock your date.',
      '  </p>',
      '</div>',
      '<!-- MODERN MINIMALIST GLASS ORDER CARD -->',
      '<div class="conf-glass-card">',
      '  <div class="conf-card-header">',
      '    <div class="conf-ref-pill">',
      '      <span>REF #</span>',
      '      <strong>' + (bookingData.id || 'CONFIRMED') + '</strong>',
      '    </div>',
      '    <span class="conf-status-tag">Pending Deposit</span>',
      '  </div>',
      '  <div class="conf-summary-grid">',
      '    <div class="conf-grid-item">',
      '      <small>Schedule</small>',
      '      <strong>' + formattedDate + ' &bull; ' + bookingData.deliveryTime + '</strong>',
      '    </div>',
      '    <div class="conf-grid-item">',
      '      <small>Package</small>',
      '      <strong>' + bookingData.packageChosen + '</strong>',
      '    </div>',
      '    <div class="conf-grid-item">',
      '      <small>Customer</small>',
      '      <strong>' + bookingData.name + ' (<a href="tel:' + bookingData.phone + '">' + bookingData.phone + '</a>)</strong>',
      '    </div>',
      '    <div class="conf-grid-item">',
      '      <small>Facebook Name</small>',
      '      <strong class="conf-fb-val">',
      '        <svg viewBox="0 0 24 24" width="13" height="13" fill="#0084ff"><path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.454 5.518 3.734 7.202V22l3.411-1.872c.905.251 1.867.387 2.855.387 5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2zm1.002 12.443-2.56-2.73-4.996 2.73 5.496-5.834 2.624 2.73 4.932-2.73-5.496 5.834z"/></svg>',
      '        <span>' + (bookingData.fbName || '—') + '</span>',
      '      </strong>',
      '    </div>',
      '    <div class="conf-grid-item full-width">',
      '      <small>Delivery Venue</small>',
      '      <strong>' + bookingData.address + '</strong>',
      bookingData.mapLink ? '      <a href="' + bookingData.mapLink + '" target="_blank" rel="noopener noreferrer" class="conf-pin-link">📍 View Pinned Location &nearr;</a>' : '',
      '    </div>',
      '  </div>',
      '  <div class="conf-pricing-breakdown">',
      '    <div class="conf-price-row">',
      '      <span>Total Rental Rate</span>',
      '      <strong>₱' + totalPrice.toLocaleString() + '</strong>',
      '    </div>',
      '    <div class="conf-price-row deposit-highlight">',
      '      <span>Deposit to Lock Date</span>',
      '      <strong class="text-orange">₱' + depositAmt.toLocaleString() + '</strong>',
      '    </div>',
      '    <div class="conf-price-row balance-sub">',
      '      <span>Remaining Balance Upon Handover</span>',
      '      <small>₱' + balanceAmt.toLocaleString() + '</small>',
      '    </div>',
      '  </div>',
      '</div>',
      '<!-- INSTRUCTIONS TO SEND PROOF TO FACEBOOK PAGE -->',
      '<div class="conf-instructions-card">',
      '  <div class="conf-instructions-head">',
      '    <div class="instructions-badge">',
      '      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.454 5.518 3.734 7.202V22l3.411-1.872c.905.251 1.867.387 2.855.387 5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2zm1.002 12.443-2.56-2.73-4.996 2.73 5.496-5.834 2.624 2.73 4.932-2.73-5.496 5.834z"/></svg>',
      '      <span>Next Step: Send Proof to Our Facebook Page</span>',
      '    </div>',
      '    <span class="instructions-action-pill">Final Step</span>',
      '  </div>',
      '  <div class="conf-steps-list">',
      '    <div class="conf-step-item">',
      '      <span class="step-num">1</span>',
      '      <div class="step-desc">',
      '        <strong>Send ₱' + depositAmt.toLocaleString() + ' Deposit via GCash</strong>',
      '        <span>Scan the QR code or use the account number below.</span>',
      '      </div>',
      '    </div>',
      '    <div class="conf-step-item">',
      '      <span class="step-num">2</span>',
      '      <div class="step-desc">',
      '        <strong>Take a Screenshot of Payment</strong>',
      '        <span>Save your GCash transaction confirmation receipt.</span>',
      '      </div>',
      '    </div>',
      '    <div class="conf-step-item">',
      '      <span class="step-num">3</span>',
      '      <div class="step-desc">',
      '        <strong>Message Our Facebook Page (<a href="https://m.me/KSoundRentals" target="_blank" rel="noopener noreferrer" class="link-orange">m.me/KSoundRentals</a>)</strong>',
      '        <span>Send the screenshot and your reference code (<strong>#' + (bookingData.id || 'CONFIRMED') + '</strong>) so we can instantly verify and lock your slot!</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
      '<!-- SLEEK DEDICATED GCASH DEPOSIT SECTION -->',
      '<div class="conf-gcash-card">',
      '  <div class="conf-gcash-head">',
      '    <div class="conf-gcash-badge">GCash</div>',
      '    <div class="conf-gcash-amt">',
      '      <small>Deposit Amount</small>',
      '      <strong class="text-orange">₱' + depositAmt.toLocaleString() + '</strong>',
      '    </div>',
      '  </div>',
      '  <div class="conf-gcash-body">',
      '    <div class="conf-qr-preview-wrap" id="conf-qr-trigger" title="Tap to expand QR code">',
      '      <img src="/images/gcashref.jpg" alt="GCash Deposit QR" class="conf-qr-thumb">',
      '      <span class="conf-qr-zoom-tag">',
      '        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
      '        <span>Tap to zoom</span>',
      '      </span>',
      '    </div>',
      '    <div class="conf-acct-info">',
      '      <div class="conf-acct-box">',
      '        <small>GCash Mobile Number</small>',
      '        <strong class="conf-acct-num">0995 985 9549</strong>',
      '        <span class="conf-acct-name">Kyle B. (K-SoundRentals)</span>',
      '      </div>',
      '      <button type="button" class="btn-micro copy-btn conf-acct-copy" data-copy="09959859549">',
      '        Copy Number',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>',
      '<!-- ACTIONS CONTAINER -->',
      '<div class="conf-actions-container">',
      '  <a href="https://m.me/KSoundRentals" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-shine conf-messenger-btn">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.454 5.518 3.734 7.202V22l3.411-1.872c.905.251 1.867.387 2.855.387 5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2zm1.002 12.443-2.56-2.73-4.996 2.73 5.496-5.834 2.624 2.73 4.932-2.73-5.496 5.834z"/></svg>',
      '    <span>Open Messenger & Send Screenshot</span>',
      '  </a>',
      '  <button type="button" id="copy-booking-summary" class="btn btn-outline conf-copy-btn">',
      '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      '    <span>Copy Reservation Summary</span>',
      '  </button>',
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

  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const fbInput = document.getElementById('input-fb');
  const dateInput = document.getElementById('input-date');
  const addressInput = document.getElementById('input-address');
  const mapLinkInput = document.getElementById('input-map-link');
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');

  const selectedPkg = findPackageByLabel(pkgSelect.value) || PACKAGES.pkg2_12;
  const methodObj = PAYMENT_METHODS[activePaymentChannel] || PAYMENT_METHODS.gcash;
  const amountDue = selectedPkg.deposit;
  const phoneVal = phoneInput.value.trim().replace(/[\s-]/g, '');
  const bookingId = 'KS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const addressVal = addressInput.value.trim();
  const mapLinkVal = mapLinkInput?.value?.trim() || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addressVal || 'Lapu-Lapu City'));

  const bookingPayload = {
    id: bookingId,
    name: nameInput.value.trim(),
    fbName: fbInput?.value?.trim() || '',
    phone: phoneVal,
    date: dateInput.value,
    deliveryTime: timeSelect.value,
    packageChosen: pkgSelect.value,
    address: addressVal,
    mapLink: mapLinkVal,
    paymentChannel: methodObj.name,
    paymentTypeLabel: 'Reservation Deposit',
    amountDue,
    referenceNo: ''
  };

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

  window.handleBooking = handleBooking;
  window.goToStep = goToStep;
}
