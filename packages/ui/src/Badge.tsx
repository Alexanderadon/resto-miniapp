import type { ComponentProps } from "react";
import { cn } from "./cn";

const TONES = {
  neutral: "border border-line bg-bg text-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
} as const;

export type BadgeTone = keyof typeof TONES;

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
}

/** Компактный бейдж-«таблетка»: «Острое», «Вегетарианское», «Закончилось». */
export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-caption font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
