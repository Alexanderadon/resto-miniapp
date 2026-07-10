// Фильтр списка заказов по статусу (?status= в /admin).
// PENDING_PAYMENT сознательно отсутствует во всех наборах: заказ до оплаты
// не виден кухне и появляется в списке только после подтверждения оплаты.
import type { OrderStatus } from "@repo/db";

export type StatusFilterConfig = {
  value: string;
  label: string;
  statuses: readonly OrderStatus[];
  emptyText: string;
};

export const STATUS_FILTERS = [
  {
    value: "all",
    label: "Все",
    statuses: ["NEW", "CONFIRMED", "COOKING", "READY", "DONE", "CANCELLED"],
    emptyText: "Пока нет заказов",
  },
  {
    value: "new",
    label: "Новые",
    statuses: ["NEW"],
    emptyText: "Нет новых заказов",
  },
  {
    value: "cooking",
    label: "Готовятся",
    statuses: ["CONFIRMED", "COOKING"],
    emptyText: "Нет заказов в работе",
  },
  {
    value: "ready",
    label: "Готовы",
    statuses: ["READY"],
    emptyText: "Нет заказов со статусом „Готовы“",
  },
  {
    value: "done",
    label: "Выданы",
    statuses: ["DONE"],
    emptyText: "Нет выданных заказов",
  },
  {
    value: "cancelled",
    label: "Отменены",
    statuses: ["CANCELLED"],
    emptyText: "Нет отменённых заказов",
  },
] as const satisfies readonly StatusFilterConfig[];

export type StatusFilterValue = (typeof STATUS_FILTERS)[number]["value"];

/** Безопасный разбор searchParams: неизвестное значение → «Все». */
export function parseStatusFilter(raw: string | string[] | undefined): StatusFilterValue {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const found = STATUS_FILTERS.find((f) => f.value === candidate);
  return found ? found.value : "all";
}

export function filterConfig(value: StatusFilterValue): StatusFilterConfig {
  return STATUS_FILTERS.find((f) => f.value === value) ?? STATUS_FILTERS[0];
}
