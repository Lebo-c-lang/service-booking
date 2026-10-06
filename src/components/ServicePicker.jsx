export default function ServicePicker({ services, selectedId, onSelect }) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-ink/60">
        This business hasn't added any services yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {services.map((service) => {
        const isSelected = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            aria-pressed={isSelected}
            className={`w-full text-left rounded-lg border p-2 transition ${
              isSelected
                ? "border-teal-600 bg-teal-50 shadow-[0_6px_20px_rgba(23,76,61,0.08)]"
                : "border-line bg-white hover:border-teal-400 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md bg-paper sm:h-24 sm:w-28">
                {service.image_url ? (
                  <img src={service.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,#e7eddf,#d6e6d9)] text-teal-700">
                    <span className="font-display text-3xl" aria-hidden="true">{service.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-ink">{service.name}</span>
                  <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${isSelected ? "border-teal-600 bg-teal-600 shadow-[inset_0_0_0_3px_white]" : "border-line"}`} aria-hidden="true" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/60">
                  <span>{service.duration_minutes} min</span>
                  <span className="font-semibold text-teal-700">₦{Number(service.price).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
