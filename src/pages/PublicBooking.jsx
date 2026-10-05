import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getAvailableSlots, isSlotStillAvailable } from "../lib/availability";
import { payWithPaystack, generateReference } from "../lib/paystack";
import ServicePicker from "../components/ServicePicker";
import SlotPicker from "../components/SlotPicker";

function depositFor(business, service) {
  if (!business || !service) return 0;
  if (business.deposit_type === "percent") {
    return Math.round((business.deposit_amount / 100) * Number(service.price));
  }
  return Number(business.deposit_amount);
}

export default function PublicBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | not_found

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load the business + its active services by slug.
  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!biz) {
        setLoadState("not_found");
        return;
      }

      const { data: svcs } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("active", true)
        .order("created_at");

      setBusiness(biz);
      setServices(svcs || []);
      setLoadState("ready");
    }
    load();
  }, [slug]);

  // Re-fetch slots whenever the service or date changes.
  useEffect(() => {
    if (!business || !selectedService) return;

    setSlotsLoading(true);
    setSelectedSlot(null);

    getAvailableSlots({
      businessId: business.id,
      serviceDurationMinutes: selectedService.duration_minutes,
      date: selectedDate,
      workingHours: business.working_hours,
    })
      .then(setSlots)
      .finally(() => setSlotsLoading(false));
  }, [business, selectedService, selectedDate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!selectedService || !selectedSlot) {
      setError("Pick a service and a time first.");
      return;
    }
    if (!customerName || !customerPhone) {
      setError("Name and phone number are required.");
      return;
    }

    setSubmitting(true);

    // Re-validate the slot right before booking — closes the race-condition window.
    const stillFree = await isSlotStillAvailable({
      businessId: business.id,
      slotStart: selectedSlot.start.toISOString(),
      slotEnd: selectedSlot.end.toISOString(),
    });

    if (!stillFree) {
      setError("That time was just taken — pick another slot.");
      setSubmitting(false);
      setSelectedSlot(null);
      return;
    }

    const deposit = depositFor(business, selectedService);
    const reference = generateReference();

    const { data: bookingRow, error: insertError } = await supabase
      .from("bookings")
      .insert({
        business_id: business.id,
        service_id: selectedService.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        slot_start: selectedSlot.start.toISOString(),
        slot_end: selectedSlot.end.toISOString(),
        status: "pending",
        deposit_amount: deposit,
        deposit_status: "unpaid",
        paystack_reference: reference,
      })
      .select("id, business_id, service_id, slot_start, slot_end, status, deposit_amount, deposit_status, created_at")
      .single();

    if (insertError || !bookingRow) {
      setError("Couldn't create the booking — please try again.");
      setSubmitting(false);
      return;
    }

    if (deposit <= 0) {
      // No deposit required — confirm immediately.
      const { data: confirmed, error: confirmError } = await supabase.rpc(
        "confirm_no_deposit_booking",
        { booking_id: bookingRow.id }
      );
      if (confirmError || !confirmed) {
        setError(confirmError?.message || "Couldn't confirm the booking — please try again.");
        setSubmitting(false);
        return;
      }
      navigate(`/b/${slug}/confirm/${bookingRow.id}`);
      return;
    }

    payWithPaystack({
      email: customerEmail || `${customerPhone}@no-email.booking`,
      amountNaira: deposit,
      reference,
      onSuccess: () => {
        // The Edge Function webhook is the real source of truth for confirmation;
        // this just takes the customer to a confirmation page that will reflect
        // "confirmed" once the webhook lands (usually within a second or two).
        navigate(`/b/${slug}/confirm/${bookingRow.id}`);
      },
      onClose: () => {
        setSubmitting(false);
        setError("Payment was cancelled — your slot is held for 15 minutes if you want to retry.");
      },
    });
  }

  if (loadState === "loading") {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (loadState === "not_found") {
    return <CenteredMessage>We couldn't find that business.</CenteredMessage>;
  }

  const deposit = depositFor(business, selectedService);

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-ink">{business.name}</h1>
      <p className="text-ink/60 text-sm mt-1 mb-8">Book an appointment</p>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-ink/70 mb-3">1. Choose a service</h2>
        <ServicePicker
          services={services}
          selectedId={selectedService?.id}
          onSelect={setSelectedService}
        />
      </section>

      {selectedService && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-ink/70 mb-3">2. Choose a time</h2>
          <SlotPicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            slots={slots}
            loading={slotsLoading}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </section>
      )}

      {selectedService && selectedSlot && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-ink/70 mb-3">3. Your details</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Full name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 text-sm"
              required
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 text-sm"
            />

            {deposit > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-400/30 px-3 py-2 text-sm text-ink">
                A deposit of <strong>₦{deposit.toLocaleString()}</strong> is required to confirm
                this booking.
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-md py-2.5 text-sm font-medium transition"
            >
              {submitting
                ? "Processing…"
                : deposit > 0
                ? `Pay ₦${deposit.toLocaleString()} deposit & book`
                : "Confirm booking"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-ink/60 text-sm">
      {children}
    </div>
  );
}
