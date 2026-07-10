// Чистые селекторы корзины — без zustand, пригодны для unit-тестов.

import type { CartItem } from "./types";

/** Суммарное количество единиц во всех позициях */
export function totalCount(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Итог корзины в тенге (целое) */
export function totalTenge(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceTenge * item.quantity, 0);
}
