"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { haptic } from "@/shared/lib/haptics";
import { cancelOrder } from "../api/cancel-order";

/** Кнопка отмены с подтверждением вторым тапом (окно 4 секунды). */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  const handleClick = () => {
    if (!confirming) {
      haptic.impact("light");
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    startTransition(async () => {
      try {
        const result = await cancelOrder(orderId);
        if (result.ok) {
          haptic.notification("warning");
        } else {
          haptic.notification("error");
          setError(result.message);
        }
        router.refresh();
      } catch {
        haptic.notification("error");
        setError("Нет соединения — попробуйте ещё раз");
      }
      setConfirming(false);
    });
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="tap-target flex w-full items-center justify-center rounded-button px-4 py-3 font-medium text-danger transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending
          ? "Отменяем…"
          : confirming
            ? "Точно отменить заказ?"
            : "Отменить заказ"}
      </button>
      {error && (
        <p className="mt-1 text-center text-caption text-danger">{error}</p>
      )}
    </div>
  );
}
