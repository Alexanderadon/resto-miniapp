import type { ComponentProps } from "react";
import { cn } from "./cn";

const VARIANTS = {
  /** Мягкая заливка бренда — «+» на карточке блюда */
  soft: "bg-brand-soft text-brand hover:bg-brand-soft/85 active:bg-brand-soft/75",
  /** Прозрачная — крестики, служебные иконки */
  ghost: "bg-transparent text-muted hover:bg-line/50 active:bg-line/60",
} as const;

export interface IconButtonProps extends ComponentProps<"button"> {
  /** Обязательное доступное имя — кнопка без текста */
  "aria-label": string;
  variant?: keyof typeof VARIANTS;
}

/** Квадратная кнопка-иконка 44×44 (WCAG touch-target). */
export function IconButton({
  variant = "soft",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-button select-none",
        "transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
