"use client";

// После успешной оплаты Stripe (?paid=1) корзину пора очистить: при
// оформлении STRIPE-заказа она сознательно не чистилась (пользователь мог
// отменить оплату и вернуться к корзине).

import { useEffect, useRef } from "react";
import { useCartStore } from "@/entities/cart";
import { haptic } from "@/shared/lib/haptics";

export function PaidCartClearer() {
  const clear = useCartStore((s) => s.clear);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    clear();
    haptic.notification("success");
  }, [clear]);

  return null;
}
