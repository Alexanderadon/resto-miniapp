"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, InputEvent } from "react";
import { cn } from "./cn";

export interface TextareaProps extends ComponentProps<"textarea"> {
  label?: string;
  /** Текст ошибки под полем; красит рамку в danger */
  error?: string;
  /** Максимум видимых строк до появления внутреннего скролла */
  maxRows?: number;
}

/**
 * Многострочное поле: авторост до `maxRows` (по умолчанию 4 строки),
 * счётчик символов при заданном `maxLength`.
 * `className` применяется к корневой обёртке.
 */
export function Textarea({
  label,
  error,
  maxRows = 4,
  id,
  className,
  ref,
  value,
  defaultValue,
  maxLength,
  onInput,
  rows = 1,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const errorId = `${textareaId}-error`;

  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const isControlled = value !== undefined;
  const [uncontrolledCount, setUncontrolledCount] = useState(
    () => String(defaultValue ?? "").length,
  );
  const count = isControlled ? String(value ?? "").length : uncontrolledCount;

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const resize = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = window.getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 20;
    const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const maxHeight = Math.round(line * maxRows + padding + border);
    const natural = el.scrollHeight + border;
    el.style.height = `${Math.min(natural, maxHeight)}px`;
    el.style.overflowY = natural > maxHeight ? "auto" : "hidden";
  }, [maxRows]);

  // Пересчёт высоты при монтировании и при изменении controlled-значения
  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleInput = (event: InputEvent<HTMLTextAreaElement>) => {
    resize();
    if (!isControlled) setUncontrolledCount(event.currentTarget.value.length);
    onInput?.(event);
  };

  const showCounter = typeof maxLength === "number";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={textareaId} className="text-caption font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={setRefs}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onInput={handleInput}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "w-full resize-none rounded-button border bg-surface px-3.5 py-3 text-[0.9375rem] leading-snug text-ink",
          "outline-none transition-colors placeholder:text-muted/70",
          error
            ? "border-danger focus:ring-2 focus:ring-danger/20"
            : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20",
        )}
        {...rest}
      />
      {(error || showCounter) && (
        <div className="flex items-start justify-between gap-3">
          {error && (
            <p id={errorId} className="text-caption text-danger">
              {error}
            </p>
          )}
          {showCounter && (
            <span
              className={cn(
                "ml-auto text-caption tabular-nums",
                count >= (maxLength ?? Infinity) ? "text-danger" : "text-muted",
              )}
            >
              {count} / {maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
