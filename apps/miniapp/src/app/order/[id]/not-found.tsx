// Заказ не найден: битый id или чужой заказ (owner-фильтр).

import Link from "next/link";
import { EmptyState } from "@repo/ui";

export default function OrderNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon="🧾"
        title="Заказ не найден"
        description="Возможно, ссылка устарела или заказ был оформлен с другого аккаунта"
        action={
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center rounded-button bg-brand px-6 py-3 font-semibold text-on-brand active:bg-brand-press"
          >
            В меню
          </Link>
        }
      />
    </main>
  );
}
