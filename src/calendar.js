// ===================================================
// K-SOUNDRENTALS — Availability Calendar Module
// ===================================================

import {
  getBlockedDatesFromDB,
  syncBlockedDateToDB,
  getBookingsFromDB,
  cancelBookingInDB,
  reactivateBookingInDB,
  updateBookingStatusInDB,
  deleteBookingFromDB,
  isSupabaseConfigured,
  adminSignIn,
  adminSignOut,
  getAdminSession
} from './db.js';
import { findPackageByLabel, pesoIconSvg } from './packages.js';

let isAdmin = false;
let selectedDate = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let blockedDates = [];

export function getBlockedDates() {
  return blockedDates;
}

export function isBlocked(dateStr) {
  return blockedDates.includes(dateStr);
}

export async function blockDateLocally(dateStr) {
  if (!dateStr) return;
  if (!blockedDates.includes(dateStr)) {
    blockedDates.push(dateStr);
    renderCalendar(currentYear, currentMonth);
    await syncBlockedDateToDB(dateStr, true);
  }
}

export async function syncBlockedDatesFromServer() {
  try {
    blockedDates = await getBlockedDatesFromDB();
    renderCalendar(currentYear, currentMonth);
  } catch (err) {
    console.error('[K-SoundRentals] Calendar sync error:', err);
  }
}

export async function toggleBlock(dateStr) {
  const idx = blockedDates.indexOf(dateStr);
  const willBlock = idx === -1;

  if (willBlock) {
    blockedDates.push(dateStr);
  } else {
    blockedDates.splice(idx, 1);
  }

  renderCalendar(currentYear, currentMonth);
  await syncBlockedDateToDB(dateStr, willBlock);
}

export function renderCalendar(year, month) {
  currentYear = year;
  currentMonth = month;

  const root = document.getElementById('calendar-root');
  if (!root) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  let html = `
    <div class="cal-nav">
      <button type="button" class="cal-nav-btn" onclick="renderCalendar(${prevYear}, ${prevMonth})" aria-label="Previous Month">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <strong class="cal-month-title">${monthNames[month]} ${year}</strong>
      <button type="button" class="cal-nav-btn" onclick="renderCalendar(${nextYear}, ${nextMonth})" aria-label="Next Month">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="cal-grid">
      <div class="cal-day-name">Su</div>
      <div class="cal-day-name">Mo</div>
      <div class="cal-day-name">Tu</div>
      <div class="cal-day-name">We</div>
      <div class="cal-day-name">Th</div>
      <div class="cal-day-name">Fr</div>
      <div class="cal-day-name">Sa</div>
  `;

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const thisDate = new Date(year, month, d);
    const isPast = thisDate < today;
    const blocked = isBlocked(dateStr);
    const isSelected = dateStr === selectedDate;

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    else if (isSelected) cls += ' selected-day';
    else if (blocked) cls += ' blocked';

    let clickFn = '';
    if (!isPast) {
      if (isAdmin) {
        clickFn = `onclick="toggleBlock('${dateStr}')"`;
      } else if (!blocked) {
        clickFn = `onclick="selectDate('${dateStr}')"`;
      }
    }

    html += `<div class="${cls}" ${clickFn}>${d}</div>`;
  }

  html += `</div>`;
  root.innerHTML = html;
}

export function selectDate(dateStr) {
  selectedDate = dateStr;
  renderCalendar(currentYear, currentMonth);

  // Immediately populate #input-date in the split-screen booking form!
  const dateInput =
    document.getElementById('input-date') || document.getElementById('event-date');

  if (dateInput) {
    dateInput.value = dateStr;
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    dateInput.classList.add('input-pulse');
    setTimeout(() => {
      dateInput.classList.remove('input-pulse');
    }, 1000);
  }
}

export function useSelectedDate() {
  if (!selectedDate) {
    alert('Please tap an available date on the calendar first.');
    return;
  }
  selectDate(selectedDate);
  const modal = document.getElementById('calendar-modal');
  if (modal) modal.style.display = 'none';
}

export async function getSavedBookings() {
  return await getBookingsFromDB();
}

export async function deleteSavedBooking(id) {
  if (!confirm('Permanently delete this reservation record from Supabase?')) return;
  await deleteBookingFromDB(id);
  await renderAdminLedger();
}

export async function cancelSavedBooking(id, dateStr) {
  if (!confirm(`Cancel this reservation? This will reopen ${dateStr} on the Supabase calendar.`)) return;
  await cancelBookingInDB(id, dateStr);
  await syncBlockedDatesFromServer();
  await renderAdminLedger();
}

export async function reactivateSavedBooking(id, dateStr) {
  await reactivateBookingInDB(id, dateStr);
  await syncBlockedDatesFromServer();
  await renderAdminLedger();
}

export function clearAllSavedBookings() {
  alert('Bookings are stored strictly in Supabase. Delete individual records or manage them in your Supabase dashboard.');
}

export async function exportBookingsCsv() {
  const bookings = await getSavedBookings();
  if (bookings.length === 0) {
    alert('No bookings to export.');
    return;
  }

  const headers = ['ID', 'Status', 'Date', 'Time', 'Customer', 'Phone', 'Package', 'Amount', 'Payment', 'RefNo', 'Address', 'MapLink', 'Created'];
  const rows = bookings.map((b) => [
    b.id || '',
    b.status || 'confirmed',
    b.date || '',
    b.deliveryTime || b.delivery_time || '',
    `"${(b.name || '').replace(/"/g, '""')}"`,
    b.phone || '',
    `"${(b.packageChosen || b.package || '').replace(/"/g, '""')}"`,
    b.amountDue || b.amount_due || '',
    `"${(b.paymentChannel || b.payment_channel || '')} - ${(b.paymentTypeLabel || b.payment_type || '')}"`,
    b.referenceNo || b.reference_no || '',
    `"${(b.address || '').replace(/"/g, '""')}"`,
    b.mapLink || b.map_link || '',
    b.createdAt || b.created_at || ''
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ksound-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const BOOKING_STATUSES = {
  pending_deposit: {
    key: 'pending_deposit',
    label: 'Pending Deposit',
    shortLabel: 'Pending',
    badgeClass: 'status-pending',
    nextAction: 'Verify ₱500 Deposit',
    nextStatus: 'deposit_verified',
    nextIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
  },
  deposit_verified: {
    key: 'deposit_verified',
    label: 'Deposit Verified',
    shortLabel: 'Verified',
    badgeClass: 'status-verified',
    nextAction: 'Mark Out for Delivery',
    nextStatus: 'out_for_delivery',
    nextIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
  },
  out_for_delivery: {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    shortLabel: 'In Transit',
    badgeClass: 'status-transit',
    nextAction: 'Mark Completed',
    nextStatus: 'completed',
    nextIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    shortLabel: 'Completed',
    badgeClass: 'status-completed',
    nextAction: null,
    nextStatus: null,
    nextIcon: null
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    badgeClass: 'status-cancelled',
    nextAction: 'Reactivate Booking',
    nextStatus: 'deposit_verified',
    nextIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
  }
};

export function normalizeBookingStatus(status) {
  if (!status) return 'pending_deposit';
  const s = String(status).toLowerCase().trim();
  if (s === 'confirmed' || s === 'deposit_verified' || s === 'verified') return 'deposit_verified';
  if (s === 'out_for_delivery' || s === 'transit' || s === 'in_transit') return 'out_for_delivery';
  if (s === 'completed' || s === 'done') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'pending' || s === 'pending_deposit') return 'pending_deposit';
  return 'pending_deposit';
}

let currentLedgerFilter = 'all';
let currentSearchQuery = '';
let cachedBookings = [];

export function setLedgerFilter(filter) {
  currentLedgerFilter = filter;
  document.querySelectorAll('.filter-pill').forEach((p) => {
    p.classList.toggle('active', p.dataset.filter === filter);
  });
  renderFilteredBookingsList();
}

export function filterAdminLedger() {
  const searchInput = document.getElementById('admin-search-input');
  currentSearchQuery = (searchInput?.value || '').trim().toLowerCase();
  renderFilteredBookingsList();
}

function updateAdminAnalytics(bookings) {
  const normalized = bookings.map((b) => ({
    ...b,
    normStatus: normalizeBookingStatus(b.status)
  }));

  const counts = {
    all: normalized.length,
    pending_deposit: normalized.filter((b) => b.normStatus === 'pending_deposit').length,
    deposit_verified: normalized.filter((b) => b.normStatus === 'deposit_verified').length,
    out_for_delivery: normalized.filter((b) => b.normStatus === 'out_for_delivery').length,
    completed: normalized.filter((b) => b.normStatus === 'completed').length,
    cancelled: normalized.filter((b) => b.normStatus === 'cancelled').length
  };

  // Update filter pill counts
  const countAll = document.getElementById('count-all');
  const countPending = document.getElementById('count-pending');
  const countVerified = document.getElementById('count-verified');
  const countTransit = document.getElementById('count-transit');
  const countCompleted = document.getElementById('count-completed');
  const countCancelled = document.getElementById('count-cancelled');

  if (countAll) countAll.textContent = counts.all;
  if (countPending) countPending.textContent = counts.pending_deposit;
  if (countVerified) countVerified.textContent = counts.deposit_verified;
  if (countTransit) countTransit.textContent = counts.out_for_delivery;
  if (countCompleted) countCompleted.textContent = counts.completed;
  if (countCancelled) countCancelled.textContent = counts.cancelled;

  const activeBookings = normalized.filter((b) => b.normStatus !== 'cancelled');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const upcoming = activeBookings
    .filter((b) => b.date && b.date >= todayStr && b.normStatus !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalContractValue = 0;
  const pkgCounts = {};

  activeBookings.forEach((b) => {
    const pkg = findPackageByLabel(b.packageChosen || b.package);
    const rate = pkg ? pkg.price : (Number(b.amountDue || b.amount_due) || 1299);
    totalContractValue += rate;
    const tier = pkg ? pkg.tier : (b.packageChosen || b.package || 'Full Karaoke');
    pkgCounts[tier] = (pkgCounts[tier] || 0) + 1;
  });

  let topPkgName = 'None';
  let maxCount = 0;
  for (const [tier, count] of Object.entries(pkgCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topPkgName = tier;
    }
  }

  const elTotal = document.getElementById('stat-total-bookings');
  const elSubTotal = document.getElementById('stat-sub-bookings');
  const elUpcoming = document.getElementById('stat-upcoming');
  const elSubUpcoming = document.getElementById('stat-sub-upcoming');
  const elContract = document.getElementById('stat-contract-val');
  const elTopPkg = document.getElementById('stat-top-pkg');
  const elSubTopPkg = document.getElementById('stat-sub-top-pkg');

  if (elTotal) elTotal.textContent = counts.all;
  if (elSubTotal) {
    elSubTotal.textContent = `${counts.pending_deposit} pending • ${counts.deposit_verified} verified • ${counts.completed} completed`;
  }
  if (elUpcoming) elUpcoming.textContent = upcoming.length;
  if (elSubUpcoming) {
    elSubUpcoming.textContent = upcoming.length
      ? `Next: ${new Date(upcoming[0].date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'No upcoming events';
  }
  if (elContract) elContract.innerHTML = `<span class="peso-inline">${pesoIconSvg(22)}${totalContractValue.toLocaleString()}</span>`;
  if (elTopPkg) elTopPkg.textContent = topPkgName;
  if (elSubTopPkg) elSubTopPkg.textContent = maxCount > 0 ? `${maxCount} reservations` : 'Awaiting bookings';
}

function renderFilteredBookingsList() {
  const container = document.getElementById('admin-bookings-list');
  if (!container) return;

  let list = cachedBookings.map((b) => ({
    ...b,
    normStatus: normalizeBookingStatus(b.status)
  }));

  if (currentLedgerFilter !== 'all') {
    list = list.filter((b) => b.normStatus === currentLedgerFilter);
  }

  if (currentSearchQuery) {
    const q = currentSearchQuery;
    list = list.filter((b) => {
      const statusMeta = BOOKING_STATUSES[b.normStatus] || {};
      return (
        (b.id || '').toLowerCase().includes(q) ||
        (b.name || '').toLowerCase().includes(q) ||
        (b.phone || '').includes(q) ||
        (b.fb_name || b.fbName || '').toLowerCase().includes(q) ||
        (b.packageChosen || b.package || '').toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q) ||
        (statusMeta.label || '').toLowerCase().includes(q)
      );
    });
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="admin-ledger-empty">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>No reservations match this filter.</p>
      </div>
    `;
    return;
  }

  const cardsHtml = list
    .map((b) => {
      const st = BOOKING_STATUSES[b.normStatus] || BOOKING_STATUSES.pending_deposit;
      const isCancelled = b.normStatus === 'cancelled';
      const isCompleted = b.normStatus === 'completed';
      const pkg = findPackageByLabel(b.packageChosen || b.package);
      const pkgLabel = pkg ? `${pkg.tier} (${pkg.durationTag})` : (b.packageChosen || b.package || 'Full Karaoke');
      const pkgRate = pkg ? `<span class="peso-inline">${pesoIconSvg(13)}${pkg.price.toLocaleString()}</span>` : (b.amountDue || b.amount_due ? `<span class="peso-inline">${pesoIconSvg(13)}${Number(b.amountDue || b.amount_due).toLocaleString()}</span>` : `<span class="peso-inline">${pesoIconSvg(13)}1,299</span>`);
      const mapUrl = b.map_link || b.mapLink || b.map_url || b.mapUrl;
      const fbName = b.fb_name || b.fbName;
      const deliveryTime = b.delivery_time || b.deliveryTime || '';
      const refNo = b.reference_no || b.referenceNo || '';

      // Contextual advance button
      let advanceButtonHtml = '';
      if (st.nextAction && st.nextStatus) {
        advanceButtonHtml = `
          <button type="button" class="btn-admin-advance btn-step-${st.nextStatus}" onclick="window.updateBookingStatus('${b.id}', '${st.nextStatus}', '${b.date}')">
            ${st.nextIcon || ''}
            <span>${st.nextAction}</span>
          </button>
        `;
      }

      // Status selector options
      const statusOptionsHtml = Object.values(BOOKING_STATUSES)
        .map((opt) => `<option value="${opt.key}" ${opt.key === b.normStatus ? 'selected' : ''}>${opt.label}</option>`)
        .join('');

      return `
        <div class="admin-booking-item ${isCancelled ? 'booking-cancelled' : ''} ${isCompleted ? 'booking-completed' : ''}" data-booking-id="${b.id}">
          <div class="admin-booking-top">
            <div class="admin-booking-id-wrap">
              <span class="admin-booking-date">${b.date}${deliveryTime ? ` • ${deliveryTime}` : ''}</span>
              <span class="admin-booking-id">#${b.id || 'REF'}</span>
            </div>
            <div class="admin-status-wrap">
              <span class="admin-status-badge ${st.badgeClass}">
                <span class="status-indicator"></span>
                <span>${st.label}</span>
              </span>
            </div>
          </div>

          <div class="admin-client-info">
            <span class="admin-client-name">${b.name || 'Customer'}</span>
            <div class="admin-client-contacts">
              ${b.phone ? `<a href="tel:${b.phone}" class="admin-phone-link" title="Call customer">${b.phone}</a>` : ''}
              ${fbName ? `<a href="https://m.me/KSoundRentals" target="_blank" rel="noopener noreferrer" class="admin-fb-badge" title="Open Messenger">FB: ${fbName}</a>` : ''}
            </div>
          </div>

          <div class="admin-pkg-badge-strip">
            <span class="admin-pkg-title">${pkgLabel}</span>
            <span class="admin-rate-tag">Rate: ${pkgRate}</span>
            ${refNo ? `<span class="admin-rate-tag">Deposit Ref: ${refNo}</span>` : ''}
          </div>

          <div class="admin-booking-venue">
            <span>📍 ${b.address || 'Lapu-Lapu City'}</span>
            ${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="admin-pin-pill">Map ↗</a>` : ''}
          </div>

          <div class="admin-booking-actions">
            ${advanceButtonHtml}
            <div class="admin-status-select-wrap">
              <select class="admin-status-select" onchange="window.updateBookingStatus('${b.id}', this.value, '${b.date}')" title="Change status" aria-label="Booking status">
                ${statusOptionsHtml}
              </select>
            </div>
            ${
              isCancelled
                ? `<button type="button" class="admin-reactivate-btn" onclick="window.updateBookingStatus('${b.id}', 'deposit_verified', '${b.date}')">Reactivate</button>`
                : `<button type="button" class="admin-cancel-btn" onclick="window.updateBookingStatus('${b.id}', 'cancelled', '${b.date}')">Cancel</button>`
            }
            <button type="button" class="admin-delete-btn" onclick="window.deleteSavedBooking('${b.id}')" title="Permanently delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `<div class="admin-ledger-scroll">${cardsHtml}</div>`;
}

export async function updateBookingStatus(id, newStatus, dateStr) {
  try {
    await updateBookingStatusInDB(id, newStatus, dateStr);
    const target = cachedBookings.find((b) => b.id === id);
    if (target) {
      target.status = newStatus;
    }
    updateAdminAnalytics(cachedBookings);
    renderFilteredBookingsList();
  } catch (err) {
    alert('Failed to update status: ' + (err.message || 'Error'));
  }
}

export async function renderAdminLedger() {
  const container = document.getElementById('admin-bookings-list');
  if (!container) return;

  if (!isAdmin) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  if (!isSupabaseConfigured()) {
    container.innerHTML = `
      <div class="admin-supabase-notice">
        <div class="supabase-badge">⚡ Supabase Database</div>
        <h4>Database Connection Needed</h4>
        <p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div style="padding:28px; text-align:center; color:var(--text-muted); font-size:13.5px;">Syncing live reservations from Supabase...</div>';

  cachedBookings = await getSavedBookings();
  updateAdminAnalytics(cachedBookings);
  renderFilteredBookingsList();
}

export function unlockAdmin(forceState) {
  isAdmin = typeof forceState === 'boolean' ? forceState : !isAdmin;
  renderCalendar(currentYear, currentMonth);
  renderAdminLedger();
}

export { adminSignIn, adminSignOut, getAdminSession };

export function initCalendar() {
  const root = document.getElementById('calendar-root');
  if (!root) return;

  const now = new Date();
  renderCalendar(now.getFullYear(), now.getMonth());
  syncBlockedDatesFromServer();

  const dateInput = document.getElementById('input-date');
  if (dateInput) {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateInput.min = todayStr;

    dateInput.addEventListener('change', () => {
      if (dateInput.value && !isBlocked(dateInput.value)) {
        selectedDate = dateInput.value;
        const parts = dateInput.value.split('-').map(Number);
        if (parts.length === 3) {
          renderCalendar(parts[0], parts[1] - 1);
        }
      }
    });
  }

  window.renderCalendar = renderCalendar;
  window.selectDate = selectDate;
  window.useSelectedDate = useSelectedDate;
  window.toggleBlock = toggleBlock;
  window.unlockAdmin = unlockAdmin;
  window.deleteSavedBooking = deleteSavedBooking;
  window.cancelSavedBooking = cancelSavedBooking;
  window.reactivateSavedBooking = reactivateSavedBooking;
  window.clearAllSavedBookings = clearAllSavedBookings;
  window.exportBookingsCsv = exportBookingsCsv;
  window.renderAdminLedger = renderAdminLedger;
  window.setLedgerFilter = setLedgerFilter;
  window.filterAdminLedger = filterAdminLedger;
  window.updateBookingStatus = updateBookingStatus;
}
