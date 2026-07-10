import type { ComponentProps } from "react";
import { cn } from "./cn";

export interface CardProps extends ComponentProps<"div"> {
  /** Внутренний отступ p-4; `false` — для карточек с флаш-контентом (фото) */
  padded?: boolean;
}

/** Поверхность-карточка: `bg-surface`, радиус `card`, тень `card`. */
export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn("rounded-card bg-surface shadow-card", padded && "p-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
