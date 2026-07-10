"use client";

import Image from "next/image";
import { IconButton, Stepper, formatTenge } from "@repo/ui";
import { useCartStore } from "@/entities/cart";
import type { MenuItemData } from "@/entities/menu";
import { haptic } from "@/shared/lib/haptics";

type DishCardProps = {
  item: MenuItemData;
  /** Тап по карточке (не по «+»/степперу) — открыть bottom sheet блюда */
  onOpen: (item: MenuItemData) => void;
  /**
   * false до восстановления корзины из localStorage: SSR-разметка и первый
   * клиентский рендер совпадают (везде «+»), степпер появляется после гидрации.
   */
  hydrated: boolean;
};

export function DishCard({ item, onOpen, hydrated }: DishCardProps) {
  const quantity = useCartStore(
    (state) =>
      state.items.find((cartItem) => cartItem.menuItemId === item.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((state) => state.addItem);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);

  const inCart = hydrated && quantity > 0;

  const handleAdd = () => {
    haptic.impact("light");
    addItem({
      menuItemId: item.id,
      slug: item.slug,
      name: item.name,
      priceTenge: item.priceTenge,
      imageUrl: item.imageUrl,
    });
  };

  const handleIncrement = () => {
    haptic.impact("light");
    increment(item.id);
  };

  const handleDecrement = () => {
    haptic.impact("light");
    decrement(item.id);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex-1 text-left"
        aria-label={`Подробнее: ${item.name}`}
      >
        <div className="relative aspect-square w-full bg-line">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="50vw"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center text-4xl"
            >
              🍽️
            </div>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[2.5em] px-3 pt-2 text-sm font-medium leading-snug text-ink">
          {item.name}
        </h3>
      </button>

      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
        <span className="text-price text-ink">{formatTenge(item.priceTenge)}</span>
        {inCart ? (
          <Stepper
            value={quantity}
            itemName={item.name}
            onChange={(next) =>
              next > quantity ? handleIncrement() : handleDecrement()
            }
          />
        ) : (
          <IconButton
            aria-label={`Добавить ${item.name}`}
            onClick={handleAdd}
            className="bg-brand-soft text-brand"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
        )}
      </div>
    </article>
  );
}
