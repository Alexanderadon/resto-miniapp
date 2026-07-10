"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTenge } from "@repo/ui";
import { totalCount, totalTenge, useCartStore } from "@/entities/cart";
import { haptic } from "@/shared/lib/haptics";

/**
 * Sticky-бар корзины внизу каталога.
 * Появляется при totalCount > 0 слайдом снизу (200ms), тап — переход в /cart.
 * До гидрации persist-стора считаем корзину пустой (SSR-совместимость).
 */
export function CartBar() {
  const items = useCartStore((state) => state.items);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const count = hydrated ? totalCount(items) : 0;
  const sum = hydrated ? totalTenge(items) : 0;
  const visible = count > 0;

  // Haptic medium — только на появление бара после реального добавления,
  // не на восстановление корзины из localStorage при загрузке.
  const prevVisibleRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (prevVisibleRef.current === false && visible) {
      haptic.impact("medium");
    }
    prevVisibleRef.current = visible;
  }, [hydrated, visible]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-20 px-4 pb-safe transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <Link
        href="/cart"
        tabIndex={visible ? 0 : -1}
        aria-live="polite"
        className="mb-3 flex h-[52px] items-center justify-between rounded-button bg-brand px-4 text-on-brand shadow-bar active:bg-brand-press"
      >
        <span className="font-semibold">Корзина ・ {count}</span>
        <span className="text-price">{formatTenge(sum)}</span>
      </Link>
    </div>
  );
}
