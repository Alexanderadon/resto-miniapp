"use client";

// Горизонтальные чипсы-слоты времени самовывоза (ui-spec §4).
// generation === null → слоты ещё генерируются (после маунта) → скелетоны.

import { useDragScroll } from "@repo/ui";
import { haptic } from "@/shared/lib/haptics";
import type { SlotGeneration } from "../lib/time-slots";

type Props = {
  generation: SlotGeneration | null;
  value: string | null;
  onChange: (iso: string) => void;
  error?: string;
  disabled?: boolean;
};

export function TimeSlotPicker({
  generation,
  value,
  onChange,
  error,
  disabled,
}: Props) {
  const drag = useDragScroll<HTMLDivElement>();

  if (!generation) {
    return (
      <div className="flex gap-2 py-1" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-11 w-24 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {generation.day === "tomorrow" && (
        <p className="mb-2 rounded-button bg-brand-soft px-3 py-2 text-caption text-ink">
          Сегодня уже не успеем — откроемся завтра в 10:00
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Время самовывоза"
        ref={drag.ref}
        {...drag.handlers}
        className="-mx-4 flex cursor-grab gap-2 overflow-x-auto px-4 py-1 select-none scrollbar-none"
      >
        {generation.slots.map((slot) => {
          const active = slot.iso === value;
          return (
            <button
              key={slot.iso}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => {
                haptic.selection();
                onChange(slot.iso);
              }}
              className={`tap-target shrink-0 whitespace-nowrap rounded-chip border px-4 text-sm font-medium transition-colors ${
                active
                  ? "border-brand bg-brand text-on-brand"
                  : "border-line bg-surface text-ink"
              }`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-caption text-danger">{error}</p>}
    </div>
  );
}
