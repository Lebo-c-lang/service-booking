import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import DashboardCalendar from "./DashboardCalendar";
import DashboardServices from "./DashboardServices";
import DashboardSettings from "./DashboardSettings";

const TABS = [
  { key: "calendar", label: "Bookings" },
  { key: "services", label: "Services" },
  { key: "settings", label: "Settings" },
];

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(undefined); // undefined = loading, null = none yet
  const [businessError, setBusinessError] = useState("");
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [tab, setTab] = useState("calendar");

  async function loadBusiness() {
    setBusinessError("");
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      setBusiness(data || null);
    } catch (error) {
      setBusinessError(error.message || "Could not load your business. Please try again.");
    }
  }

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  async function handleCreateBusiness(e) {
    e.preventDefault();
    const name = e.target.name.value;
    const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    setBusinessError("");
    setSavingBusiness(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .insert({ owner_id: session.user.id, name: name.trim(), slug })
        .select()
        .single();
      if (error) throw error;
      setBusiness(data);
      setTab("settings");
    } catch (error) {
      setBusinessError(error.message || "Could not create your business. Please try again.");
    } finally {
      setSavingBusiness(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  if (businessError && business === undefined) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 space-y-3">
        <p className="text-sm text-red-700">{businessError}</p>
        <button onClick={loadBusiness} className="text-sm text-teal-600">Try again</button>
      </div>
    );
  }

  if (business === undefined) {
    return <div className="px-6 py-10 text-sm text-ink/60">Loading…</div>;
  }

  if (business === null) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-xl font-semibold text-ink mb-1">Set up your business</h1>
        <p className="text-sm text-ink/60 mb-6">
          This creates your public booking page.
        </p>
        <form onSubmit={handleCreateBusiness} className="space-y-3">
          <input
            name="name"
            type="text"
            placeholder="Business name"
            className="w-full border border-line rounded-md px-3 py-2 text-sm"
            required
          />
          {businessError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {businessError}
            </div>
          )}
          <button
            type="submit"
            disabled={savingBusiness}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-md py-2.5 text-sm font-medium transition"
          >
            {savingBusiness ? "Creating…" : "Create business"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink">{business.name}</div>
            <a
              href={`/b/${business.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-teal-600"
            >
              /b/{business.slug} ↗
            </a>
          </div>
          <button onClick={handleSignOut} className="text-sm text-ink/50">
            Sign out
          </button>
        </div>
        <nav className="max-w-3xl mx-auto px-4 flex gap-6 border-t border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm border-b-2 transition ${
                tab === t.key
                  ? "border-teal-600 text-ink font-medium"
                  : "border-transparent text-ink/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {tab === "calendar" && <DashboardCalendar business={business} />}
        {tab === "services" && <DashboardServices business={business} />}
        {tab === "settings" && (
          <DashboardSettings business={business} onUpdated={loadBusiness} />
        )}
      </main>
    </div>
  );
}
