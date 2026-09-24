// ===================================================
// K-SOUNDRENTALS — app.js
// Week 3 JavaScript features go in this file
// ===================================================


// ===== FEATURE 1: HAMBURGER MENU =====

// querySelector finds ONE element using a CSS selector
// Think of it like: "go find the element with id=hamburger"
const hamburger = document.querySelector('#hamburger');
const navLinks  = document.querySelector('#nav-links');

// addEventListener waits for something to happen (a "click")
// then runs the function inside
hamburger.addEventListener('click', function() {
  // toggle adds "open" if it's not there, removes it if it is
  navLinks.classList.toggle('open');

  // Change ☰ to ✕ when open, back to ☰ when closed
  if (navLinks.classList.contains('open')) {
    hamburger.textContent = '✕';
  } else {
    hamburger.textContent = '☰';
  }
});

// When a nav link is clicked — close the menu
const navItems = document.querySelectorAll('.nav-links a');
navItems.forEach(function(link) {
  link.addEventListener('click', function() {
    navLinks.classList.remove('open');
    hamburger.textContent = '☰';
  });
});

// When user clicks anywhere outside the menu — close it
document.addEventListener('click', function(event) {
  const clickedInsideNav = hamburger.contains(event.target)
    || navLinks.contains(event.target);

  if (!clickedInsideNav) {
    navLinks.classList.remove('open');
    hamburger.textContent = '☰';
  }
});


// ===== FEATURE 2: BOOK THIS → AUTO-SELECT PACKAGE =====
//
// How this works:
// 1. Find all buttons with class "book-btn"
// 2. When one is clicked, read its data-package value
// 3. Find the matching option in the dropdown and select it
// 4. Smoothly scroll down to the booking form
// 5. Highlight the dropdown briefly so the user notices it changed

const bookBtns = document.querySelectorAll('.book-btn');
const packageSelect = document.getElementById('package-select');
const bookingSection = document.getElementById('booking');

bookBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {

    // Read the data-package value from the clicked button
    // e.g. "Full Karaoke — ₱1,299 (12 hrs)"
    const packageName = btn.dataset.package;

    // Loop through each option in the dropdown
    // and find the one whose text matches packageName
    const options = packageSelect.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].text === packageName) {
        packageSelect.selectedIndex = i; // select it
        break; // stop looping once found
      }
    }

    // Smoothly scroll to the booking section
    bookingSection.scrollIntoView({ behavior: 'smooth' });

    // Flash the dropdown orange so user knows it was set
    packageSelect.style.borderColor = '#ff8c00';
    packageSelect.style.transition = 'border-color 0.3s';
    setTimeout(function() {
      packageSelect.style.borderColor = '';
    }, 2000); // resets after 2 seconds

  });
});

// ===== FEATURE 4: SCROLL EFFECTS =====
//
// All 3 scroll features use one single scroll event listener.
// We do all the checks inside one function so the browser
// isn't running 3 separate listeners on every scroll tick.

const nav = document.querySelector('.navbar');
let lastScrollPos = 0;  // tracks where we were last time

// --- Feature 3 setup: add fade-section class to each section ---
// We target the main content sections (not nav or footer)
const sections = document.querySelectorAll(
  '.equipment, .packages, .videos, .booking'
);
sections.forEach(function(section) {
  section.classList.add('fade-section');
});


// --- IntersectionObserver: watches when sections enter the screen ---
// This is better than checking scroll position manually.
// The browser tells us exactly when an element becomes visible.
const observer = new IntersectionObserver(
  function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        // Section entered the viewport — make it visible
        entry.target.classList.add('visible');

        // Stop watching once it's visible — no need to re-animate
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.1  // trigger when 10% of the section is visible
  }
);

// Tell the observer to watch each section
sections.forEach(function(section) {
  observer.observe(section);
});


// --- Scroll event: handles navbar hide/show + shadow ---
window.addEventListener('scroll', function() {
  const currentScrollPos = window.scrollY;

  // Feature 2: Add shadow when scrolled past the top
  if (currentScrollPos > 10) {
    nav.classList.add('nav-scrolled');
  } else {
    nav.classList.remove('nav-scrolled');
  }

  // Feature 1: Hide navbar when scrolling DOWN, show when scrolling UP
  // Only trigger if scrolled more than 60px from top
  // (so the navbar doesn't hide immediately on tiny scrolls)
  if (currentScrollPos > 60) {
    if (currentScrollPos > lastScrollPos) {
      // Scrolling DOWN
      nav.classList.add('nav-hidden');
    } else {
      // Scrolling UP
      nav.classList.remove('nav-hidden');
    }
  } else {
    // Near the top — always show the navbar
    nav.classList.remove('nav-hidden');
  }

  // Save current position for next scroll event comparison
  lastScrollPos = currentScrollPos;
});

// ===== FORM VALIDATION HELPERS =====
function showError(inputEl, message) {
  clearError(inputEl);
  const error = document.createElement('p');
  error.className = 'error-msg';
  error.textContent = message;
  inputEl.parentNode.appendChild(error);
  inputEl.style.borderColor = '#ef4444';
}

function clearError(inputEl) {
  const existing = inputEl.parentNode.querySelector('.error-msg');
  if (existing) existing.remove();
  inputEl.style.borderColor = '';
}

// Clear errors live as user types
const watchedInputs = document.querySelectorAll(
  '#input-name, #input-phone, #input-date, #input-address, #package-select'
);
watchedInputs.forEach(function(input) {
  input.addEventListener('input', function() { clearError(input); });
  input.addEventListener('change', function() { clearError(input); });
});


// ===== HANDLE BOOKING — sends to server =====
async function handleBooking(e) {
  e.preventDefault();

  const nameInput    = document.getElementById('input-name');
  const phoneInput   = document.getElementById('input-phone');
  const dateInput    = document.getElementById('input-date');
  const addressInput = document.getElementById('input-address');
  const pkgSelect    = document.getElementById('package-select');
  const timeSelect   = document.querySelector('.booking-form select');

  // Clear previous errors
  [nameInput, phoneInput, dateInput, addressInput, pkgSelect]
    .forEach(clearError);

  let valid = true;

  if (nameInput.value.trim() === '') {
    showError(nameInput, 'Please enter your full name.');
    valid = false;
  }

  const phoneVal = phoneInput.value.trim().replace(/\s/g, '');
  if (!/^09\d{9}$/.test(phoneVal)) {
    showError(phoneInput, 'Enter a valid PH number starting with 09.');
    valid = false;
  }

  if (dateInput.value === '') {
    showError(dateInput, 'Please select an event date.');
    valid = false;
  } else {
    const chosenDate = new Date(dateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (chosenDate < today) {
      showError(dateInput, 'Event date cannot be in the past.');
      valid = false;
    }
  }

  if (pkgSelect.value === '') {
    showError(pkgSelect, 'Please choose a package.');
    valid = false;
  }

  if (addressInput.value.trim() === '') {
    showError(addressInput, 'Please enter your event address.');
    valid = false;
  }

  // Stop if validation failed
  if (!valid) return;

  // ===== SEND TO SERVER =====
  const submitBtn = document.querySelector('.booking-form .btn');
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;

  try {
    const response = await fetch('https://k-soundrentals-server.onrender.com/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          nameInput.value.trim(),
        phone:         phoneVal,
        date:          dateInput.value,
        deliveryTime:  timeSelect.value,
        packageChosen: pkgSelect.value,
        address:       addressInput.value.trim()
      })
    });

    const result = await response.json();

    if (result.success) {
      document.querySelector('.booking-form').style.display = 'none';
      document.querySelector('.btn-outline').style.display = 'none';
      document.getElementById('booking-success').style.display = 'block';
    } else {
      alert('Something went wrong: ' + result.message);
      submitBtn.textContent = 'Send Reservation Request';
      submitBtn.disabled = false;
    }

  } catch (error) {
    alert('Could not connect to server. Please try again or contact us on Facebook.');
    submitBtn.textContent = 'Send Reservation Request';
    submitBtn.disabled = false;
  }
}

window.handleBooking = handleBooking;