import { cn } from "./cn";

export interface SkeletonProps {
  /** Ширина: число (px) или CSS-значение ("100%", "12rem") */
  w?: number | string;
  /** Высота: число (px) или CSS-значение */
  h?: number | string;
  /** border-radius: число (px) или CSS-значение ("9999px", "1rem") */
  rounded?: number | string;
  className?: string;
}

/** Скелетон-заглушка с пульсацией (утилита `skeleton` из globals.css). */
export function Skeleton({ w, h, rounded, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton", className)}
      style={{ width: w, height: h, borderRadius: rounded }}
    />
  );
}
