import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

export default function DashboardSettings({ business, onUpdated }) {
  const [name, setName] = useState(business.name || "");
  const [slug, setSlug] = useState(business.slug || "");
  const [whatsapp, setWhatsapp] = useState(business.whatsapp_number || "");
  const [depositType, setDepositType] = useState(business.deposit_type || "flat");
  const [depositAmount, setDepositAmount] = useState(business.deposit_amount || 0);
  const [hours, setHours] = useState(business.working_hours || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateDay(day, field, value) {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day], [field]: value } : { open: "09:00", close: "17:00", [field]: value },
    }));
  }

  function toggleDayOpen(day) {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { open: "09:00", close: "17:00" },
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        slug,
        whatsapp_number: whatsapp || null,
        deposit_type: depositType,
        deposit_amount: Number(depositAmount),
        working_hours: hours,
      })
      .eq("id", business.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      onUpdated && onUpdated();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-ink mb-4">Settings</h2>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="border border-line rounded-lg p-4 bg-white space-y-3">
          <h3 className="text-sm font-medium text-ink/70">Business profile</h3>
          <input
            type="text"
            placeholder="Business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm"
          />
          <div>
            <label className="text-xs text-ink/50">Booking page URL</label>
            <div className="flex items-center text-sm border border-line rounded-md overflow-hidden">
              <span className="bg-paper px-3 py-2 text-ink/50 border-r border-line">/b/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className="flex-1 px-3 py-2"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="WhatsApp number (e.g. 2348012345678)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="border border-line rounded-lg p-4 bg-white space-y-3">
          <h3 className="text-sm font-medium text-ink/70">Deposit rules</h3>
          <div className="flex gap-3">
            <select
              value={depositType}
              onChange={(e) => setDepositType(e.target.value)}
              className="border border-line rounded-md px-3 py-2 text-sm"
            >
              <option value="flat">Flat amount (₦)</option>
              <option value="percent">Percent of service price</option>
            </select>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 border border-line rounded-md px-3 py-2 text-sm"
              min={0}
            />
          </div>
          <p className="text-xs text-ink/50">Set to 0 to accept bookings without a deposit.</p>
        </div>

        <div className="border border-line rounded-lg p-4 bg-white space-y-2">
          <h3 className="text-sm font-medium text-ink/70 mb-2">Working hours</h3>
          {DAYS.map(([key, label]) => {
            const day = hours[key];
            return (
              <div key={key} className="flex items-center gap-3 text-sm">
                <label className="w-28 flex items-center gap-2">
                  <input type="checkbox" checked={!!day} onChange={() => toggleDayOpen(key)} />
                  {label}
                </label>
                {day ? (
                  <>
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(key, "open", e.target.value)}
                      className="border border-line rounded-md px-2 py-1"
                    />
                    <span className="text-ink/40">to</span>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(key, "close", e.target.value)}
                      className="border border-line rounded-md px-2 py-1"
                    />
                  </>
                ) : (
                  <span className="text-ink/40">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-md px-4 py-2 text-sm font-medium transition"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
