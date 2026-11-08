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

  const amountDue = pkg.deposit; // Strictly ₱200 reservation deposit

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
  return [
    'K-SoundRentals Booking Summary',
    `Name: ${data.name}`,
    `Contact: ${data.phone}`,
    `Event Date: ${data.date}`,
    `Delivery Time: ${data.deliveryTime}`,
    `Package: ${data.packageChosen}`,
    `Address: ${data.address}`,
    data.mapLink ? `Map Pin: ${data.mapLink}` : null,
    `Deposit Channel: ${data.paymentChannel} (₱${data.amountDue.toLocaleString()} Deposit)`
  ]
    .filter(Boolean)
    .join('\n');
}

function showBookingConfirmation(bookingData, isOfflineFallback = false) {
  const formCard = document.getElementById('booking-form-card');
  const successBox = document.getElementById('success-message');
  const summaryEl = document.getElementById('booking-summary');
  const statusBanner = document.getElementById('booking-status-banner');
  const stepperBar = document.querySelector('.booking-breadcrumbs-wrap');

  blockDateLocally(bookingData.date);
  saveBookingToDB(bookingData);

  if (formCard) formCard.style.display = 'none';
  if (stepperBar) stepperBar.style.display = 'none';
  if (successBox) {
    successBox.style.display = 'block';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (statusBanner) {
    statusBanner.style.display = 'none';
  }

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-grid">
        <div><span>Name:</span> <strong>${bookingData.name}</strong></div>
        <div><span>Contact:</span> <strong>${bookingData.phone}</strong></div>
        <div><span>Schedule:</span> <strong>${bookingData.date} &bull; ${bookingData.deliveryTime}</strong></div>
        <div><span>Package:</span> <strong>${bookingData.packageChosen}</strong></div>
        <div><span>Address:</span> <strong>${bookingData.address}</strong></div>
        ${
          bookingData.mapLink
            ? `<div><span>Map Pin:</span> <a href="${bookingData.mapLink}" target="_blank" rel="noopener noreferrer" class="text-orange">Open Maps Pin &nearr;</a></div>`
            : ''
        }
        <div><span>Deposit:</span> <strong>₱${bookingData.amountDue.toLocaleString()} via ${bookingData.paymentChannel}</strong></div>
      </div>
    `;
  }

  const copySummaryBtn = document.getElementById('copy-booking-summary');
  if (copySummaryBtn) {
    copySummaryBtn.onclick = async () => {
      const text = buildBookingSummaryText(bookingData);
      try {
        await navigator.clipboard.writeText(text);
        const orig = copySummaryBtn.innerHTML;
        copySummaryBtn.textContent = '✓ Copied';
        setTimeout(() => {
          copySummaryBtn.innerHTML = orig;
        }, 2000);
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

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `K-SoundRentals Booking: ${bookingPayload.packageChosen} (${bookingPayload.date})`,
      from_name: 'K-SoundRentals Booking System',
      name: bookingPayload.name,
      phone: bookingPayload.phone,
      event_date: bookingPayload.date,
      delivery_time: bookingPayload.deliveryTime,
      package: bookingPayload.packageChosen,
      address: bookingPayload.address,
      google_maps_pin: bookingPayload.mapLink || 'Not pinned',
      payment_method: bookingPayload.paymentChannel,
      payment_option: `Reservation Deposit (PHP ${bookingPayload.amountDue})`,
      payment_reference: 'Sent via Messenger'
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
    clearError(nameInput);
    clearError(phoneInput);

    if (!nameInput || !nameInput.value.trim()) {
      showError(nameInput, 'Enter your full name.');
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
  const dateInput = document.getElementById('input-date');
  const addressInput = document.getElementById('input-address');
  const mapLinkInput = document.getElementById('input-map-link');
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');

  const selectedPkg = findPackageByLabel(pkgSelect.value) || PACKAGES.pkg2_12;
  const methodObj = PAYMENT_METHODS[activePaymentChannel] || PAYMENT_METHODS.gcash;
  const amountDue = selectedPkg.deposit;
  const phoneVal = phoneInput.value.trim().replace(/[\s-]/g, '');

  const bookingPayload = {
    name: nameInput.value.trim(),
    phone: phoneVal,
    date: dateInput.value,
    deliveryTime: timeSelect.value,
    packageChosen: pkgSelect.value,
    address: addressInput.value.trim(),
    mapLink: mapLinkInput?.value?.trim() || '',
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

  window.handleBooking = handleBooking;
  window.goToStep = goToStep;
}
