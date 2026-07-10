// Форматирование времени самовывоза. Ресторан в Алматы — серверные строки
// (чек в Telegram, страница заказа) всегда в Asia/Almaty, независимо от
// таймзоны сервера (Vercel — UTC).

const ALMATY_TZ = "Asia/Almaty";
const DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyInAlmaty(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ALMATY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** «сегодня, 15:00» / «завтра, 10:15» / «12 июля, 15:00» */
export function formatPickupTime(date: Date, now: Date = new Date()): string {
  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone: ALMATY_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const key = dateKeyInAlmaty(date);
  if (key === dateKeyInAlmaty(now)) return `сегодня, ${time}`;
  if (key === dateKeyInAlmaty(new Date(now.getTime() + DAY_MS))) {
    return `завтра, ${time}`;
  }

  const day = new Intl.DateTimeFormat("ru-RU", {
    timeZone: ALMATY_TZ,
    day: "numeric",
    month: "long",
  }).format(date);
  return `${day}, ${time}`;
}
