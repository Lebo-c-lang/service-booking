import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DashboardServices({ business }) {
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

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
    setError("");

    let uploadedPath;
    try {
      let imageUrl = null;
      if (imageFile) {
        const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[imageFile.type];
        uploadedPath = `${business.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(uploadedPath, imageFile, { contentType: imageFile.type, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("service-images").getPublicUrl(uploadedPath).data.publicUrl;
      }

      const { error: insertError } = await supabase.from("services").insert({
        business_id: business.id,
        name,
        duration_minutes: Number(duration),
        price: Number(price),
        image_url: imageUrl,
      });
      if (insertError) throw insertError;

      setName("");
      setDuration(60);
      setPrice("");
      setImageFile(null);
      await loadServices();
    } catch (saveError) {
      if (uploadedPath) await supabase.storage.from("service-images").remove([uploadedPath]);
      setError(saveError.message || "Couldn't add this service. Please try again.");
    } finally {
      setSaving(false);
    }
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Your menu</p>
        <h2 className="font-display text-3xl text-ink">Services</h2>
      </div>

      <div className="mb-7 space-y-3">
        {services.length === 0 && (
          <p className="rounded-lg border border-dashed border-line bg-white/70 px-5 py-6 text-sm text-ink/60">No services yet. Add your first one below.</p>
        )}
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-[0_2px_10px_rgba(28,48,37,0.03)] sm:gap-4"
          >
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-paper sm:h-[72px] sm:w-24">
              {s.image_url ? (
                <img src={s.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,#e7eddf,#d6e6d9)] text-teal-700">
                  <span className="font-display text-2xl" aria-hidden="true">{s.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{s.name}</div>
              <div className="mt-1 text-sm text-ink/60">
                {s.duration_minutes} min · ₦{Number(s.price).toLocaleString()}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs sm:flex-row sm:items-center sm:gap-3 sm:text-sm">
              <button
                onClick={() => toggleActive(s)}
                className={s.active ? "font-medium text-teal-600" : "text-ink/40"}
              >
                {s.active ? "Active" : "Hidden"}
              </button>
              <button onClick={() => removeService(s)} className="text-red-600/75 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-[0_8px_24px_rgba(28,48,37,0.04)] sm:p-5">
        <h3 className="text-sm font-semibold text-ink">Add a service</h3>
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
        <div>
          <label htmlFor="service-image" className="mb-2 block text-sm font-medium text-ink/75">Service photo <span className="font-normal text-ink/45">(optional)</span></label>
          <div className="flex flex-col gap-3 rounded-md border border-dashed border-line bg-paper/70 p-3 sm:flex-row sm:items-center">
            {imagePreview && <img src={imagePreview} alt="Service preview" className="h-20 w-24 rounded object-cover" />}
            <input
              id="service-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 5 * 1024 * 1024) {
                  setImageFile(null);
                  setError("Choose a JPG, PNG, or WebP image under 5 MB.");
                  e.target.value = "";
                  return;
                }
                setError("");
                setImageFile(file);
              }}
              className="min-w-0 flex-1 text-sm text-ink/65 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700 file:shadow-sm hover:file:bg-teal-50"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink/45">JPG, PNG, or WebP · up to 5 MB</p>
        </div>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name || !price}
          className="rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add service"}
        </button>
      </form>
    </div>
  );
}
