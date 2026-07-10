"use server";

// Server Action оформления заказа.
// Инварианты (ADR-001 §4): identity — только из сессии; цены — только из БД;
// снапшоты названий/цен в OrderItem; идемпотентность по idempotencyKey (P2002);
// побочные эффекты (iiko push, чек в Telegram) — ПОСЛЕ коммита, через after().

import { after } from "next/server";
import { OrderStatus, Prisma, prisma } from "@repo/db";
import { getOrderProvider, type OrderPayload } from "@repo/iiko-adapter";
import { formatTenge } from "@repo/ui";
import { requireSession } from "@/shared/session";
import { sendMessage } from "@/shared/telegram/bot-api";
import { formatPickupTime } from "../lib/datetime";
import {
  MAX_ORDER_ITEM_QUANTITY,
  MAX_PICKUP_AHEAD_MS,
  MIN_PICKUP_LEAD_MS,
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

  try {
    const { order, menuById } = await prisma.$transaction(async (tx) => {
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
          status: OrderStatus.NEW,
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
    });

    // 6. Побочные эффекты после коммита — ответ клиенту не блокируют,
    // их сбой заказ не откатывает.
    scheduleSideEffects(order, requested, menuById, tgUserId);

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
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true, publicNumber: true },
      });
      if (existing) {
        return {
          ok: true,
          orderId: existing.id,
          publicNumber: existing.publicNumber,
        };
      }
    }

    console.error("[createOrder] unexpected failure", error);
    return {
      ok: false,
      code: "INTERNAL",
      message: "Не удалось отправить заказ. Попробуйте ещё раз",
    };
  }
}

// ── Побочные эффекты (вне транзакции) ────────────────────────────────────

function scheduleSideEffects(
  order: CreatedOrder,
  requested: { menuItemId: string; quantity: number }[],
  menuById: Map<string, MenuItemSnapshot>,
  tgUserId: string,
): void {
  after(async () => {
    await pushOrderToPos(order, requested, menuById);
    await sendReceiptToChat(order, requested, menuById, tgUserId);
  });
}

async function pushOrderToPos(
  order: CreatedOrder,
  requested: { menuItemId: string; quantity: number }[],
  menuById: Map<string, MenuItemSnapshot>,
): Promise<void> {
  const payload: OrderPayload = {
    orderId: order.id,
    publicNumber: order.publicNumber,
    customerName: order.customerName,
    phone: order.phone,
    pickupTime: order.pickupTime.toISOString(),
    comment: order.comment ?? undefined,
    paymentMethod: "CASH",
    items: requested.map((item) => {
      const menu = menuById.get(item.menuItemId)!;
      return {
        externalId: menu.externalId,
        name: menu.name,
        quantity: item.quantity,
        priceTenge: menu.priceTenge,
      };
    }),
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
      // Заказ остаётся в БД со статусом NEW без externalId —
      // сигнал персоналу обработать вручную (ADR-001 §6).
      console.error(
        `[createOrder] iiko push failed for order ${order.id} #${order.publicNumber}: ` +
          `${result.error} (retryable=${result.retryable})`,
      );
    }
  } catch (error) {
    console.error(`[createOrder] iiko push threw for order ${order.id}`, error);
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendReceiptToChat(
  order: CreatedOrder,
  requested: { menuItemId: string; quantity: number }[],
  menuById: Map<string, MenuItemSnapshot>,
  tgUserId: string,
): Promise<void> {
  const itemLines = requested.map((item) => {
    const menu = menuById.get(item.menuItemId)!;
    return `• ${escapeHtml(menu.name)} × ${item.quantity} — ${formatTenge(menu.priceTenge * item.quantity)}`;
  });

  const text = [
    `<b>Заказ №${order.publicNumber} принят ✅</b>`,
    "",
    ...itemLines,
    "",
    `Итого: <b>${formatTenge(order.totalTenge)}</b>`,
    `Самовывоз: ${formatPickupTime(order.pickupTime)}`,
    "Оплата: наличными при получении",
  ].join("\n");

  // sendMessage не бросает — ошибки логирует сам (контракт №3).
  await sendMessage(tgUserId, text, { parseMode: "HTML" });
}
