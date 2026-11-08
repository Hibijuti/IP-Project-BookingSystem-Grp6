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
    status: 'confirmed'
  };

  if (!supabase) {
    console.warn('[K-SoundRentals] Supabase credentials missing. Booking was not saved to database.');
    return payload;
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[K-SoundRentals] Error writing booking to Supabase:', error.message);
    throw error;
  }

  // Automatically lock the event date in Supabase blocked_dates
  if (bookingData.date) {
    await syncBlockedDateToDB(bookingData.date, true);
  }

  return data || payload;
}

// 3. Cancel booking strictly in Supabase (and reopen calendar date)
export async function cancelBookingInDB(id, dateStr) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('[K-SoundRentals] Error updating booking status in Supabase:', error.message);
    throw error;
  }

  // Reopen the date for other customers
  if (dateStr) {
    await syncBlockedDateToDB(dateStr, false);
  }
}

// 4. Reactivate booking strictly in Supabase (and relock calendar date)
export async function reactivateBookingInDB(id, dateStr) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', id);

  if (error) {
    console.error('[K-SoundRentals] Error reactivating booking in Supabase:', error.message);
    throw error;
  }

  // Relock the date
  if (dateStr) {
    await syncBlockedDateToDB(dateStr, true);
  }
}

// 5. Delete booking record permanently from Supabase
export async function deleteBookingFromDB(id) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[K-SoundRentals] Error deleting booking from Supabase:', error.message);
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
