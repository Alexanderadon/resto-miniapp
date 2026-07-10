/**
 * Обёртка над Telegram.WebApp.HapticFeedback (ui-spec «Общие паттерны»):
 * вне Telegram (dev в браузере, SSR) — тихий no-op, ошибки глушатся.
 */

type ImpactStyle = "light" | "medium";
type NotificationType = "success" | "error" | "warning";

interface TelegramHapticFeedback {
  impactOccurred(style: string): void;
  notificationOccurred(type: string): void;
  selectionChanged(): void;
}

function getHapticFeedback(): TelegramHapticFeedback | null {
  if (typeof window === "undefined") return null;
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: TelegramHapticFeedback } };
    }
  ).Telegram;
  return tg?.WebApp?.HapticFeedback ?? null;
}

export const haptic = {
  impact(style: ImpactStyle): void {
    try {
      getHapticFeedback()?.impactOccurred(style);
    } catch {
      // no-op вне Telegram
    }
  },
  notification(type: NotificationType): void {
    try {
      getHapticFeedback()?.notificationOccurred(type);
    } catch {
      // no-op вне Telegram
    }
  },
  selection(): void {
    try {
      getHapticFeedback()?.selectionChanged();
    } catch {
      // no-op вне Telegram
    }
  },
};
