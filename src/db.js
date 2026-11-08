// ===================================================
// K-SOUNDRENTALS — Strict Supabase Database Engine
// ===================================================

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './packages.js';

let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    return null;
  }
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

export function isSupabaseConfigured() {
  const url = SUPABASE_URL?.trim() || '';
  const key = SUPABASE_ANON_KEY?.trim() || '';
  return Boolean(url && key && url.startsWith('http') && key.length > 10);
}

// 1. Fetch live bookings strictly from Supabase
export async function getBookingsFromDB() {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[K-SoundRentals] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or Vercel.');
    return [];
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[K-SoundRentals] Error reading bookings from Supabase:', error.message);
    return [];
  }

  return data || [];
}

// 2. Insert booking strictly into Supabase
export async function saveBookingToDB(bookingData) {
  const supabase = getSupabase();
  const bookingId = bookingData.id || ('KS-' + Math.random().toString(36).substring(2, 8).toUpperCase());

  const payload = {
    id: bookingId,
    name: bookingData.name,
    phone: bookingData.phone,
    date: bookingData.date,
    delivery_time: bookingData.deliveryTime,
    package: bookingData.packageChosen,
    address: bookingData.address,
    map_link: bookingData.mapLink || null,
    payment_channel: bookingData.paymentChannel,
    payment_type: bookingData.paymentTypeLabel,
    amount_due: bookingData.amountDue,
    reference_no: bookingData.referenceNo || null,
    status: 'pending_deposit'
  };

  if (bookingData.fbName) {
    payload.fb_name = bookingData.fbName;
  }

  if (!supabase) {
    console.warn('[K-SoundRentals] Supabase credentials missing. Booking was not saved to database.');
    return payload;
  }

  let { error } = await supabase
    .from('bookings')
    .insert([payload]);

  if (error && error.message && error.message.includes('fb_name')) {
    delete payload.fb_name;
    const retry = await supabase
      .from('bookings')
      .insert([payload]);
    error = retry.error;
  }

  if (error) {
    console.error('[K-SoundRentals] Error writing booking to Supabase:', error.message);
    throw error;
  }

  // Automatically lock the event date in Supabase blocked_dates
  if (bookingData.date) {
    await syncBlockedDateToDB(bookingData.date, true);
  }

  return payload;
}

// 2.5 Update booking operational status in Supabase
export async function updateBookingStatusInDB(id, newStatus, dateStr) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    console.error('[K-SoundRentals] Error updating booking status in Supabase:', error.message);
    throw error;
  }

  // If status is cancelled, check if any other active reservation exists on dateStr
  if (dateStr) {
    if (newStatus === 'cancelled') {
      const { data: remainingActive } = await supabase
        .from('bookings')
        .select('id')
        .eq('date', dateStr)
        .neq('status', 'cancelled')
        .neq('id', id);

      if (!remainingActive || remainingActive.length === 0) {
        await syncBlockedDateToDB(dateStr, false);
      }
    } else {
      await syncBlockedDateToDB(dateStr, true);
    }
  }
}

// 3. Cancel booking strictly in Supabase (and reopen calendar date)
export async function cancelBookingInDB(id, dateStr) {
  await updateBookingStatusInDB(id, 'cancelled', dateStr);
}

// 4. Reactivate booking strictly in Supabase (and relock calendar date)
export async function reactivateBookingInDB(id, dateStr) {
  await updateBookingStatusInDB(id, 'deposit_verified', dateStr);
}

// 5. Delete booking record permanently from Supabase
export async function deleteBookingFromDB(id, dateStr) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[K-SoundRentals] Error deleting booking from Supabase:', error.message);
    throw error;
  }

  if (dateStr) {
    const { data: remainingActive } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', dateStr)
      .neq('status', 'cancelled');

    if (!remainingActive || remainingActive.length === 0) {
      await syncBlockedDateToDB(dateStr, false);
    }
  }
}

// 6. Fetch live blocked dates strictly from Supabase
export async function getBlockedDatesFromDB() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('date');

  if (error) {
    console.error('[K-SoundRentals] Error fetching blocked dates from Supabase:', error.message);
    return [];
  }

  return (data || []).map((row) => row.date);
}

// 7. Upsert or delete blocked date strictly in Supabase
export async function syncBlockedDateToDB(dateStr, shouldBlock) {
  const supabase = getSupabase();
  if (!supabase || !dateStr) return;

  if (shouldBlock) {
    const { error } = await supabase
      .from('blocked_dates')
      .upsert({ date: dateStr }, { onConflict: 'date' });
    if (error) {
      console.error('[K-SoundRentals] Error blocking date in Supabase:', error.message);
    }
  } else {
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('date', dateStr);
    if (error) {
      console.error('[K-SoundRentals] Error unblocking date in Supabase:', error.message);
    }
  }
}

// 8. Official Supabase Auth Methods
export async function adminSignIn(email, password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function adminSignOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  return await supabase.auth.signOut();
}

export async function getAdminSession() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onAdminAuthChange(callback) {
  const supabase = getSupabase();
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}
