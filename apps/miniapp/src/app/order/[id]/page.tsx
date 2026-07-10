// Экран «Заказ принят» (ui-spec §5). RSC: заказ читается из БД
// с обязательным owner-фильтром по tgUserId из сессии (защита от IDOR).

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatus, prisma } from "@repo/db";
import { Card, StatusBadge, formatTenge } from "@repo/ui";
import { requireSession } from "@/shared/session";
import { formatPickupTime } from "@/features/checkout";
import { CancelOrderButton } from "@/features/order-cancel";
import { RepeatOrderButton, getRepeatableItems } from "@/features/repeat-order";
import { OrderStatusPoller } from "./order-status-poller";
import { ShowNumberButton } from "./show-number-button";

export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<string, string> = {
  PENDING_PAYMENT: "Ожидает оплаты",
  NEW: "Заказ принят — скоро подтвердим",
  CONFIRMED: "Заказ подтверждён",
  COOKING: "Готовим ваш заказ",
  READY: "Готов к выдаче — ждём вас",
  DONE: "Заказ выдан. Приятного аппетита!",
  CANCELLED: "Заказ отменён",
};

const PAYMENT_TEXT: Record<string, string> = {
  CASH: "наличными при получении",
  STRIPE: "картой онлайн",
};

const RESTAURANT_ADDRESS = "Кафе «Апорт» ・ Алматы, ул. Розыбакиева, 247";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await requireSession().catch(() => null);
  if (!session) redirect("/");

  // Owner-фильтр обязателен: чужой заказ по прямой ссылке = «не найден».
  const order = await prisma.order.findFirst({
    where: { id, tgUserId: session.tgUserId },
    include: { items: true },
  });
  if (!order) notFound();

  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isFinal = order.status === OrderStatus.DONE || isCancelled;

  // Позиции заказа, сверенные с текущим меню (цены/доступность из БД).
  const repeatableItems = await getRepeatableItems(order.items);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pt-10 pb-safe-4">
      <style>{`@keyframes order-check-in{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          isCancelled ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
        }`}
        style={{ animation: "order-check-in 300ms ease-out both" }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          {isCancelled ? (
            <path
              d="M8 8l12 12M20 8L8 20"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M5 14.5l6 6L23 8.5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      <h1 className="mt-4 text-title text-ink">
        {isCancelled ? "Заказ отменён" : "Заказ принят!"}
      </h1>
      <p className="mt-1 text-4xl font-bold text-ink" data-numeric>
        № {order.publicNumber}
      </p>

      <Card className="mt-6 w-full p-4">
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-ink">
                {item.nameSnapshot}{" "}
                <span className="text-muted" data-numeric>
                  × {item.quantity}
                </span>
              </span>
              <span className="shrink-0 text-ink" data-numeric>
                {formatTenge(item.priceSnapshot * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">Итого</span>
            <span className="text-price font-bold text-ink" data-numeric>
              {formatTenge(order.totalTenge)}
            </span>
          </div>
        </div>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Самовывоз</dt>
            <dd className="text-right text-ink">
              {formatPickupTime(order.pickupTime)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Оплата</dt>
            <dd className="text-right text-ink">
              {PAYMENT_TEXT[order.paymentMethod] ?? order.paymentMethod}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Адрес</dt>
            <dd className="text-right text-ink">{RESTAURANT_ADDRESS}</dd>
          </div>
        </dl>
      </Card>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={order.status} />
        <span className="text-caption text-muted">
          {STATUS_TEXT[order.status] ?? order.status}
        </span>
      </div>

      <OrderStatusPoller status={order.status} active={!isFinal} />

      <div className="mt-8 w-full space-y-3">
        <Link
          href="/"
          className="tap-target flex w-full items-center justify-center rounded-button bg-brand px-4 py-3 font-semibold text-on-brand active:bg-brand-press"
        >
          Вернуться в меню
        </Link>
        <RepeatOrderButton items={repeatableItems} />
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ShowNumberButton publicNumber={order.publicNumber} />
          </div>
          <Link
            href="/orders"
            className="tap-target flex flex-1 items-center justify-center text-center text-sm font-medium text-link"
          >
            Мои заказы
          </Link>
        </div>
        {order.status === OrderStatus.NEW && (
          <CancelOrderButton orderId={order.id} />
        )}
      </div>
    </main>
  );
}
