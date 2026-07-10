// Форматирование дат/подписей админки. Чистые функции: используются
// и в клиентских компонентах, и в server action (текст уведомления клиенту).
// Время всегда в часовом поясе ресторана — Алматы.
import type { PaymentMethod } from "@repo/db";

const ALMATY_TZ = "Asia/Almaty";

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ALMATY_TZ,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  timeZone: ALMATY_TZ,
});

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** «15:00» */
export function formatTimeAlmaty(value: Date | string): string {
  return timeFormatter.format(toDate(value));
}

/** «10.07» */
export function formatDateAlmaty(value: Date | string): string {
  return dateFormatter.format(toDate(value));
}

/** «10.07, 15:00» */
export function formatDateTimeAlmaty(value: Date | string): string {
  const date = toDate(value);
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

export function paymentLabel(method: PaymentMethod): string {
  return method === "CASH" ? "Наличные" : "Картой онлайн";
}

export function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** «3 позиции» — для свёрнутого состава заказа */
export function itemsCountLabel(count: number): string {
  return `${count} ${pluralizeRu(count, "позиция", "позиции", "позиций")}`;
}
