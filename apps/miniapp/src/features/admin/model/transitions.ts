// Строгая карта переходов статусов заказа (ui-spec §6):
//   NEW → CONFIRMED | CANCELLED
//   CONFIRMED → COOKING | CANCELLED
//   COOKING → READY | CANCELLED
//   READY → DONE
// Всё остальное (включая любые переходы из/в PENDING_PAYMENT) запрещено.
//
// ВАЖНО: только type-import из @repo/db — модуль попадает в клиентский бандл,
// а рантайм-вход @repo/db создаёт PrismaClient при импорте.
import type { OrderStatus } from "@repo/db";

export type ForwardTransition = {
  to: OrderStatus;
  /** Подпись кнопки действия в админке */
  label: string;
};

const FORWARD_TRANSITIONS: Partial<Record<OrderStatus, ForwardTransition>> = {
  NEW: { to: "CONFIRMED", label: "Принять" },
  CONFIRMED: { to: "COOKING", label: "Начать готовить" },
  COOKING: { to: "READY", label: "Готов" },
  READY: { to: "DONE", label: "Выдан" },
};

const CANCELLABLE_STATUSES: readonly OrderStatus[] = ["NEW", "CONFIRMED", "COOKING"];

/** Основной («вперёд по конвейеру») переход для статуса, если он есть. */
export function forwardTransition(status: OrderStatus): ForwardTransition | null {
  return FORWARD_TRANSITIONS[status] ?? null;
}

/** Можно ли отменить заказ в этом статусе. READY уже не отменяем — блюдо готово. */
export function canCancel(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

/** Единственный источник истины для сервера и UI. */
export function isAllowedTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "CANCELLED") return canCancel(from);
  return FORWARD_TRANSITIONS[from]?.to === to;
}
