// Генерация слотов самовывоза — на клиенте, в локальном времени устройства
// (пользователь физически в Алматы, там же и кафе).
// Правила (ui-spec §4): от now+30 мин, шаг 15 мин, рабочие часы 10:00–21:30;
// если сегодня уже не успеваем — слоты на завтра с notice.

export type TimeSlot = {
  /** ISO 8601 (UTC) — уходит в Server Action как pickupTimeIso */
  iso: string;
  label: string;
};

export type SlotDay = "today" | "tomorrow";

export type SlotGeneration = {
  day: SlotDay;
  slots: TimeSlot[];
};

export const OPENING_HOUR = 10;
const LAST_SLOT_HOUR = 21;
const LAST_SLOT_MINUTE = 30;
const STEP_MS = 15 * 60 * 1000;
const LEAD_MS = 30 * 60 * 1000;

function atTime(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function collectSlots(
  start: Date,
  end: Date,
  now: Date,
  isToday: boolean,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += STEP_MS) {
    const slotDate = new Date(t);
    const isFirstToday = isToday && slots.length === 0;
    const label = isFirstToday
      ? `Через ${Math.round((t - now.getTime()) / 60_000)} мин (${timeLabel(slotDate)})`
      : timeLabel(slotDate);
    slots.push({ iso: slotDate.toISOString(), label });
  }
  return slots;
}

export function generateTimeSlots(now: Date = new Date()): SlotGeneration {
  // Ближайший слот: now + 30 мин, округление вверх до шага 15 мин.
  // Almaty = UTC+5 (целый час), эпоха делится на 15-минутные шаги корректно.
  const earliest = new Date(Math.ceil((now.getTime() + LEAD_MS) / STEP_MS) * STEP_MS);

  const todayOpen = atTime(now, OPENING_HOUR, 0);
  const todayLast = atTime(now, LAST_SLOT_HOUR, LAST_SLOT_MINUTE);

  if (earliest.getTime() <= todayLast.getTime()) {
    const start = earliest < todayOpen ? todayOpen : earliest;
    return { day: "today", slots: collectSlots(start, todayLast, now, true) };
  }

  // Сегодня уже не успеем — открываемся завтра в 10:00.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    day: "tomorrow",
    slots: collectSlots(
      atTime(tomorrow, OPENING_HOUR, 0),
      atTime(tomorrow, LAST_SLOT_HOUR, LAST_SLOT_MINUTE),
      now,
      false,
    ),
  };
}
