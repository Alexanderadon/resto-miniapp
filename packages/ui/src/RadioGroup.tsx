"use client";

import { useId } from "react";
import { cn } from "./cn";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  /** Подпись под заголовком («Оплата после подтверждения заказа») */
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string> {
  options: RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Имя radio-группы; по умолчанию генерируется */
  name?: string;
  /** Доступное имя группы для скринридеров */
  label?: string;
  className?: string;
}

/**
 * Группа радио-строк: строки ≥44px, кружок справа, disabled-опции
 * приглушены, подпись (`description`) остаётся видимой.
 */
export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  name,
  label,
  className,
}: RadioGroupProps<T>) {
  const autoName = useId();
  const groupName = name ?? autoName;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-col divide-y divide-line", className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex min-h-11 items-center justify-between gap-3 py-3",
              option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-[0.9375rem] font-medium text-ink">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 text-caption text-muted">{option.description}</span>
              )}
            </span>
            <input
              type="radio"
              className="peer sr-only"
              name={groupName}
              value={option.value}
              checked={checked}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5.5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                checked ? "border-brand" : "border-line",
              )}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full bg-brand transition-transform duration-150",
                  checked ? "scale-100" : "scale-0",
                )}
              />
            </span>
          </label>
        );
      })}
    </div>
  );
}
