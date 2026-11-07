// ===================================================
// K-SOUNDRENTALS — Availability Calendar Module
// ===================================================

import { API_BASE_URL } from './packages.js';
import {
  getBlockedDatesFromDB,
  syncBlockedDateToDB,
  getBookingsFromDB,
  updateBookingStatusInDB,
  deleteBookingFromDB
} from './db.js';

const ADMIN_PASSWORD = 'ksound2026';
const STORAGE_KEY = 'blockedDates';

let isAdmin = false;
let selectedDate = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

export function getBlockedDates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveBlockedDates(dates) {
  const unique = Array.from(new Set(dates));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function isBlocked(dateStr) {
  return getBlockedDates().includes(dateStr);
}

export function blockDateLocally(dateStr) {
  if (!dateStr) return;
  const dates = getBlockedDates();
  if (!dates.includes(dateStr)) {
    dates.push(dateStr);
    saveBlockedDates(dates);
    renderCalendar(currentYear, currentMonth);
    syncBlockedDateToDB(dateStr, true).catch(() => {});
  }
}

export async function syncBlockedDatesFromServer() {
  try {
    const dbDates = await getBlockedDatesFromDB();
    if (Array.isArray(dbDates) && dbDates.length > 0) {
      const merged = Array.from(new Set([...getBlockedDates(), ...dbDates]));
      saveBlockedDates(merged);
      renderCalendar(currentYear, currentMonth);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${API_BASE_URL}/blocked-dates`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const serverDates = Array.isArray(data) ? data : data?.blockedDates || [];
      if (serverDates.length > 0) {
        const merged = Array.from(new Set([...getBlockedDates(), ...serverDates]));
        saveBlockedDates(merged);
        renderCalendar(currentYear, currentMonth);
      }
    }
  } catch {}
}

export async function toggleBlock(dateStr) {
  const dates = getBlockedDates();
  const idx = dates.indexOf(dateStr);
  const willBlock = idx === -1;

  if (willBlock) {
    dates.push(dateStr);
  } else {
    dates.splice(idx, 1);
  }

  saveBlockedDates(dates);
  renderCalendar(currentYear, currentMonth);
  await syncBlockedDateToDB(dateStr, willBlock);

  try {
    await fetch(`${API_BASE_URL}/blocked-dates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, blocked: willBlock, blockedDates: dates })
    });
  } catch {}
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
  if (!confirm('Permanently delete this reservation record?')) return;
  await deleteBookingFromDB(id);
  await renderAdminLedger();
}

export async function cancelSavedBooking(id, dateStr) {
  if (!confirm(`Cancel this reservation? This will reopen ${dateStr} on the calendar.`)) return;
  await updateBookingStatusInDB(id, 'cancelled');
  if (dateStr) {
    const dates = getBlockedDates().filter((d) => d !== dateStr);
    saveBlockedDates(dates);
    await syncBlockedDateToDB(dateStr, false);
    renderCalendar(currentYear, currentMonth);
  }
  await renderAdminLedger();
}

export async function reactivateSavedBooking(id, dateStr) {
  await updateBookingStatusInDB(id, 'confirmed');
  if (dateStr) {
    blockDateLocally(dateStr);
  }
  await renderAdminLedger();
}

export function clearAllSavedBookings() {
  if (confirm('Are you sure you want to clear all locally cached bookings?')) {
    localStorage.removeItem('ksound_bookings');
    renderAdminLedger();
  }
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

export async function renderAdminLedger() {
  const container = document.getElementById('admin-bookings-list');
  if (!container) return;

  if (!isAdmin) {
    container.style.display = 'none';
    return;
  }

  const bookings = await getSavedBookings();
  container.style.display = 'block';

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="admin-ledger-empty">
        <p>No customer reservations recorded yet.</p>
        <small style="color:var(--text-muted)">New bookings submitted are synced and saved here.</small>
      </div>
    `;
    return;
  }

  const confirmedCount = bookings.filter((b) => b.status !== 'cancelled').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  const cardsHtml = bookings
    .map((b) => {
      const isCancelled = b.status === 'cancelled';
      const pkgName = b.packageChosen || b.package || 'Standard Setup';
      const amt = Number(b.amountDue || b.amount_due || 0).toLocaleString();
      const channel = b.paymentChannel || b.payment_channel || 'GCash';
      const delTime = b.deliveryTime || b.delivery_time || '';
      const mapUrl = b.mapLink || b.map_link;
      const refNo = b.referenceNo || b.reference_no;

      return `
        <div class="admin-booking-item ${isCancelled ? 'booking-cancelled' : ''}">
          <div class="admin-booking-top">
            <span class="admin-booking-id">${b.id || 'BOOKING'}</span>
            <span class="admin-status-tag ${isCancelled ? 'status-cancelled' : 'status-confirmed'}">
              ${isCancelled ? '✕ Cancelled' : '✓ Confirmed'}
            </span>
            <span class="admin-booking-date">📅 ${b.date} &bull; ${delTime}</span>
            <button type="button" class="admin-del-btn" onclick="window.deleteSavedBooking('${b.id}')" title="Delete record">&times;</button>
          </div>
          <div class="admin-booking-body">
            <strong>${b.name}</strong> &bull; <a href="tel:${b.phone}" class="admin-phone-link">${b.phone}</a>
            <div class="admin-booking-pkg">${pkgName} — ₱${amt} (${channel})</div>
            <div class="admin-booking-addr">📍 ${b.address || 'Lapu-Lapu City'}</div>
            ${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="admin-pin-link">Open GPS Pin &nearr;</a>` : ''}
            ${refNo ? `<div class="admin-ref">Ref: <code>${refNo}</code></div>` : ''}
          </div>
          <div class="admin-booking-actions-row">
            ${
              isCancelled
                ? `<button type="button" class="btn-micro" onclick="window.reactivateSavedBooking('${b.id}', '${b.date}')">Reactivate Booking</button>`
                : `<button type="button" class="btn-micro text-danger" onclick="window.cancelSavedBooking('${b.id}', '${b.date}')">Cancel Booking</button>`
            }
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="admin-ledger-header">
      <div>
        <h4>Reservations (${confirmedCount} Active, ${cancelledCount} Cancelled)</h4>
      </div>
      <div class="admin-ledger-actions">
        <button type="button" class="btn-micro" onclick="window.exportBookingsCsv()">Export CSV</button>
        <button type="button" class="btn-micro text-danger" onclick="window.clearAllSavedBookings()">Clear</button>
      </div>
    </div>
    <div class="admin-ledger-scroll">
      ${cardsHtml}
    </div>
  `;
}

export function unlockAdmin() {
  const pwInput = document.getElementById('admin-pw');
  const msg = document.getElementById('admin-msg');
  if (!pwInput || !msg) return;

  if (pwInput.value === ADMIN_PASSWORD) {
    isAdmin = !isAdmin;
    if (isAdmin) {
      msg.style.color = '#86efac';
      msg.textContent = 'Admin mode ON — tap any future date to block/unblock, or manage bookings below.';
    } else {
      msg.style.color = 'rgba(255,255,255,0.6)';
      msg.textContent = 'Admin mode OFF.';
    }
    renderCalendar(currentYear, currentMonth);
    renderAdminLedger();
  } else {
    msg.style.color = '#fca5a5';
    msg.textContent = 'Wrong password.';
  }
}

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
}
