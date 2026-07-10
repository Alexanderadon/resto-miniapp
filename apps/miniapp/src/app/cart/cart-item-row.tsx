"use client";

// Строка позиции корзины (ui-spec §3): миниатюра 56px, название,
// цена за штуку, степпер, сумма строки, крестик удаления.

import Image from "next/image";
import { IconButton, Stepper, formatTenge } from "@repo/ui";
import {
  MAX_ITEM_QUANTITY,
  MIN_ITEM_QUANTITY,
  useCartStore,
  type CartItem,
} from "@/entities/cart";
import { haptic } from "@/shared/lib/haptics";

export function CartItemRow({ item }: { item: CartItem }) {
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const remove = useCartStore((s) => s.remove);

  function handleIncrement() {
    if (item.quantity >= MAX_ITEM_QUANTITY) {
      haptic.notification("warning");
      return;
    }
    increment(item.menuItemId);
    haptic.impact("light");
  }

  function handleDecrement() {
    if (item.quantity <= MIN_ITEM_QUANTITY) {
      // Уменьшение с минимума = удаление позиции.
      remove(item.menuItemId);
      haptic.notification("warning");
      return;
    }
    decrement(item.menuItemId);
    haptic.impact("light");
  }

  function handleRemove() {
    remove(item.menuItemId);
    haptic.notification("warning");
  }

  return (
    <li className="flex items-start gap-3 rounded-card bg-surface p-3 shadow-card">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-button bg-brand-soft">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-xl"
            aria-hidden
          >
            🍽️
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
        <p className="text-caption text-muted" data-numeric>
          {formatTenge(item.priceTenge)} за шт.
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Stepper
            value={item.quantity}
            // min=0: минус активен при количестве 1 — декремент удаляет позицию
            min={0}
            max={MAX_ITEM_QUANTITY}
            itemName={item.name}
            onChange={(next) =>
              next > item.quantity ? handleIncrement() : handleDecrement()
            }
          />
          <span className="text-price text-ink" data-numeric>
            {formatTenge(item.priceTenge * item.quantity)}
          </span>
        </div>
      </div>

      <IconButton
        aria-label={`Удалить «${item.name}» из корзины`}
        onClick={handleRemove}
        className="-mr-1 -mt-1 shrink-0 text-muted"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>
    </li>
  );
}
