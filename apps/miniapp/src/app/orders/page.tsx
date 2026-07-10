// «Мои заказы» — история заказов клиента. RSC: список читается из БД
// с обязательным owner-фильтром по tgUserId из сессии (защита от IDOR).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@repo/db";
import { Card, EmptyState, StatusBadge, formatTenge } from "@repo/ui";
import { requireSession } from "@/shared/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Мои заказы — Апорт",
};

const ORDERS_PAGE_SIZE = 30;

/** В кратком составе показываем максимум 3 позиции, дальше — «и ещё N». */
const MAX_SUMMARY_ITEMS = 3;

// Дата в часовом поясе ресторана (Asia/Almaty) — как в features/checkout
// и features/admin: сервер на Vercel живёт в UTC.
const orderDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Almaty",
  day: "numeric",
  month: "long",
});

/** «Сырники ×2, Капучино» / «…, и ещё 2» */
function orderSummary(
  items: { nameSnapshot: string; quantity: number }[],
): string {
  const parts = items
    .slice(0, MAX_SUMMARY_ITEMS)
    .map((item) =>
      item.quantity > 1
        ? `${item.nameSnapshot} ×${item.quantity}`
        : item.nameSnapshot,
    );
  const rest = items.length - MAX_SUMMARY_ITEMS;
  return rest > 0
    ? `${parts.join(", ")} и ещё ${rest}`
    : parts.join(", ");
}

export default async function OrdersPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/");

  const orders = await prisma.order.findMany({
    where: { tgUserId: session.tgUserId },
    orderBy: { createdAt: "desc" },
    take: ORDERS_PAGE_SIZE,
    include: { items: true },
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-header px-4 py-3">
        <h1 className="text-title text-ink">Мои заказы</h1>
        <Link
          href="/"
          className="tap-target inline-flex items-center px-2 text-sm font-medium text-link"
        >
          В меню
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <EmptyState
            icon="🧾"
            title="Заказов пока нет"
            description="Самое время что-нибудь выбрать"
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
      ) : (
        <ul className="space-y-2 px-4 pt-2 pb-safe-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/order/${order.id}`} className="block">
                <Card className="p-4 transition active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-semibold text-ink">
                      <span data-numeric>№ {order.publicNumber}</span>
                      <span className="font-normal text-muted">
                        {" ・ "}
                        {orderDateFormatter.format(order.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={order.status} className="shrink-0" />
                  </div>
                  <p className="mt-2 truncate text-sm text-muted">
                    {orderSummary(order.items)}
                  </p>
                  <p
                    className="mt-2 text-price font-bold text-ink"
                    data-numeric
                  >
                    {formatTenge(order.totalTenge)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
