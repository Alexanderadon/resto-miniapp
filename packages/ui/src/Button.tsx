import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

const VARIANTS = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-press active:bg-brand-press",
  secondary:
    "bg-brand-soft text-brand hover:bg-brand-soft/85 active:bg-brand-soft/75",
  ghost: "bg-transparent text-brand hover:bg-brand-soft/60 active:bg-brand-soft/75",
  danger:
    "bg-danger-soft text-danger hover:bg-danger-soft/85 active:bg-danger-soft/75",
} as const;

const SIZES = {
  md: "h-11 px-4 text-[0.9375rem]",
  lg: "h-13 px-5 text-base",
} as const;

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Показывает спиннер и блокирует кнопку */
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Основная кнопка. `type="button"` по умолчанию —
 * для сабмита формы передавайте `type="submit"` явно.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-button font-semibold whitespace-nowrap select-none",
        "transition active:scale-[0.98] disabled:pointer-events-none",
        !loading && "disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={18} />}
      {children}
    </button>
  );
}
