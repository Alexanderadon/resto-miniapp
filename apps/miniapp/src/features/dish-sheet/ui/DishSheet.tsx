"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BottomSheet, Button, Stepper, formatTenge } from "@repo/ui";
import { useCartStore } from "@/entities/cart";
import type { MenuItemData } from "@/entities/menu";
import { haptic } from "@/shared/lib/haptics";

/** Разумный потолок на одну позицию — защита от «залипшего» плюса */
const MAX_QTY = 20;
const MIN_QTY = 1;

type DishSheetProps = {
  /** Данные уже есть из каталога — догрузки нет */
  item: MenuItemData | null;
  open: boolean;
  onClose: () => void;
};

export function DishSheet({ item, open, onClose }: DishSheetProps) {
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const remove = useCartStore((state) => state.remove);

  const cartQuantity = item
    ? (cartItems.find((cartItem) => cartItem.menuItemId === item.id)?.quantity ?? 0)
    : 0;
  const inCart = cartQuantity > 0;

  const [quantity, setQuantity] = useState(MIN_QTY);
  /** Warning-haptic на границе диапазона — один раз, сбрасывается при изменении */
  const limitWarnedRef = useRef(false);

  const itemId = item?.id;
  useEffect(() => {
    if (open && itemId) {
      setQuantity(cartQuantity > 0 ? cartQuantity : MIN_QTY);
      limitWarnedRef.current = false;
    }
    // cartQuantity намеренно не в deps: сбрасываем счётчик только при открытии
    // шита или смене блюда, а не при фоновых изменениях корзины.
  }, [open, itemId]);

  const handleIncrement = () => {
    if (quantity >= MAX_QTY) {
      if (!limitWarnedRef.current) {
        haptic.notification("warning");
        limitWarnedRef.current = true;
      }
      return;
    }
    limitWarnedRef.current = false;
    haptic.impact("light");
    setQuantity((current) => Math.min(current + 1, MAX_QTY));
  };

  const handleDecrement = () => {
    if (quantity <= MIN_QTY) {
      if (!limitWarnedRef.current) {
        haptic.notification("warning");
        limitWarnedRef.current = true;
      }
      return;
    }
    limitWarnedRef.current = false;
    haptic.impact("light");
    setQuantity((current) => Math.max(current - 1, MIN_QTY));
  };

  const handleConfirm = () => {
    if (!item) return;
    // Контракт addItem не гарантирует set-семантику, поэтому «Обновить» —
    // это remove + addItem с нужным количеством.
    if (inCart) {
      remove(item.id);
    }
    addItem(
      {
        menuItemId: item.id,
        slug: item.slug,
        name: item.name,
        priceTenge: item.priceTenge,
        imageUrl: item.imageUrl,
      },
      quantity,
    );
    haptic.notification("success");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      {item ? (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-line">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center text-5xl"
              >
                🍽️
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
            <h2 className="text-title text-ink">{item.name}</h2>
            {item.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 pt-3 pb-safe-3">
            <Stepper
              value={quantity}
              min={1}
              max={20}
              itemName={item.name}
              onChange={(next) =>
                next > quantity ? handleIncrement() : handleDecrement()
              }
            />
            <Button className="flex-1" onClick={handleConfirm}>
              {inCart ? "Обновить" : "В корзину"} ・{" "}
              {formatTenge(item.priceTenge * quantity)}
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
