import { after } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { OrderStatus, prisma } from "@repo/db";
import { runOrderSideEffects } from "@/features/checkout/api/order-side-effects";
import { getStripe } from "@/shared/stripe/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook — события Stripe Checkout.
 *
 * Безопасность и идемпотентность (adversarial-ревью ADR-001):
 * - подпись проверяется по RAW-телу ДО любого парсинга (constructEvent);
 * - сумма/валюта события сверяются с заказом — «оплаченная» сессия с
 *   неправильной суммой заказ не активирует;
 * - переход статуса — атомарный updateMany по паре (stripeSessionId,
 *   PENDING_PAYMENT): повторная доставка события даёт count 0 и не
 *   дублирует side-эффекты (push в POS, чек в чат).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[api/stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const order = await prisma.order.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true, publicNumber: true, totalTenge: true },
        });
        if (!order) {
          // Заказ ещё не записал session.id (редкая гонка) — 500, чтобы
          // Stripe ретраил доставку с бэкоффом.
          console.error(
            `[api/stripe/webhook] order not found for session ${session.id}`,
          );
          return NextResponse.json({ ok: false }, { status: 500 });
        }

        // Сверка суммы (в тиынах) и валюты — событие с расхождением не
        // активирует заказ, только громкий лог для ручного разбора.
        if (
          session.amount_total !== order.totalTenge * 100 ||
          session.currency !== "kzt"
        ) {
          console.error(
            `[api/stripe/webhook] amount mismatch for order #${order.publicNumber}: ` +
              `session=${session.amount_total} ${session.currency}, order=${order.totalTenge * 100} kzt`,
          );
          break;
        }

        const { count } = await prisma.order.updateMany({
          where: {
            stripeSessionId: session.id,
            status: OrderStatus.PENDING_PAYMENT,
          },
          data: { status: OrderStatus.NEW },
        });
        if (count === 1) {
          after(() => runOrderSideEffects(order.id));
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        await prisma.order.updateMany({
          where: {
            stripeSessionId: session.id,
            status: OrderStatus.PENDING_PAYMENT,
          },
          data: { status: OrderStatus.CANCELLED },
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Ошибка обработки (обычно БД) — 500, Stripe ретраит; идемпотентность
    // перехода статуса делает повтор безопасным.
    console.error(
      `[api/stripe/webhook] processing failed for ${event.type}:`,
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
