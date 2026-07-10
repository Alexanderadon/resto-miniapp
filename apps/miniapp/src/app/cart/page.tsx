import type { Metadata } from "next";
import { CartView } from "./cart-view";

// Корзина полностью клиентская (zustand + localStorage) — БД не нужна.

export const metadata: Metadata = {
  title: "Корзина — Апорт",
};

export default function CartPage() {
  return (
    <main className="mx-auto max-w-md">
      <CartView />
    </main>
  );
}
