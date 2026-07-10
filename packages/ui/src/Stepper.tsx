"use client";

import { cn } from "./cn";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Нижняя граница; в корзине 0 = удаление позиции (решает потребитель) */
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Название позиции для aria-label кнопок («Уменьшить — Оливье») */
  itemName?: string;
  className?: string;
}

/** Степпер количества: кнопки −/+ 44×44, счётчик tabular-nums. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled = false,
  itemName,
  className,
}: StepperProps) {
  const suffix = itemName ? ` — ${itemName}` : "";

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };
  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const buttonClass = cn(
    "grid size-11 shrink-0 place-items-center rounded-button text-brand",
    "transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  );

  return (
    <div
      role="group"
      aria-label={itemName ? `Количество${suffix}` : "Количество"}
      className={cn("inline-flex items-center rounded-button bg-brand-soft", className)}
    >
      <button
        type="button"
        aria-label={`Уменьшить${suffix}`}
        disabled={disabled || value <= min}
        onClick={decrement}
        className={buttonClass}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
      <span
        aria-live="polite"
        className="min-w-7 text-center text-[0.9375rem] font-semibold text-ink tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Увеличить${suffix}`}
        disabled={disabled || value >= max}
        onClick={increment}
        className={buttonClass}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
