"use client";

// Обновление статуса заказа: router.refresh() каждые 15 секунд,
// пока заказ не в финальном статусе. Haptics: success при входе на экран
// и при смене статуса на READY.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { haptic } from "@/shared/lib/haptics";

const POLL_INTERVAL_MS = 15_000;

type Props = {
  status: string;
  /** false для DONE/CANCELLED — поллинг не нужен */
  active: boolean;
};

export function OrderStatusPoller({ status, active }: Props) {
  const router = useRouter();
  const prevStatus = useRef(status);
  const enteredOnce = useRef(false);

  // Один haptic-success при входе на экран успеха.
  useEffect(() => {
    if (enteredOnce.current) return;
    enteredOnce.current = true;
    haptic.notification("success");
  }, []);

  // Смена статуса на «Готов к выдаче» при открытом экране.
  useEffect(() => {
    if (prevStatus.current !== status) {
      if (status === "READY") haptic.notification("success");
      prevStatus.current = status;
    }
  }, [status]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, router]);

  return null;
}
