import { cn } from "./cn";

export interface SpinnerProps {
  /** Размер в px, по умолчанию 20 */
  size?: number;
  className?: string;
}

/** Круговой индикатор загрузки. Цвет — currentColor родителя. */
export function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0 animate-spin", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
