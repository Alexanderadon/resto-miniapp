// formatTenge живёт в packages/ui (по правилам — там тестов нет),
// поэтому тестируем через публичный импорт из @repo/ui.

import { formatTenge } from "@repo/ui";
import { describe, expect, it } from "vitest";

/** Узкий неразрывный пробел (NARROW NO-BREAK SPACE) — разделитель разрядов и знака валюты. */
const NNBSP = " ";

/** Типографский минус (MINUS SIGN), не дефис. */
const MINUS = "−";

describe("formatTenge", () => {
  it("ноль форматируется как «0 ₸»", () => {
    expect(formatTenge(0)).toBe(`0${NNBSP}₸`);
  });

  it("трёхзначное число без группировки: 950", () => {
    expect(formatTenge(950)).toBe(`950${NNBSP}₸`);
  });

  it("четырёхзначное группируется: 1400 → «1 400 ₸»", () => {
    expect(formatTenge(1400)).toBe(`1${NNBSP}400${NNBSP}₸`);
  });

  it("24000 → «24 000 ₸» именно с U+202F", () => {
    const result = formatTenge(24000);
    expect(result).toBe(`24${NNBSP}000${NNBSP}₸`);
    // Обычного пробела (U+0020) и NBSP (U+00A0) быть не должно
    expect(result).not.toMatch(/[  ]/);
  });

  it("семизначное число: две группы разрядов", () => {
    expect(formatTenge(1234567)).toBe(`1${NNBSP}234${NNBSP}567${NNBSP}₸`);
  });

  it("отрицательная сумма: типографский минус U+2212, группировка сохраняется", () => {
    expect(formatTenge(-1400)).toBe(`${MINUS}1${NNBSP}400${NNBSP}₸`);
    // Именно минус, а не ASCII-дефис
    expect(formatTenge(-1400)).not.toContain("-");
  });

  it("дробные усекаются к нулю, а не округляются: 999.99 → «999 ₸»", () => {
    expect(formatTenge(999.99)).toBe(`999${NNBSP}₸`);
  });

  it("отрицательная дробь усекается к нулю: -1500.7 → «−1 500 ₸»", () => {
    expect(formatTenge(-1500.7)).toBe(`${MINUS}1${NNBSP}500${NNBSP}₸`);
  });

  it("фактическое поведение на -0.5: знак остаётся при нулевой величине — «−0 ₸»", () => {
    expect(formatTenge(-0.5)).toBe(`${MINUS}0${NNBSP}₸`);
  });
});
