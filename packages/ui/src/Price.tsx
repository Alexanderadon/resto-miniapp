import type { ComponentProps } from "react";
import { cn } from "./cn";
import { formatTenge } from "./format";

export interface PriceProps extends ComponentProps<"span"> {
  /** Сумма в целых тенге */
  tenge: number;
}

/**
 * Цена: `text-price` (17px/600, tabular-nums), формат «2 400 ₸».
 * Цвет наследуется — на брендовом фоне задавайте `className="text-on-brand"`.
 */
export function Price({ tenge, className, ...rest }: PriceProps) {
  return (
    <span data-numeric className={cn("text-price", className)} {...rest}>
      {formatTenge(tenge)}
    </span>
  );
}
