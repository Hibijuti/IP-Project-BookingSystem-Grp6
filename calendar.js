// ===== K-SOUNDRENTALS CALENDAR =====
// Blocked dates are saved in localStorage so they
// persist between page refreshes on the same browser.
// When you build the backend later, you'll replace
// localStorage with a real database call.

const ADMIN_PASSWORD = "ksound2026"; // Change this!
let isAdmin = false;
let selectedDate = null;
let currentYear, currentMonth;

// Load blocked dates from localStorage (or start empty)
function getBlockedDates() {
  const saved = localStorage.getItem("blockedDates");
  return saved ? JSON.parse(saved) : [];
}

function saveBlockedDates(dates) {
  localStorage.setItem("blockedDates", JSON.stringify(dates));
}

function isBlocked(dateStr) {
  return getBlockedDates().includes(dateStr);
}

// Toggle a date blocked/unblocked (admin only)
function toggleBlock(dateStr) {
  const dates = getBlockedDates();
  const idx = dates.indexOf(dateStr);
  if (idx === -1) {
    dates.push(dateStr);
  } else {
    dates.splice(idx, 1);
  }
  saveBlockedDates(dates);
  renderCalendar(currentYear, currentMonth);
}

// Build and render the calendar grid
function renderCalendar(year, month) {
  currentYear = year;
  currentMonth = month;

  const root = document.getElementById("calendar-root");
  if (!root) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = `
    <div class="cal-nav">
      <button onclick="renderCalendar(
        ${month === 0 ? year - 1 : year},
        ${month === 0 ? 11 : month - 1}
      )">‹</button>
      <strong>${monthNames[month]} ${year}</strong>
      <button onclick="renderCalendar(
        ${month === 11 ? year + 1 : year},
        ${month === 11 ? 0 : month + 1}
      )">›</button>
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

  // Empty cells before the 1st
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const thisDate = new Date(year, month, d);
    const isPast = thisDate < today;
    const blocked = isBlocked(dateStr);
    const isSelected = dateStr === selectedDate;

    let cls = "cal-day";
    if (isPast) cls += " past";
    else if (isSelected) cls += " selected-day";
    else if (blocked) cls += " blocked";

    let clickFn = "";
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

// Customer selects a date
function selectDate(dateStr) {
  selectedDate = dateStr;
  renderCalendar(currentYear, currentMonth);
}

// "Use This Date" button — fills the form's date field
function useSelectedDate() {
  if (!selectedDate) {
    alert("Please tap a date first.");
    return;
  }
  const dateInput = document.getElementById("event-date");
  if (dateInput) dateInput.value = selectedDate;
  document.getElementById("calendar-modal").style.display = "none";
}

// Admin login
function unlockAdmin() {
  const pw = document.getElementById("admin-pw").value;
  const msg = document.getElementById("admin-msg");
  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    msg.textContent = "Admin mode ON — tap a date to block or unblock it.";
    renderCalendar(currentYear, currentMonth);
  } else {
    msg.style.color = "#fca5a5";
    msg.textContent = "Wrong password.";
  }
}

// Start calendar on today's month when page loads
const now = new Date();
renderCalendar(now.getFullYear(), now.getMonth());
