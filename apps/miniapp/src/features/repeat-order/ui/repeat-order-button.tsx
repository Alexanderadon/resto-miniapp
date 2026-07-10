"use client";

// «Повторить заказ»: доступные позиции — в корзину по текущим ценам,
// недоступные пропускаются со строкой-пояснением под кнопкой.
// Повтор отменённого заказа — валидный кейс (кнопка не прячется).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { useCartStore } from "@/entities/cart";
import { haptic } from "@/shared/lib/haptics";
import type { RepeatableItem } from "../model/types";

/** Пауза перед переходом в корзину — дать прочитать строку о пропущенных. */
const SKIPPED_NOTICE_MS = 1600;

export function RepeatOrderButton({ items }: { items: RepeatableItem[] }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [pending, setPending] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  const availableItems = items.filter(
    (item): item is Extract<RepeatableItem, { available: true }> =>
      item.available,
  );
  const skippedNames = items
    .filter((item) => !item.available)
    .map((item) => item.name);
  const nothingAvailable = availableItems.length === 0;

  const handleClick = () => {
    if (pending || nothingAvailable) return;
    setPending(true);

    for (const item of availableItems) {
      addItem(
        {
          menuItemId: item.menuItemId,
          slug: item.slug,
          name: item.name,
          priceTenge: item.priceTenge,
          imageUrl: item.imageUrl,
        },
        item.quantity,
      );
    }

    if (skippedNames.length > 0) {
      haptic.notification("warning");
      setShowSkipped(true);
      redirectTimer.current = setTimeout(
        () => router.push("/cart"),
        SKIPPED_NOTICE_MS,
      );
    } else {
      haptic.notification("success");
      router.push("/cart");
    }
  };

  return (
    <div className="w-full">
      <Button
        variant="secondary"
        fullWidth
        disabled={nothingAvailable || pending}
        onClick={handleClick}
        className="tap-target"
      >
        {pending ? "Добавляем в корзину…" : "Повторить заказ"}
      </Button>
      {nothingAvailable && (
        <p className="mt-1 text-center text-caption text-muted">
          Эти блюда уже недоступны
        </p>
      )}
      {showSkipped && (
        <p className="mt-1 text-center text-caption text-muted">
          Недоступны и пропущены: {skippedNames.join(", ")}
        </p>
      )}
    </div>
  );
}
