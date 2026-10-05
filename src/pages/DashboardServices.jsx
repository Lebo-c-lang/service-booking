import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DashboardServices({ business }) {
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadServices() {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at");
    setServices(data || []);
  }

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name || !price) return;
    setSaving(true);

    await supabase.from("services").insert({
      business_id: business.id,
      name,
      duration_minutes: Number(duration),
      price: Number(price),
    });

    setName("");
    setDuration(60);
    setPrice("");
    setSaving(false);
    loadServices();
  }

  async function toggleActive(service) {
    await supabase.from("services").update({ active: !service.active }).eq("id", service.id);
    loadServices();
  }

  async function removeService(service) {
    if (!confirm(`Remove "${service.name}"?`)) return;
    await supabase.from("services").delete().eq("id", service.id);
    loadServices();
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-ink mb-4">Services</h2>

      <div className="space-y-2 mb-6">
        {services.length === 0 && (
          <p className="text-sm text-ink/60">No services yet — add your first one below.</p>
        )}
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between border border-line rounded-lg px-4 py-3 bg-white"
          >
            <div>
              <div className="font-medium text-ink">{s.name}</div>
              <div className="text-sm text-ink/60">
                {s.duration_minutes} min · ₦{Number(s.price).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-3 items-center text-sm">
              <button
                onClick={() => toggleActive(s)}
                className={s.active ? "text-teal-600" : "text-ink/40"}
              >
                {s.active ? "Active" : "Hidden"}
              </button>
              <button onClick={() => removeService(s)} className="text-red-500">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="border border-line rounded-lg p-4 bg-white space-y-3">
        <h3 className="text-sm font-medium text-ink/70">Add a service</h3>
        <input
          type="text"
          placeholder="Service name (e.g. Haircut)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm"
        />
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Duration (min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-1/2 border border-line rounded-md px-3 py-2 text-sm"
            min={5}
          />
          <input
            type="number"
            placeholder="Price (₦)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-1/2 border border-line rounded-md px-3 py-2 text-sm"
            min={0}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-md px-4 py-2 text-sm font-medium transition"
        >
          {saving ? "Adding…" : "Add service"}
        </button>
      </form>
    </div>
  );
}
