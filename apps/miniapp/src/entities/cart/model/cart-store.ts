"use client";

// Корзина живёт на клиенте: zustand 5 + persist (localStorage, ключ "aport-cart").
// Telegram агрессивно убивает webview — корзина обязана переживать перезапуск.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_ITEM_QUANTITY, MIN_ITEM_QUANTITY, type CartItem } from "./types";

type CartState = {
  items: CartItem[];
  /** Добавить позицию; если уже в корзине — увеличивает количество (клэмп 20) */
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  increment: (menuItemId: string) => void;
  /** На минимуме (1) уменьшение удаляет позицию (ui-spec §3) */
  decrement: (menuItemId: string) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
};

function clampQuantity(quantity: number): number {
  return Math.min(
    Math.max(Math.trunc(quantity), MIN_ITEM_QUANTITY),
    MAX_ITEM_QUANTITY,
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.menuItemId === item.menuItemId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuItemId === item.menuItemId
                  ? { ...i, ...item, quantity: clampQuantity(i.quantity + qty) }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: clampQuantity(qty) }],
          };
        }),

      increment: (menuItemId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItemId === menuItemId
              ? { ...i, quantity: clampQuantity(i.quantity + 1) }
              : i,
          ),
        })),

      decrement: (menuItemId) =>
        set((state) => ({
          items: state.items.flatMap((i) => {
            if (i.menuItemId !== menuItemId) return [i];
            if (i.quantity <= MIN_ITEM_QUANTITY) return [];
            return [{ ...i, quantity: i.quantity - 1 }];
          }),
        })),

      remove: (menuItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "aport-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
