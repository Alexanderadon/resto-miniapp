"use server";

// Server Action оформления заказа.
// Инварианты (ADR-001 §4): identity — только из сессии; цены — только из БД;
// снапшоты названий/цен в OrderItem; идемпотентность по idempotencyKey (P2002);
// побочные эффекты (iiko push, чек в Telegram) — ПОСЛЕ коммита, через after().

import { after } from "next/server";
import { OrderStatus, Prisma, prisma } from "@repo/db";
import { formatTenge } from "@repo/ui";
import { requireSession } from "@/shared/session";
import { getStripe } from "@/shared/stripe/client";
import { runOrderSideEffects } from "./order-side-effects";
import {
  MAX_ORDER_ITEM_QUANTITY,
  MAX_PICKUP_AHEAD_MS,
  MIN_PICKUP_LEAD_MS,
  PICKUP_LAST_SLOT_MINUTES,
  PICKUP_OPEN_MINUTES,
  createOrderInputSchema,
  type CreateOrderInput,
  type CreateOrderResult,
} from "../model/schema";

const MAX_ACTIVE_ORDERS = 3;
const ACTIVE_STATUSES = [
  OrderStatus.NEW,
  OrderStatus.CONFIRMED,
  OrderStatus.COOKING,
] as const;

// ── Типизированные ошибки транзакции (не выходят наружу Action) ─────────

class ItemsUnavailableError extends Error {
  constructor(readonly ids: string[]) {
    super("ITEMS_UNAVAILABLE");
    this.name = "ItemsUnavailableError";
  }
}

class TooManyActiveOrdersError extends Error {
  constructor() {
    super("TOO_MANY_ACTIVE");
    this.name = "TooManyActiveOrdersError";
  }
}

class PriceChangedError extends Error {
  constructor(readonly actualTotalTenge: number) {
    super("PRICE_CHANGED");
    this.name = "PriceChangedError";
  }
}

class OrderInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderInvariantError";
  }
}

type MenuItemSnapshot = {
  id: string;
  name: string;
  priceTenge: number;
  externalId: string | null;
};

type CreatedOrder = {
  id: string;
  publicNumber: number;
  customerName: string;
  phone: string;
  pickupTime: Date;
  comment: string | null;
  totalTenge: number;
};

/** Минуты от полуночи в Asia/Almaty — серверный TZ может быть любым */
function minutesOfDayInAlmaty(date: Date): number {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const [hours = 0, minutes = 0] = formatted.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function createOrder(
  rawInput: CreateOrderInput,
): Promise<CreateOrderResult> {
  // 1. Identity — только из серверной сессии; клиенту не верим.
  let tgUserId: string;
  try {
    ({ tgUserId } = await requireSession());
  } catch {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Сессия истекла — переоткройте приложение и попробуйте снова",
    };
  }

  // 2. Валидация входа. Клиентских цен в схеме нет — их некуда прислать.
  const parsed = createOrderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Проверьте данные заказа",
    };
  }
  const input = parsed.data;

  // 3. Мердж дублей menuItemId: количества суммируются, клэмп 20.
  const quantityById = new Map<string, number>();
  for (const item of input.items) {
    const next = (quantityById.get(item.menuItemId) ?? 0) + item.quantity;
    quantityById.set(item.menuItemId, Math.min(next, MAX_ORDER_ITEM_QUANTITY));
  }
  const requested = [...quantityById].map(([menuItemId, quantity]) => ({
    menuItemId,
    quantity,
  }));
  const requestedIds = requested.map((i) => i.menuItemId);

  // 4. Окно самовывоза: минимум +15 мин (слот мог протухнуть), максимум +48 ч.
  const pickupTime = new Date(input.pickupTimeIso);
  const nowMs = Date.now();
  if (
    pickupTime.getTime() < nowMs + MIN_PICKUP_LEAD_MS ||
    pickupTime.getTime() > nowMs + MAX_PICKUP_AHEAD_MS
  ) {
    return {
      ok: false,
      code: "PICKUP_TIME_INVALID",
      message: "Выбранное время уже недоступно — выберите другой слот",
    };
  }

  // 4b. Рабочие часы кафе: слот должен попадать в 10:00–21:30 по Алматы.
  // Клиентские слоты это гарантируют, но входу Action не верим.
  const almatyMinutes = minutesOfDayInAlmaty(pickupTime);
  if (
    almatyMinutes < PICKUP_OPEN_MINUTES ||
    almatyMinutes > PICKUP_LAST_SLOT_MINUTES
  ) {
    return {
      ok: false,
      code: "PICKUP_TIME_INVALID",
      message: "Кафе работает с 10:00 до 21:30 — выберите слот в рабочие часы",
    };
  }

  try {
    const { order } = await prisma.$transaction(async (tx) => {
      // Актуальные позиции: только существующие и доступные.
      const menuItems: MenuItemSnapshot[] = await tx.menuItem.findMany({
        where: { id: { in: requestedIds }, isAvailable: true },
        select: { id: true, name: true, priceTenge: true, externalId: true },
      });

      if (menuItems.length < requestedIds.length) {
        const found = new Set(menuItems.map((m) => m.id));
        throw new ItemsUnavailableError(
          requestedIds.filter((id) => !found.has(id)),
        );
      }

      const menuById = new Map(menuItems.map((m) => [m.id, m]));

      // Итог считается ТОЛЬКО из цен БД на момент заказа.
      const totalTenge = requested.reduce(
        (sum, item) =>
          sum + menuById.get(item.menuItemId)!.priceTenge * item.quantity,
        0,
      );
      if (totalTenge <= 0) {
        throw new OrderInvariantError(`totalTenge=${totalTenge} must be > 0`);
      }

      // Цена изменилась, пока пользователь оформлял заказ, — не молчим,
      // а просим подтвердить актуальный итог.
      if (
        input.expectedTotalTenge !== undefined &&
        totalTenge !== input.expectedTotalTenge
      ) {
        throw new PriceChangedError(totalTenge);
      }

      // Анти-абьюз: не больше 3 активных заказов на пользователя.
      const activeCount = await tx.order.count({
        where: { tgUserId, status: { in: [...ACTIVE_STATUSES] } },
      });
      if (activeCount >= MAX_ACTIVE_ORDERS) {
        throw new TooManyActiveOrdersError();
      }

      const order: CreatedOrder = await tx.order.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          tgUserId,
          customerName: input.customerName,
          phone: input.phone,
          pickupTime,
          comment: input.comment || null,
          paymentMethod: input.paymentMethod,
          // STRIPE-заказ не виден кухне и не шлёт уведомлений, пока
          // webhook не подтвердит оплату (PENDING_PAYMENT → NEW).
          status:
            input.paymentMethod === "STRIPE"
              ? OrderStatus.PENDING_PAYMENT
              : OrderStatus.NEW,
          totalTenge,
          items: {
            create: requested.map((item) => ({
              menuItemId: item.menuItemId,
              nameSnapshot: menuById.get(item.menuItemId)!.name,
              priceSnapshot: menuById.get(item.menuItemId)!.priceTenge,
              quantity: item.quantity,
            })),
          },
        },
        select: {
          id: true,
          publicNumber: true,
          customerName: true,
          phone: true,
          pickupTime: true,
          comment: true,
          totalTenge: true,
        },
      });

      return { order, menuById };
    }, {
      // Гонка count→create лимита активных заказов закрывается сериализацией;
      // конфликт (P2034) обрабатываем ниже.
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    // 6a. STRIPE: создаём Checkout-сессию; заказ активируется webhook'ом
    // после оплаты. Сессия не создалась — заказ отменяем, юзеру ошибка.
    if (input.paymentMethod === "STRIPE") {
      const checkoutUrl = await createStripeCheckout(order);
      if (!checkoutUrl) {
        await prisma.order.updateMany({
          where: { id: order.id, status: OrderStatus.PENDING_PAYMENT },
          data: { status: OrderStatus.CANCELLED },
        });
        return {
          ok: false,
          code: "INTERNAL",
          message:
            "Не удалось открыть оплату картой — попробуйте ещё раз или выберите наличные",
        };
      }
      return {
        ok: true,
        orderId: order.id,
        publicNumber: order.publicNumber,
        checkoutUrl,
      };
    }

    // 6b. CASH: побочные эффекты после коммита — ответ клиенту не блокируют,
    // их сбой заказ не откатывает.
    after(() => runOrderSideEffects(order.id));

    return { ok: true, orderId: order.id, publicNumber: order.publicNumber };
  } catch (error) {
    if (error instanceof ItemsUnavailableError) {
      return {
        ok: false,
        code: "ITEMS_UNAVAILABLE",
        message: "Часть блюд закончилась — вернитесь в корзину и обновите заказ",
        unavailableIds: error.ids,
      };
    }
    if (error instanceof PriceChangedError) {
      return {
        ok: false,
        code: "PRICE_CHANGED",
        message:
          `Цены обновились: итого ${formatTenge(error.actualTotalTenge)}. ` +
          "Проверьте корзину и подтвердите ещё раз",
        actualTotalTenge: error.actualTotalTenge,
      };
    }
    if (error instanceof TooManyActiveOrdersError) {
      return {
        ok: false,
        code: "TOO_MANY_ACTIVE",
        message:
          "У вас уже три активных заказа — дождитесь их готовности, пожалуйста",
      };
    }
    // 5. Повторный сабмит того же idempotencyKey (ретрай сети, переоткрытый
    // webview) → P2002 → возвращаем СУЩЕСТВУЮЩИЙ заказ как успех.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // tgUserId в фильтре: чужой заказ с совпавшим ключом не отдаём как свой.
      const existing = await prisma.order.findFirst({
        where: { idempotencyKey: input.idempotencyKey, tgUserId },
        select: {
          id: true,
          publicNumber: true,
          status: true,
          stripeSessionId: true,
        },
      });
      if (existing) {
        // Ретрай STRIPE-заказа: отдаём ссылку на ту же (ещё открытую) сессию.
        let checkoutUrl: string | undefined;
        if (
          existing.status === OrderStatus.PENDING_PAYMENT &&
          existing.stripeSessionId
        ) {
          try {
            const session = await getStripe().checkout.sessions.retrieve(
              existing.stripeSessionId,
            );
            if (session.status === "open" && session.url) {
              checkoutUrl = session.url;
            }
          } catch {
            // Сессию не достали — вернём заказ без ссылки, оплатить можно
            // со страницы заказа.
          }
        }
        return {
          ok: true,
          orderId: existing.id,
          publicNumber: existing.publicNumber,
          checkoutUrl,
        };
      }
    }
    // Сбой сериализации Serializable-транзакции — безопасно ретраить.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "Не удалось оформить заказ, попробуйте ещё раз",
      };
    }

    console.error(
      "[createOrder] unexpected failure:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      ok: false,
      code: "INTERNAL",
      message: "Не удалось отправить заказ. Попробуйте ещё раз",
    };
  }
}

// ── Stripe Checkout (вне транзакции) ─────────────────────────────────────

/** Сессия должна жить недолго: неоплаченный заказ не висит вечно.
 *  30 минут — минимум, который позволяет Stripe. */
const CHECKOUT_TTL_SECONDS = 30 * 60;

/**
 * Создаёт Checkout-сессию по СНАПШОТАМ заказа (цены уже зафиксированы
 * транзакцией) и записывает session.id в заказ. null — сессия не создалась.
 */
async function createStripeCheckout(order: CreatedOrder): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://resto-miniapp.vercel.app";
  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      select: { nameSnapshot: true, priceSnapshot: true, quantity: true },
    });

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "kzt",
          // KZT в Stripe — валюта с двумя знаками: сумма в тиынах (×100)
          unit_amount: item.priceSnapshot * 100,
          product_data: { name: item.nameSnapshot },
        },
      })),
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
      success_url: `${appUrl}/order/${order.id}?paid=1`,
      cancel_url: `${appUrl}/order/${order.id}`,
      metadata: {
        orderId: order.id,
        publicNumber: String(order.publicNumber),
      },
    });

    if (!session.url) return null;

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });
    return session.url;
  } catch (error) {
    console.error(
      `[createOrder] stripe checkout create failed for order ${order.id}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
