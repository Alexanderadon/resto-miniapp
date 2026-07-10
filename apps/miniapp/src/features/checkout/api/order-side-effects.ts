// Побочные эффекты подтверждённого заказа: push в POS (iiko) + чек в Telegram.
// Единая точка для двух вызывающих сторон:
//  - createOrder (CASH — сразу после коммита, через after());
//  - Stripe-webhook (STRIPE — только после checkout.session.completed).
// Серверный модуль: НЕ экспортировать через client-баррель фичи.

import { prisma } from "@repo/db";
import { getOrderProvider, type OrderPayload } from "@repo/iiko-adapter";
import { formatTenge } from "@repo/ui";
import { sendMessage } from "@/shared/telegram/bot-api";
import { formatPickupTime } from "../lib/datetime";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const PAYMENT_LINE: Record<string, string> = {
  CASH: "Оплата: наличными при получении",
  STRIPE: "Оплата: картой онлайн — оплачено ✅",
};

/**
 * Загружает заказ из БД и выполняет side-эффекты. Никогда не бросает —
 * сбой эффекта не должен ронять вызывающего (Action/webhook).
 */
export async function runOrderSideEffects(orderId: string): Promise<void> {
  const order = await prisma.order
    .findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: { select: { externalId: true } } } } },
    })
    .catch((error) => {
      console.error(
        `[order-side-effects] load failed for ${orderId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    });
  if (!order) return;

  // 1. Push в POS (mock iiko). Сбой не откатывает заказ — персонал видит
  // заказ без externalId и обрабатывает вручную (ADR-001 §6).
  const payload: OrderPayload = {
    orderId: order.id,
    publicNumber: order.publicNumber,
    customerName: order.customerName,
    phone: order.phone,
    pickupTime: order.pickupTime.toISOString(),
    comment: order.comment ?? undefined,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      externalId: item.menuItem?.externalId ?? null,
      name: item.nameSnapshot,
      quantity: item.quantity,
      priceTenge: item.priceSnapshot,
    })),
    totalTenge: order.totalTenge,
  };

  try {
    const result = await getOrderProvider().pushOrder(payload);
    if (result.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { iikoExternalId: result.externalId },
      });
    } else {
      console.error(
        `[order-side-effects] iiko push failed for order ${order.id} #${order.publicNumber}: ` +
          `${result.error} (retryable=${result.retryable})`,
      );
    }
  } catch (error) {
    console.error(
      `[order-side-effects] iiko push threw for order ${order.id}`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // 2. Чек в Telegram. sendMessage не бросает (контракт №3).
  const itemLines = order.items.map(
    (item) =>
      `• ${escapeHtml(item.nameSnapshot)} × ${item.quantity} — ${formatTenge(item.priceSnapshot * item.quantity)}`,
  );
  const text = [
    `<b>Заказ №${order.publicNumber} принят ✅</b>`,
    "",
    ...itemLines,
    "",
    `Итого: <b>${formatTenge(order.totalTenge)}</b>`,
    `Самовывоз: ${formatPickupTime(order.pickupTime)}`,
    PAYMENT_LINE[order.paymentMethod] ?? "",
  ].join("\n");

  await sendMessage(order.tgUserId, text, { parseMode: "HTML" });
}
