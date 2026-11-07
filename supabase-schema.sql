-- ========================================================
-- K-SOUNDRENTALS — Supabase Cloud Database Schema
-- Run this script in your Supabase SQL Editor (100% Free)
-- ========================================================

-- 1. Create Bookings Table
create table if not exists public.bookings (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  phone text not null,
  date text not null,
  delivery_time text not null,
  package text not null,
  address text not null,
  map_link text,
  payment_channel text,
  payment_type text,
  amount_due numeric,
  reference_no text,
  status text default 'confirmed' -- 'confirmed' | 'cancelled'
);

-- 2. Create Blocked Dates Table (Calendar Availability Sync)
create table if not exists public.blocked_dates (
  date text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Public Read & Write for the Booking Website
alter table public.bookings enable row level security;
alter table public.blocked_dates enable row level security;

create policy "Allow public read bookings" on public.bookings for select using (true);
create policy "Allow public insert bookings" on public.bookings for insert with check (true);
create policy "Allow public update bookings" on public.bookings for update using (true);
create policy "Allow public delete bookings" on public.bookings for delete using (true);

create policy "Allow public read blocked_dates" on public.blocked_dates for select using (true);
create policy "Allow public insert blocked_dates" on public.blocked_dates for insert with check (true);
create policy "Allow public delete blocked_dates" on public.blocked_dates for delete using (true);
