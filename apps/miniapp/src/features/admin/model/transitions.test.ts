import type { OrderStatus } from "@repo/db";
import { describe, expect, it } from "vitest";
import { canCancel, forwardTransition, isAllowedTransition } from "./transitions";

const ALL_STATUSES: readonly OrderStatus[] = [
  "PENDING_PAYMENT",
  "NEW",
  "CONFIRMED",
  "COOKING",
  "READY",
  "DONE",
  "CANCELLED",
];

/** Полный белый список разрешённых переходов (ui-spec §6) */
const ALLOWED_PAIRS: ReadonlyArray<[OrderStatus, OrderStatus]> = [
  ["NEW", "CONFIRMED"],
  ["NEW", "CANCELLED"],
  ["CONFIRMED", "COOKING"],
  ["CONFIRMED", "CANCELLED"],
  ["COOKING", "READY"],
  ["COOKING", "CANCELLED"],
  ["READY", "DONE"],
];

describe("isAllowedTransition", () => {
  it.each(ALLOWED_PAIRS)("разрешённый переход %s → %s проходит", (from, to) => {
    expect(isAllowedTransition(from, to)).toBe(true);
  });

  it.each([
    ["NEW", "COOKING"],
    ["NEW", "READY"],
    ["NEW", "DONE"],
    ["CONFIRMED", "READY"],
    ["READY", "CANCELLED"],
    ["PENDING_PAYMENT", "CONFIRMED"],
    ["PENDING_PAYMENT", "NEW"],
    ["PENDING_PAYMENT", "CANCELLED"],
  ] as Array<[OrderStatus, OrderStatus]>)(
    "запрещённый переход %s → %s отклоняется",
    (from, to) => {
      expect(isAllowedTransition(from, to)).toBe(false);
    },
  );

  it("из терминального DONE запрещены переходы в любой статус", () => {
    for (const to of ALL_STATUSES) {
      expect(isAllowedTransition("DONE", to)).toBe(false);
    }
  });

  it("из терминального CANCELLED запрещены переходы в любой статус", () => {
    for (const to of ALL_STATUSES) {
      expect(isAllowedTransition("CANCELLED", to)).toBe(false);
    }
  });

  it("переходы назад по конвейеру запрещены", () => {
    expect(isAllowedTransition("CONFIRMED", "NEW")).toBe(false);
    expect(isAllowedTransition("COOKING", "CONFIRMED")).toBe(false);
    expect(isAllowedTransition("READY", "COOKING")).toBe(false);
    expect(isAllowedTransition("DONE", "READY")).toBe(false);
  });

  it("переход в PENDING_PAYMENT запрещён из любого статуса", () => {
    for (const from of ALL_STATUSES) {
      expect(isAllowedTransition(from, "PENDING_PAYMENT")).toBe(false);
    }
  });

  it("полный перебор 7×7: разрешены ровно пары из белого списка (включая запрет self-переходов)", () => {
    const allowedSet = new Set(ALLOWED_PAIRS.map(([f, t]) => `${f}->${t}`));
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        expect
          .soft(isAllowedTransition(from, to), `${from} -> ${to}`)
          .toBe(allowedSet.has(`${from}->${to}`));
      }
    }
  });
});

describe("forwardTransition", () => {
  it.each([
    ["NEW", "CONFIRMED", "Принять"],
    ["CONFIRMED", "COOKING", "Начать готовить"],
    ["COOKING", "READY", "Готов"],
    ["READY", "DONE", "Выдан"],
  ] as Array<[OrderStatus, OrderStatus, string]>)(
    "для %s основной переход — %s с подписью «%s»",
    (from, to, label) => {
      expect(forwardTransition(from)).toEqual({ to, label });
    },
  );

  it.each(["DONE", "CANCELLED", "PENDING_PAYMENT"] as OrderStatus[])(
    "для %s основного перехода нет (null)",
    (status) => {
      expect(forwardTransition(status)).toBeNull();
    },
  );
});

describe("canCancel", () => {
  it.each(["NEW", "CONFIRMED", "COOKING"] as OrderStatus[])(
    "заказ в статусе %s можно отменить",
    (status) => {
      expect(canCancel(status)).toBe(true);
    },
  );

  it.each(["READY", "DONE", "CANCELLED", "PENDING_PAYMENT"] as OrderStatus[])(
    "заказ в статусе %s отменить нельзя",
    (status) => {
      expect(canCancel(status)).toBe(false);
    },
  );
});
