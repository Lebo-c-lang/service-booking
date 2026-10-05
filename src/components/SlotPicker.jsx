function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(date) {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function SlotPicker({
  selectedDate,
  onDateChange,
  slots,
  loading,
  selectedSlot,
  onSelectSlot,
}) {
  const dateInputValue = selectedDate.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-ink">
          {formatDateLabel(selectedDate)}
        </label>
        <input
          type="date"
          value={dateInputValue}
          min={today}
          onChange={(e) => onDateChange(new Date(e.target.value + "T00:00:00"))}
          className="border border-line rounded-md px-2 py-1 text-sm"
        />
      </div>

      {loading && <p className="text-sm text-ink/60">Checking availability…</p>}

      {!loading && slots.length === 0 && (
        <p className="text-sm text-ink/60">
          No times available this day — try another date.
        </p>
      )}

      {!loading && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const isSelected =
              selectedSlot && selectedSlot.start.getTime() === slot.start.getTime();
            return (
              <button
                key={slot.start.toISOString()}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  isSelected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-line bg-white hover:border-teal-400"
                }`}
              >
                {formatTime(slot.start)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
