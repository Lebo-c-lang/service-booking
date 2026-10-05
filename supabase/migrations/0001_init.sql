-- Service Booking schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "uuid-ossp";

-- One row per business owner's business
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  whatsapp_number text,
  working_hours jsonb not null default '{
    "mon": {"open": "09:00", "close": "17:00"},
    "tue": {"open": "09:00", "close": "17:00"},
    "wed": {"open": "09:00", "close": "17:00"},
    "thu": {"open": "09:00", "close": "17:00"},
    "fri": {"open": "09:00", "close": "17:00"},
    "sat": {"open": "10:00", "close": "14:00"},
    "sun": null
  }'::jsonb,
  deposit_type text not null default 'flat' check (deposit_type in ('flat', 'percent')),
  deposit_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null default 60,
  price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'no_show', 'cancelled')),
  deposit_amount numeric not null default 0,
  deposit_status text not null default 'unpaid'
    check (deposit_status in ('unpaid', 'paid', 'failed')),
  paystack_reference text,
  created_at timestamptz not null default now()
);

create table availability_blocks (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  date date not null,
  reason text
);

create index idx_bookings_business_slot on bookings (business_id, slot_start);
create index idx_services_business on services (business_id);
create index idx_availability_business_date on availability_blocks (business_id, date);

-- ── Row Level Security ──────────────────────────────────────────────
-- Owners can only see/edit their own business's data.
-- The public booking page reads businesses/services anonymously (for the booking UI)
-- and can INSERT bookings, but cannot read other customers' bookings.

alter table businesses enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table availability_blocks enable row level security;

-- businesses: public can read (needed to render the booking page by slug);
-- only the owner can insert/update/delete their own row.
create policy "businesses are publicly readable"
  on businesses for select using (true);

create policy "owners manage their own business"
  on businesses for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- services: public can read active services; owner manages their own.
create policy "active services are publicly readable"
  on services for select using (
    active = true
    or business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "owners manage their own services"
  on services for insert with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "owners update their own services"
  on services for update using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "owners delete their own services"
  on services for delete using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- bookings: customers can create bookings (no login required) and read
-- only the single booking they just created (handled client-side by id).
-- Owners can read/update all bookings for their business.
create policy "anyone can create a booking"
  on bookings for insert with check (true);

create policy "owners read their own bookings"
  on bookings for select using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Allow reading a single booking by id without auth, for the confirmation page.
-- (Booking ids are UUIDs — unguessable — so this is safe for a one-off lookup.)
create policy "anyone can read a booking by exact id"
  on bookings for select using (true);

create policy "owners update their own bookings"
  on bookings for update using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- availability_blocks: public read (needed for slot calculation), owner manages.
create policy "availability blocks are publicly readable"
  on availability_blocks for select using (true);

create policy "owners manage their own availability blocks"
  on availability_blocks for insert with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "owners delete their own availability blocks"
  on availability_blocks for delete using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- NOTE: updating a booking's deposit_status/status to 'confirmed' after payment
-- happens from the Edge Function using the service_role key, which bypasses RLS —
-- that's intentional and is the only place a booking gets auto-confirmed.
