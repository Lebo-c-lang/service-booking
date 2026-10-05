import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BookingConfirm() {
  const { slug, bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [business, setBusiness] = useState(null);
  const [service, setService] = useState(null);

  async function refresh() {
    const { data: b } = await supabase
      .from("bookings")
      .select("id, business_id, service_id, slot_start, status, deposit_amount, deposit_status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!b) return;
    setBooking(b);

    const [{ data: biz }, { data: svc }] = await Promise.all([
      supabase.from("businesses").select("name, whatsapp_number").eq("id", b.business_id).maybeSingle(),
      supabase.from("services").select("name").eq("id", b.service_id).maybeSingle(),
    ]);
    setBusiness(biz);
    setService(svc);
  }

  useEffect(() => {
    refresh();
    // Poll briefly in case the page loaded just before the webhook confirmed it.
    const interval = setInterval(refresh, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-ink/60 text-sm">
        Loading…
      </div>
    );
  }

  const isConfirmed = booking.status === "confirmed";
  const isPending = booking.status === "pending";

  const whatsappMessage = encodeURIComponent(
    `Hi, I just booked ${service?.name || "an appointment"} for ${formatDateTime(
      booking.slot_start
    )}.`
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-10 text-center">
      <div
        className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isConfirmed ? "bg-teal-600" : "bg-amber-400"
        }`}
      >
        <span className="text-white text-xl">{isConfirmed ? "✓" : "…"}</span>
      </div>

      <h1 className="text-xl font-semibold text-ink mb-1">
        {isConfirmed ? "Booking confirmed" : isPending ? "Payment processing" : "Booking cancelled"}
      </h1>
      <p className="text-ink/60 text-sm mb-8">
        {isConfirmed
          ? "You're all set."
          : isPending
          ? "This updates automatically once your payment clears."
          : ""}
      </p>

      <div className="text-left border border-line rounded-lg p-4 space-y-2 bg-white mb-6">
        <Row label="Business" value={business?.name} />
        <Row label="Service" value={service?.name} />
        <Row label="When" value={formatDateTime(booking.slot_start)} />
        <Row
          label="Deposit"
          value={
            booking.deposit_amount > 0
              ? `₦${Number(booking.deposit_amount).toLocaleString()} — ${booking.deposit_status}`
              : "Not required"
          }
        />
      </div>

      {business?.whatsapp_number && (
        <a
          href={`https://wa.me/${business.whatsapp_number}?text=${whatsappMessage}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block w-full bg-teal-600 hover:bg-teal-700 text-white rounded-md py-2.5 text-sm font-medium transition"
        >
          Message {business.name} on WhatsApp
        </a>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink/60">{label}</span>
      <span className="text-ink font-medium">{value || "—"}</span>
    </div>
  );
}
