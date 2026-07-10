"use client";

// Экран корзины (ui-spec §3). Полностью клиентский — данные из zustand-стора,
// БД не нужна. До маунта показываем скелетоны, чтобы SSR-разметка (пустая
// корзина) не конфликтовала с persist-гидрацией localStorage.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, formatTenge } from "@repo/ui";
import { totalTenge, useCartStore } from "@/entities/cart";
import { haptic } from "@/shared/lib/haptics";
import { CartItemRow } from "./cart-item-row";

const CLEAR_CONFIRM_TIMEOUT_MS = 3000;

export function CartView() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const [mounted, setMounted] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => setMounted(true), []);

  // «Очистить» — двойной тап с авто-сбросом подтверждения.
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(
      () => setConfirmClear(false),
      CLEAR_CONFIRM_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [confirmClear]);

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clear();
    setConfirmClear(false);
    haptic.notification("warning");
  }

  if (!mounted) {
    return (
      <div className="min-h-dvh">
        <header className="sticky top-0 z-10 bg-header px-4 py-3">
          <h1 className="text-title text-ink">Корзина</h1>
        </header>
        <div className="space-y-2 px-4 pt-2" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 bg-header px-4 py-3">
          <h1 className="text-title text-ink">Корзина</h1>
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <EmptyState
            title="В корзине пусто"
            description="Загляните в меню — там вкусно"
            action={
              <Link
                href="/"
                className="tap-target inline-flex items-center justify-center rounded-button bg-brand px-6 py-3 font-semibold text-on-brand active:bg-brand-press"
              >
                В меню
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const total = totalTenge(items);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-header px-4 py-3">
        <h1 className="text-title text-ink">Корзина</h1>
        <button
          type="button"
          onClick={handleClear}
          className="tap-target px-2 text-sm font-medium text-danger"
        >
          {confirmClear ? "Точно очистить?" : "Очистить"}
        </button>
      </header>

      <ul className="space-y-2 px-4 pt-2">
        {items.map((item) => (
          <CartItemRow key={item.menuItemId} item={item} />
        ))}
      </ul>

      <div className="px-4 pt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-ink">
            <span>Сумма</span>
            <span data-numeric>{formatTenge(total)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Самовывоз</span>
            <span className="text-success">бесплатно</span>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Итого</span>
              <span className="text-price font-bold text-ink" data-numeric>
                {formatTenge(total)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 mt-auto bg-bg px-4 pt-3 pb-safe-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => router.push("/checkout")}
        >
          Оформить ・ {formatTenge(total)}
        </Button>
      </div>
    </div>
  );
}
