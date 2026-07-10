import { cn } from "./cn";

/**
 * Статусы заказа как string-union — синхронизированы с enum OrderStatus
 * в @repo/db (пакет ui намеренно не импортирует db).
 */
export type OrderStatusValue =
  | "PENDING_PAYMENT"
  | "NEW"
  | "CONFIRMED"
  | "COOKING"
  | "READY"
  | "DONE"
  | "CANCELLED";

const NEUTRAL = "border border-line bg-bg text-muted";

const STATUS_META: Record<OrderStatusValue, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Ожидает оплаты", className: NEUTRAL },
  NEW: { label: "Новый", className: "bg-brand text-on-brand" },
  CONFIRMED: { label: "Принят", className: "bg-brand-soft text-brand" },
  COOKING: { label: "Готовится", className: "bg-brand-soft text-brand" },
  READY: { label: "Готов к выдаче", className: "bg-success-soft text-success" },
  DONE: { label: "Выдан", className: NEUTRAL },
  CANCELLED: { label: "Отменён", className: "bg-danger-soft text-danger" },
};

export interface StatusBadgeProps {
  status: OrderStatusValue;
  className?: string;
}

/** Статус заказа: цвет + обязательная текстовая подпись (a11y — не только цвет). */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status] ?? { label: status, className: NEUTRAL };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-caption font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
