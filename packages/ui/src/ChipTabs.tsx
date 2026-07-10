"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "./cn";

export interface ChipTab<T extends string> {
  value: T;
  label: string;
  /** Счётчик в чипсе («Новые · 3» в админке) */
  badge?: number;
}

export interface ChipTabsProps<T extends string> {
  tabs: ChipTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Горизонтальная лента чипсов-фильтров: скролл без скроллбара,
 * активный чипс — брендовый, roving tabindex + стрелки ←/→.
 */
export function ChipTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: ChipTabsProps<T>) {
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());

  // Активный чипс подъезжает в видимую область
  useEffect(() => {
    buttonRefs.current.get(value)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.value === value);
    if (currentIndex === -1) return;
    const nextIndex =
      event.key === "ArrowRight"
        ? Math.min(currentIndex + 1, tabs.length - 1)
        : Math.max(currentIndex - 1, 0);
    const next = tabs[nextIndex];
    if (!next || next.value === value) return;
    onChange(next.value);
    buttonRefs.current.get(next.value)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? "Категории"}
      onKeyDown={handleKeyDown}
      className={cn("flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              if (node) buttonRefs.current.set(tab.value, node);
              else buttonRefs.current.delete(tab.value);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-chip px-4 text-sm font-medium whitespace-nowrap select-none",
              "transition active:scale-[0.98]",
              active ? "bg-brand text-on-brand" : "border border-line bg-surface text-ink",
            )}
          >
            {tab.label}
            {typeof tab.badge === "number" && tab.badge > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-chip px-1.5 text-xs font-semibold tabular-nums",
                  active ? "bg-on-brand/20" : "bg-brand-soft text-brand",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
