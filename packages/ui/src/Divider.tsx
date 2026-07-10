import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Тонкая горизонтальная линия-разделитель (цвет `line`). */
export function Divider({ className, ...rest }: ComponentProps<"hr">) {
  return <hr className={cn("h-px w-full border-0 bg-line", className)} {...rest} />;
}
