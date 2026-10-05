// Supabase Edge Function: paystack-webhook
//
// Receives Paystack's `charge.success` event, verifies the request actually
// came from Paystack (HMAC signature check against your secret key), then
// marks the matching booking as confirmed + paid.
//
// Deploy: supabase functions deploy paystack-webhook
// Secret: supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacSha512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // 1. Verify the signature Paystack sends in the x-paystack-signature header.
  const signature = req.headers.get("x-paystack-signature");
  const expectedSignature = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);

  if (!signature || signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    // Ignore every other event type (we only care about successful charges).
    return new Response("Ignored", { status: 200 });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return new Response("Missing reference", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 2. Find the booking by the reference we stored when initializing payment.
  const { data: booking, error: findError } = await supabase
    .from("bookings")
    .select("id, status, deposit_status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (findError || !booking) {
    return new Response("Booking not found", { status: 404 });
  }

  // Idempotency: if it's already confirmed, don't double-process.
  if (booking.deposit_status === "paid") {
    return new Response("Already processed", { status: 200 });
  }

  // 3. Confirm the booking.
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed", deposit_status: "paid" })
    .eq("id", booking.id);

  if (updateError) {
    return new Response("Failed to update booking", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
