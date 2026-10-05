# Service Booking + Deposit Collection

A booking system for local service businesses (salons, mechanics, cleaners, photographers)
that collects a deposit at booking time to cut no-shows.

Stack: React + Vite + Tailwind, Supabase (Postgres + Auth + Edge Functions), Paystack.

## What's included

- Public booking page per business (`/b/:slug`) — pick a service, pick a slot, pay a deposit
- Booking confirmation page
- Owner dashboard (auth-gated): calendar of bookings, services CRUD, settings (hours + deposit rules)
- Slot availability logic that checks working hours against existing bookings
- Paystack checkout + a Supabase Edge Function webhook that verifies payment and confirms the booking
- SQL migration for the full schema (businesses, services, bookings, availability_blocks)

## 1. Create a Supabase project

1. Go to https://supabase.com, create a new project.
2. In the SQL editor, run the files in `supabase/migrations/` in filename order.
3. In Project Settings → API, copy your Project URL and anon public key.

## 2. Set up Paystack

1. Create a Paystack account (https://paystack.com), get your **public key** (`pk_test_...` for testing)
   and **secret key** (`sk_test_...`).
2. In the Paystack dashboard, go to Settings → API Keys & Webhooks and set your webhook URL to:
   `https://<your-project-ref>.functions.supabase.co/paystack-webhook`
   (you'll get this URL after deploying the Edge Function in step 4).

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxx
```

The **Paystack secret key** is never put in the frontend `.env`. It goes into the Supabase Edge
Function's own secrets (step 4).

## 4. Deploy the webhook Edge Function

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxx
supabase functions deploy paystack-webhook
```

Copy the deployed function URL into Paystack's webhook settings (step 2).

## 5. Run locally

```bash
npm install
npm run dev
```

## 6. Set up your first business

1. Sign up at `/login` (this creates a Supabase Auth user).
2. You'll land on `/dashboard` — go to Settings and fill in your business name, slug, working
   hours, and deposit amount.
3. Go to Services and add at least one service.
4. Your public booking page is now live at `/b/your-slug`.

## 7. Deploy

Push to GitHub, import into Vercel, add the three `VITE_*` env vars in Vercel's project settings,
deploy. The Supabase Edge Function is deployed separately (step 4) and doesn't live on Vercel.

## Notes on what's deliberately simple (v1 scope)

Matches the build order from the spec — these are the things to add once the happy path works,
not bugs:

- No SMS/WhatsApp Business API — booking confirmations show a `wa.me` link the owner can message from.
- No multi-staff scheduling — one shared calendar per business.
- Expired pending bookings (abandoned checkout) are cleaned up lazily: a slot is only considered
  "taken" by a `pending` booking for 15 minutes from creation, which `src/lib/availability.js`
  already enforces. A periodic cleanup job (e.g. a Supabase cron) to mark them `cancelled` is a
  nice-to-have, not required for correctness.
