import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-600",
  confirmed: "bg-teal-50 text-teal-600",
  completed: "bg-ink/5 text-ink/60",
  no_show: "bg-red-50 text-red-600",
  cancelled: "bg-ink/5 text-ink/40 line-through",
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardCalendar({ business }) {
  const [bookings, setBookings] = useState([]);
  const [servicesById, setServicesById] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: bk }, { data: svcs }] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("business_id", business.id)
        .order("slot_start", { ascending: true }),
      supabase.from("services").select("id, name").eq("business_id", business.id),
    ]);

    setBookings(bk || []);
    setServicesById(Object.fromEntries((svcs || []).map((s) => [s.id, s.name])));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function setStatus(booking, status) {
    await supabase.from("bookings").update({ status }).eq("id", booking.id);
    load();
  }

  const upcoming = bookings.filter((b) => new Date(b.slot_start) >= new Date() && b.status !== "cancelled");
  const past = bookings.filter((b) => new Date(b.slot_start) < new Date() || b.status === "cancelled");

  const depositRevenue = bookings
    .filter((b) => b.deposit_status === "paid")
    .reduce((sum, b) => sum + Number(b.deposit_amount), 0);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-ink">Bookings</h2>
        <div className="text-sm text-ink/60">
          Deposit revenue: <span className="font-medium text-ink">₦{depositRevenue.toLocaleString()}</span>
        </div>
      </div>

      {loading && <p className="text-sm text-ink/60">Loading…</p>}

      {!loading && upcoming.length === 0 && (
        <p className="text-sm text-ink/60 mb-8">No upcoming bookings yet.</p>
      )}

      <div className="space-y-2 mb-8">
        {upcoming.map((b) => (
          <BookingRow
            key={b.id}
            booking={b}
            serviceName={servicesById[b.service_id]}
            onSetStatus={setStatus}
          />
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-ink/50 mb-3">Past</h3>
          <div className="space-y-2">
            {past.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                serviceName={servicesById[b.service_id]}
                onSetStatus={setStatus}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BookingRow({ booking, serviceName, onSetStatus }) {
  const isUpcoming = new Date(booking.slot_start) >= new Date();

  return (
    <div className="border border-line rounded-lg px-4 py-3 bg-white flex items-center justify-between gap-3">
      <div>
        <div className="font-medium text-ink">
          {booking.customer_name} · {serviceName || "Service"}
        </div>
        <div className="text-sm text-ink/60">
          {formatDateTime(booking.slot_start)} · {booking.customer_phone}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[booking.status] || ""}`}>
          {booking.status.replace("_", " ")}
        </span>
        {isUpcoming && booking.status === "confirmed" && (
          <select
            defaultValue=""
            onChange={(e) => e.target.value && onSetStatus(booking, e.target.value)}
            className="text-xs border border-line rounded-md px-1 py-1"
          >
            <option value="" disabled>
              Mark as…
            </option>
            <option value="completed">Completed</option>
            <option value="no_show">No-show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </div>
    </div>
  );
}
