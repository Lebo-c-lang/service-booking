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
            className={`w-full text-left rounded-lg border px-4 py-3 transition ${
              isSelected
                ? "border-teal-600 bg-teal-50"
                : "border-line bg-white hover:border-teal-400"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-ink">{service.name}</span>
              <span className="text-sm text-ink/60">
                {service.duration_minutes} min
              </span>
            </div>
            <div className="text-sm text-ink/70 mt-0.5">
              ₦{Number(service.price).toLocaleString()}
            </div>
          </button>
        );
      })}
    </div>
  );
}
