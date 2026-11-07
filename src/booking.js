// ===================================================
// K-SOUNDRENTALS — Booking, Payment QR & Web3Forms Module
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

let activePaymentChannel = 'gcash';
let activePaymentType = 'deposit'; // 'deposit' | 'full'

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

function updateLivePackageCard() {
  const pkgSelect = document.getElementById('package-select');
  const dateInput = document.getElementById('input-date');
  const timeSelect = document.getElementById('delivery-time');
  const cardEl = document.getElementById('live-package-card');

  if (!cardEl || !pkgSelect) return;

  const selectedPkg = findPackageByLabel(pkgSelect.value);
  const dateVal = dateInput?.value || '';
  const timeVal = timeSelect?.value || '';

  updatePaymentQRWidget(selectedPkg);

  if (!selectedPkg) {
    cardEl.innerHTML = `
      <div class="live-pkg-empty">
        <div class="live-pkg-badge">SELECTED SETUP</div>
        <h4>Select a Package</h4>
        <p>Choose a package and duration to view details.</p>
      </div>
    `;
    return;
  }

  const equipItems = (selectedPkg.equipment || [])
    .map(
      (item) => `
      <li>
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${item}</span>
      </li>`
    )
    .join('');

  cardEl.innerHTML = `
    <div class="live-pkg-active">
      <div class="live-pkg-photo-row">
        <img src="${selectedPkg.image}" alt="${selectedPkg.tier}" class="live-pkg-thumb">
        <div class="live-pkg-title-col">
          <span class="live-pkg-badge">SELECTED SETUP</span>
          <h4>${selectedPkg.tier}</h4>
          <span class="live-pkg-duration">${selectedPkg.durationTag}</span>
        </div>
        <div class="live-pkg-price">
          <small>Rate</small>
          <strong class="peso-inline">${pesoIconSvg(20)}${selectedPkg.price.toLocaleString()}</strong>
        </div>
      </div>

      <ul class="live-pkg-list">
        ${equipItems}
      </ul>

      <div class="live-pkg-meta">
        <div>
          <span>Event Date</span>
          <strong>${dateVal || 'Not selected'}</strong>
        </div>
        <div>
          <span>Delivery Time</span>
          <strong>${timeVal || 'Not selected'}</strong>
        </div>
        <div>
          <span>Deposit</span>
          <strong class="peso-inline text-orange">${pesoIconSvg(13)}${selectedPkg.deposit}</strong>
        </div>
      </div>
    </div>
  `;
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

  const amountDue = activePaymentType === 'full' ? pkg.price : pkg.deposit;

  if (qrImg) {
    qrImg.src = method.qrImage;
    qrImg.alt = `${method.name} QR Code`;
  }
  if (channelLabel) channelLabel.textContent = method.name;
  if (acctNumberEl) acctNumberEl.textContent = method.accountNumber;
  if (acctNameEl) acctNameEl.textContent = method.accountName;
  if (copyBtn) copyBtn.setAttribute('data-copy', method.rawNumber);
  if (amountDueEl) {
    amountDueEl.innerHTML = `${pesoIconSvg(18)}${amountDue.toLocaleString()}`;
  }
}

function initPaymentFlowControls() {
  const channelBtns = document.querySelectorAll('.pay-channel-btn[data-channel]');
  const typeBtns = document.querySelectorAll('.pay-type-btn[data-paytype]');

  channelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activePaymentChannel = btn.dataset.channel;
      channelBtns.forEach((b) => {
        const isMatch = b.dataset.channel === activePaymentChannel;
        b.classList.toggle('active', isMatch);
        b.setAttribute('aria-pressed', String(isMatch));
      });
      updatePaymentQRWidget();
    });
  });

  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activePaymentType = btn.dataset.paytype;
      typeBtns.forEach((b) => {
        const isMatch = b.dataset.paytype === activePaymentType;
        b.classList.toggle('active', isMatch);
        b.setAttribute('aria-pressed', String(isMatch));
      });
      updatePaymentQRWidget();
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

  const initialPkg = pkgSelect ? findPackageByLabel(pkgSelect.value) : null;
  if (initialPkg) {
    activeDuration = initialPkg.durationHours;
    activeTier = initialPkg.tier;
  }

  function applyPackageSelection(tier, hours) {
    const match = Object.values(PACKAGES).find(
      (p) => p.tier === tier && p.durationHours === Number(hours)
    );
    if (match && pkgSelect) {
      pkgSelect.value = match.label;
      pkgSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (durBtns.length) {
    durBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeDuration = Number(btn.dataset.hours);
        updateTierCardPrices(activeDuration);

        const currentPkg = pkgSelect ? findPackageByLabel(pkgSelect.value) : null;
        const tierToUse = currentPkg ? currentPkg.tier : activeTier;
        applyPackageSelection(tierToUse, activeDuration);
      });
    });
  }

  if (tierCards.length) {
    tierCards.forEach((card) => {
      card.addEventListener('click', () => {
        activeTier = card.dataset.tier;
        applyPackageSelection(activeTier, activeDuration);
      });
    });
  }

  if (timeChips.length && timeSelect) {
    timeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        timeSelect.value = chip.dataset.time;
        timeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }
}

export function updatePickupHelper() {
  const pkgSelect = document.getElementById('package-select');
  const timeSelect = document.getElementById('delivery-time');
  const helperEl = document.getElementById('pickup-helper');

  syncVisualWidgetsFromInputs();
  updateLivePackageCard();

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
    <span>Estimated Pickup: <strong>${formattedEnd}${
      nextDay ? ' (next day)' : ' (same day)'
    }</strong> &bull; ${pkg.durationHours}-hr rental</span>
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
    `Payment Method: ${data.paymentChannel} (${data.paymentTypeLabel} - ₱${data.amountDue.toLocaleString()})`,
    data.referenceNo ? `Reference No: ${data.referenceNo}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

export function saveBookingLocally(bookingData) {
  try {
    const list = JSON.parse(localStorage.getItem('ksound_bookings') || '[]');
    const newEntry = {
      id: 'KS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toLocaleString(),
      ...bookingData
    };
    list.unshift(newEntry);
    localStorage.setItem('ksound_bookings', JSON.stringify(list.slice(0, 50)));
  } catch {}
}

function showBookingConfirmation(bookingData, isOfflineFallback = false) {
  const formCard = document.getElementById('booking-form-card');
  const successBox = document.getElementById('success-message');
  const summaryEl = document.getElementById('booking-summary');
  const statusBanner = document.getElementById('booking-status-banner');

  blockDateLocally(bookingData.date);
  saveBookingLocally(bookingData);

  if (formCard) formCard.style.display = 'none';
  if (successBox) {
    successBox.style.display = 'block';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (statusBanner) {
    if (isOfflineFallback) {
      statusBanner.style.display = 'block';
      statusBanner.className = 'status-banner offline';
      statusBanner.innerHTML = `
        <strong>Saved Locally:</strong> Copy your summary below and send it with your payment screenshot via Messenger.
      `;
    } else {
      statusBanner.style.display = 'none';
    }
  }

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-grid">
        <div><span>Name:</span> <strong>${bookingData.name}</strong></div>
        <div><span>Contact:</span> <strong>${bookingData.phone}</strong></div>
        <div><span>Event Date:</span> <strong>${bookingData.date}</strong></div>
        <div><span>Delivery Time:</span> <strong>${bookingData.deliveryTime}</strong></div>
        <div><span>Package:</span> <strong>${bookingData.packageChosen}</strong></div>
        <div><span>Address:</span> <strong>${bookingData.address}</strong></div>
        ${
          bookingData.mapLink
            ? `<div><span>Map Pin:</span> <a href="${bookingData.mapLink}" target="_blank" rel="noopener noreferrer" class="text-orange">View Google Maps Pin &nearr;</a></div>`
            : ''
        }
        <div><span>Payment:</span> <strong>${bookingData.paymentChannel} &bull; ${bookingData.paymentTypeLabel} (₱${bookingData.amountDue.toLocaleString()})</strong></div>
        ${
          bookingData.referenceNo
            ? `<div><span>Ref No.:</span> <strong class="text-orange">${bookingData.referenceNo}</strong></div>`
            : ''
        }
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
        copySummaryBtn.textContent = '✓ Copied!';
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
      payment_option: `${bookingPayload.paymentTypeLabel} (PHP ${bookingPayload.amountDue})`,
      payment_reference: bookingPayload.referenceNo || 'To follow via Messenger'
    })
  });

  const data = await response.json();
  return Boolean(data && data.success);
}

export async function handleBooking(e) {
  e.preventDefault();

  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const dateInput = document.getElementById('input-date');
  const addressInput = document.getElementById('input-address');
  const mapLinkInput = document.getElementById('input-map-link');
  const refInput = document.getElementById('input-pay-ref');
  const pkgSelect = document.getElementById('package-select');
  const timeSelect =
    document.getElementById('delivery-time') ||
    document.querySelector('.booking-form select');

  [nameInput, phoneInput, dateInput, timeSelect, addressInput, pkgSelect].forEach(
    clearError
  );

  let valid = true;

  if (!nameInput.value.trim()) {
    showError(nameInput, 'Enter your full name.');
    valid = false;
  }

  const phoneVal = phoneInput.value.trim().replace(/[\s-]/g, '');
  if (!/^09\d{9}$/.test(phoneVal)) {
    showError(phoneInput, 'Enter a valid 11-digit PH number starting with 09.');
    valid = false;
  }

  if (!dateInput.value) {
    showError(dateInput, 'Select an event date.');
    valid = false;
  } else {
    const [y, m, d] = dateInput.value.split('-').map(Number);
    const chosenDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (chosenDate < today) {
      showError(dateInput, 'Event date cannot be in the past.');
      valid = false;
    } else if (isBlocked(dateInput.value)) {
      showError(dateInput, 'This date is unavailable.');
      valid = false;
    }
  }

  if (!timeSelect.value) {
    showError(timeSelect, 'Select a delivery time.');
    valid = false;
  }

  if (!pkgSelect.value) {
    showError(pkgSelect, 'Select a package.');
    valid = false;
  }

  if (!addressInput.value.trim()) {
    showError(addressInput, 'Enter or pin your event address.');
    valid = false;
  }

  if (!valid) return;

  const selectedPkg = findPackageByLabel(pkgSelect.value) || PACKAGES.pkg2_12;
  const methodObj = PAYMENT_METHODS[activePaymentChannel] || PAYMENT_METHODS.gcash;
  const amountDue =
    activePaymentType === 'full' ? selectedPkg.price : selectedPkg.deposit;

  const bookingPayload = {
    name: nameInput.value.trim(),
    phone: phoneVal,
    date: dateInput.value,
    deliveryTime: timeSelect.value,
    packageChosen: pkgSelect.value,
    address: addressInput.value.trim(),
    mapLink: mapLinkInput?.value?.trim() || '',
    paymentChannel: methodObj.name,
    paymentTypeLabel:
      activePaymentType === 'full' ? 'Full Payment' : 'Reservation Deposit',
    amountDue,
    referenceNo: refInput?.value?.trim() || ''
  };

  const submitBtn = document.querySelector('.booking-form button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : 'Send Reservation Request';
  if (submitBtn) {
    submitBtn.textContent = 'Processing Booking...';
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

export function initBookingForm() {
  const form = document.querySelector('.booking-form');
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

  const watchedInputs = document.querySelectorAll(
    '#input-name, #input-phone, #input-date, #delivery-time, #input-address, #package-select'
  );
  watchedInputs.forEach((input) => {
    input.addEventListener('input', () => clearError(input));
    input.addEventListener('change', () => clearError(input));
  });

  if (pkgSelect) pkgSelect.addEventListener('change', updatePickupHelper);
  if (timeSelect) timeSelect.addEventListener('change', updatePickupHelper);
  if (dateInput) dateInput.addEventListener('change', updateLivePackageCard);

  initInteractiveFormPickers();
  initPaymentFlowControls();
  updatePickupHelper();
  initCopyButtons();

  window.handleBooking = handleBooking;
}
