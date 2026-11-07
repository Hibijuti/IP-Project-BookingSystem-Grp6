// ===================================================
// K-SOUNDRENTALS — Database Engine (Supabase Cloud + Local Sync)
// ===================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './packages.js';

export async function getBookingsFromDB() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?order=created_at.desc`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          localStorage.setItem('ksound_bookings', JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Fallback to localStorage
    }
  }

  try {
    return JSON.parse(localStorage.getItem('ksound_bookings') || '[]');
  } catch {
    return [];
  }
}

export async function saveBookingToDB(bookingData) {
  const newEntry = {
    id: 'KS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    createdAt: new Date().toLocaleString(),
    status: 'confirmed',
    ...bookingData
  };

  // 1. Save locally
  try {
    const list = JSON.parse(localStorage.getItem('ksound_bookings') || '[]');
    list.unshift(newEntry);
    localStorage.setItem('ksound_bookings', JSON.stringify(list.slice(0, 50)));
  } catch {}

  // 2. Save to Supabase Cloud
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          id: newEntry.id,
          name: newEntry.name,
          phone: newEntry.phone,
          date: newEntry.date,
          delivery_time: newEntry.deliveryTime,
          package: newEntry.packageChosen,
          address: newEntry.address,
          map_link: newEntry.mapLink || '',
          payment_channel: newEntry.paymentChannel,
          payment_type: newEntry.paymentTypeLabel,
          amount_due: newEntry.amountDue,
          reference_no: newEntry.referenceNo || '',
          status: 'confirmed'
        })
      });
    } catch {}
  }

  return newEntry;
}

export async function updateBookingStatusInDB(id, newStatus) {
  // Update local
  try {
    const list = JSON.parse(localStorage.getItem('ksound_bookings') || '[]');
    const item = list.find((b) => b.id === id);
    if (item) {
      item.status = newStatus;
      localStorage.setItem('ksound_bookings', JSON.stringify(list));
    }
  } catch {}

  // Update Cloud
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch {}
  }
}

export async function deleteBookingFromDB(id) {
  try {
    const list = JSON.parse(localStorage.getItem('ksound_bookings') || '[]');
    const filtered = list.filter((b) => b.id !== id);
    localStorage.setItem('ksound_bookings', JSON.stringify(filtered));
  } catch {}

  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    } catch {}
  }
}

export async function getBlockedDatesFromDB() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?select=date`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const cloudDates = data.map((d) => d.date);
          localStorage.setItem('blockedDates', JSON.stringify(cloudDates));
          return cloudDates;
        }
      }
    } catch {}
  }

  try {
    return JSON.parse(localStorage.getItem('blockedDates') || '[]');
  } catch {
    return [];
  }
}

export async function syncBlockedDateToDB(dateStr, shouldBlock) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  try {
    if (shouldBlock) {
      await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ date: dateStr })
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?date=eq.${dateStr}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    }
  } catch {}
}
