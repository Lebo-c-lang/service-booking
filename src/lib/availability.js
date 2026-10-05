// Slot availability logic.
//
// Generates bookable time slots for a given business + service + date by taking
// the business's working hours for that weekday, then removing:
//   - slots that overlap an existing booking that is 'confirmed', 'completed', or
//     a 'pending' booking created within the last 15 minutes (not yet expired)
//   - any date covered by an availability_blocks row (owner marked the day off)
//
// This same function is used both for rendering the slot picker AND, critically,
// re-run server-side (via a Supabase RPC or re-checked in the insert path) before
// a booking is actually created — never trust only the client-side slot list.

import { supabase } from "./supabaseClient";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const PENDING_HOLD_MINUTES = 15;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToDate(baseDate, minutes) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/**
 * Returns an array of { start: Date, end: Date } slots available for booking.
 */
export async function getAvailableSlots({ businessId, serviceDurationMinutes, date, workingHours }) {
  const dayKey = DAY_KEYS[date.getDay()];
  const hours = workingHours?.[dayKey];

  if (!hours) return []; // business closed that day

  // Check for an explicit day-off block.
  const dateStr = date.toISOString().slice(0, 10);
  const { data: blocks } = await supabase
    .from("availability_blocks")
    .select("id")
    .eq("business_id", businessId)
    .eq("date", dateStr);

  if (blocks && blocks.length > 0) return [];

  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);

  // Pull existing bookings for that day that actually hold the slot:
  // confirmed/completed always hold it; pending only holds it within the 15-min window.
  const dayStart = minutesToDate(date, 0);
  const dayEnd = minutesToDate(date, 24 * 60);

  const { data: existing } = await supabase
    .from("bookings")
    .select("slot_start, slot_end, status, created_at")
    .eq("business_id", businessId)
    .gte("slot_start", dayStart.toISOString())
    .lt("slot_start", dayEnd.toISOString())
    .in("status", ["pending", "confirmed", "completed"]);

  const now = new Date();
  const blockingBookings = (existing || []).filter((b) => {
    if (b.status === "confirmed" || b.status === "completed") return true;
    // pending: only blocks if still within the hold window
    const createdAt = new Date(b.created_at);
    const ageMinutes = (now - createdAt) / 60000;
    return ageMinutes < PENDING_HOLD_MINUTES;
  });

  const slots = [];
  const step = serviceDurationMinutes; // non-overlapping back-to-back slots

  for (let start = openMin; start + serviceDurationMinutes <= closeMin; start += step) {
    const slotStart = minutesToDate(date, start);
    const slotEnd = minutesToDate(date, start + serviceDurationMinutes);

    // Skip slots already in the past (for today).
    if (slotStart < now) continue;

    const overlaps = blockingBookings.some((b) => {
      const bStart = new Date(b.slot_start);
      const bEnd = new Date(b.slot_end);
      return slotStart < bEnd && slotEnd > bStart;
    });

    if (!overlaps) {
      slots.push({ start: slotStart, end: slotEnd });
    }
  }

  return slots;
}

/**
 * Re-validates a single slot is still free right before creating the booking.
 * Call this immediately before the insert to close the race-condition window.
 */
export async function isSlotStillAvailable({ businessId, slotStart, slotEnd }) {
  const { data: existing } = await supabase
    .from("bookings")
    .select("slot_start, slot_end, status, created_at")
    .eq("business_id", businessId)
    .lt("slot_start", slotEnd)
    .gt("slot_end", slotStart)
    .in("status", ["pending", "confirmed", "completed"]);

  if (!existing || existing.length === 0) return true;

  const now = new Date();
  const stillBlocking = existing.some((b) => {
    if (b.status === "confirmed" || b.status === "completed") return true;
    const ageMinutes = (now - new Date(b.created_at)) / 60000;
    return ageMinutes < PENDING_HOLD_MINUTES;
  });

  return !stillBlocking;
}
