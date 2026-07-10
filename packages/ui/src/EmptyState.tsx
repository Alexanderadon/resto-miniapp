import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  /** Иконка-эмодзи, например "🥗" */
  icon?: string;
  title: string;
  description?: string;
  /** Слот кнопки действия */
  action?: ReactNode;
  className?: string;
}

/** Пустое состояние: эмодзи в круге, заголовок, подпись, слот кнопки. */
export function EmptyState({
  icon = "🍽️",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div
        aria-hidden="true"
        className="grid size-20 place-items-center rounded-full bg-brand-soft text-4xl leading-none"
      >
        {icon}
      </div>
      <h2 className="mt-4 text-title text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-64 text-[0.9375rem] leading-snug text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
