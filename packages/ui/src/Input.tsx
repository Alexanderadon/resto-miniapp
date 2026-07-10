"use client";

import { useId } from "react";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export interface InputProps extends ComponentProps<"input"> {
  label?: string;
  /** Текст ошибки под полем; красит рамку в danger */
  error?: string;
}

/**
 * Текстовое поле с лейблом и инлайн-ошибкой.
 * `className` применяется к корневой обёртке; `inputMode`, `placeholder`
 * и остальные атрибуты пробрасываются на `<input>`.
 */
export function Input({ label, error, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-caption font-medium text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 w-full rounded-button border bg-surface px-3.5 text-[0.9375rem] text-ink",
          "outline-none transition-colors placeholder:text-muted/70",
          error
            ? "border-danger focus:ring-2 focus:ring-danger/20"
            : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20",
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
