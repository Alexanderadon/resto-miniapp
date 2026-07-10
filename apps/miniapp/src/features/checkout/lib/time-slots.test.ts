import { describe, expect, it } from "vitest";
import { generateTimeSlots } from "./time-slots";

// Все даты создаются в ЛОКАЛЬНОМ времени машины (модуль работает в локальном
// времени устройства), поэтому тесты детерминированы в любой таймзоне
// с офсетом, кратным 15 минутам (как и допущение самого модуля).

const STEP_MS = 15 * 60 * 1000;
const LEAD_MS = 30 * 60 * 1000;

/** Локальные часы:минуты слота */
function localHM(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 10 июля 2026, локальное время */
function at(hours: number, minutes: number, ms = 0): Date {
  return new Date(2026, 6, 10, hours, minutes, 0, ms);
}

describe("generateTimeSlots", () => {
  it("первый слот не раньше now+30мин и округлён вверх к шагу 15 (12:03 → 12:45)", () => {
    const now = at(12, 3);
    const { day, slots } = generateTimeSlots(now);

    expect(day).toBe("today");
    expect(localHM(slots[0]!.iso)).toBe("12:45");
    expect(new Date(slots[0]!.iso).getTime()).toBeGreaterThanOrEqual(
      now.getTime() + LEAD_MS,
    );
  });

  it("now ровно на границе шага (12:00) — первый слот 12:30 без лишнего округления", () => {
    const { day, slots } = generateTimeSlots(at(12, 0));

    expect(day).toBe("today");
    expect(localHM(slots[0]!.iso)).toBe("12:30");
  });

  it("шаг между всеми слотами ровно 15 минут, последний слот дня — 21:30", () => {
    const { slots } = generateTimeSlots(at(12, 0));

    for (let i = 1; i < slots.length; i++) {
      const diff =
        new Date(slots[i]!.iso).getTime() - new Date(slots[i - 1]!.iso).getTime();
      expect(diff).toBe(STEP_MS);
    }
    expect(localHM(slots[slots.length - 1]!.iso)).toBe("21:30");
  });

  it("граница 21:00 — сегодня остаётся ровно один слот 21:30", () => {
    const { day, slots } = generateTimeSlots(at(21, 0));

    expect(day).toBe("today");
    expect(slots).toHaveLength(1);
    expect(localHM(slots[0]!.iso)).toBe("21:30");
  });

  it("21:00:00.001 — 21:30 уже не успеваем, слоты переезжают на завтра", () => {
    const { day } = generateTimeSlots(at(21, 0, 1));
    expect(day).toBe("tomorrow");
  });

  it("21:20 — конец дня пройден, слоты на завтра с 10:00", () => {
    const now = at(21, 20);
    const { day, slots } = generateTimeSlots(now);

    expect(day).toBe("tomorrow");
    expect(localHM(slots[0]!.iso)).toBe("10:00");
    const first = new Date(slots[0]!.iso);
    expect(first.getDate()).toBe(now.getDate() + 1);
    expect(localHM(slots[slots.length - 1]!.iso)).toBe("21:30");
  });

  it("23:00 — завтра полный день: 47 слотов с 10:00 до 21:30", () => {
    const { day, slots } = generateTimeSlots(at(23, 0));

    expect(day).toBe("tomorrow");
    // (21:30 − 10:00) / 15мин + 1 = 46 + 1
    expect(slots).toHaveLength(47);
    expect(localHM(slots[0]!.iso)).toBe("10:00");
    expect(localHM(slots[46]!.iso)).toBe("21:30");
  });

  it("09:00 до открытия — первый слот прижат к 10:00, день сегодняшний", () => {
    const now = at(9, 0);
    const { day, slots } = generateTimeSlots(now);

    expect(day).toBe("today");
    expect(localHM(slots[0]!.iso)).toBe("10:00");
    expect(new Date(slots[0]!.iso).getDate()).toBe(now.getDate());
    expect(slots).toHaveLength(47);
  });

  it("первый сегодняшний слот подписан «Через N мин», остальные — просто временем", () => {
    const { slots } = generateTimeSlots(at(9, 0));

    // 09:00 → первый слот 10:00, до него ровно 60 минут
    expect(slots[0]!.label).toMatch(/^Через 60 мин/);
    expect(slots[1]!.label).not.toMatch(/^Через/);
  });

  it("для завтрашних слотов подпись «Через N мин» не используется", () => {
    const { slots } = generateTimeSlots(at(23, 0));
    expect(slots[0]!.label).not.toMatch(/^Через/);
  });

  it("все слоты сегодня укладываются в рабочие часы и не раньше now+30", () => {
    const now = at(20, 47);
    const { day, slots } = generateTimeSlots(now);

    expect(day).toBe("today");
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const t = new Date(slot.iso).getTime();
      expect(t).toBeGreaterThanOrEqual(now.getTime() + LEAD_MS);
      expect(t).toBeLessThanOrEqual(at(21, 30).getTime());
    }
  });
});
