import { describe, expect, it } from "vitest";
import { totalCount, totalTenge } from "./selectors";
import type { CartItem } from "./types";

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    menuItemId: "id-1",
    slug: "plov",
    name: "Плов",
    priceTenge: 2400,
    imageUrl: null,
    quantity: 1,
    ...overrides,
  };
}

describe("totalCount", () => {
  it("пустая корзина даёт 0", () => {
    expect(totalCount([])).toBe(0);
  });

  it("одна позиция с количеством 1 даёт 1", () => {
    expect(totalCount([makeItem()])).toBe(1);
  });

  it("суммирует количества нескольких позиций", () => {
    const items = [
      makeItem({ menuItemId: "a", quantity: 3 }),
      makeItem({ menuItemId: "b", quantity: 5 }),
      makeItem({ menuItemId: "c", quantity: 1 }),
    ];
    expect(totalCount(items)).toBe(9);
  });

  it("считает единицы, а не позиции (позиция с quantity 20)", () => {
    expect(totalCount([makeItem({ quantity: 20 })])).toBe(20);
  });
});

describe("totalTenge", () => {
  it("пустая корзина даёт 0", () => {
    expect(totalTenge([])).toBe(0);
  });

  it("одна позиция: цена умножается на количество", () => {
    expect(totalTenge([makeItem({ priceTenge: 950, quantity: 3 })])).toBe(
      2850,
    );
  });

  it("суммирует несколько позиций с разными ценами и количествами", () => {
    const items = [
      makeItem({ menuItemId: "a", priceTenge: 2400, quantity: 2 }), // 4800
      makeItem({ menuItemId: "b", priceTenge: 950, quantity: 1 }), // 950
      makeItem({ menuItemId: "c", priceTenge: 1400, quantity: 4 }), // 5600
    ];
    expect(totalTenge(items)).toBe(11350);
  });

  it("позиция с нулевой ценой не влияет на итог", () => {
    const items = [
      makeItem({ menuItemId: "a", priceTenge: 0, quantity: 5 }),
      makeItem({ menuItemId: "b", priceTenge: 700, quantity: 1 }),
    ];
    expect(totalTenge(items)).toBe(700);
  });

  it("большие суммы считаются без потери точности", () => {
    // 20 позиций по 999 999 ₸ × 20 шт — заведомо больше любого реального чека
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({ menuItemId: `id-${i}`, priceTenge: 999_999, quantity: 20 }),
    );
    expect(totalTenge(items)).toBe(999_999 * 20 * 20); // 399 999 600
  });
});
