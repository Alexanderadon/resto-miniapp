// Zod-схемы чекаута: серверный вход createOrder + переиспользуемые
// клиентские схемы полей (инлайн-валидация формы).

import { z } from "zod";

/** Минимальный запас до самовывоза при сабмите (слот мог «протухнуть») */
export const MIN_PICKUP_LEAD_MS = 15 * 60 * 1000;
/** Максимум — не дальше чем на 48 часов вперёд */
export const MAX_PICKUP_AHEAD_MS = 48 * 60 * 60 * 1000;

/** Максимум одной позиции в заказе (синхронизирован с клэмпом корзины) */
export const MAX_ORDER_ITEM_QUANTITY = 20;

/** Рабочие часы самовывоза (Asia/Almaty), в минутах от полуночи:
 *  первый слот 10:00, последний 21:30. Синхронизировано с lib/time-slots.ts. */
export const PICKUP_OPEN_MINUTES = 10 * 60;
export const PICKUP_LAST_SLOT_MINUTES = 21 * 60 + 30;

export const customerNameSchema = z
  .string()
  .trim()
  .min(2, "Введите имя — минимум 2 символа")
  .max(80, "Слишком длинное имя");

/** Телефон храним в E.164: +7XXXXXXXXXX */
export const phoneE164Schema = z
  .string()
  .regex(/^\+7\d{10}$/, "Введите телефон полностью");

export const commentSchema = z
  .string()
  .trim()
  .max(200, "Комментарий — не более 200 символов");

export const createOrderInputSchema = z.object({
  idempotencyKey: z.uuid(),
  customerName: customerNameSchema,
  phone: phoneE164Schema,
  pickupTimeIso: z.iso.datetime(),
  comment: commentSchema.optional(),
  /** В v1 доступна только оплата наличными; STRIPE — следующая итерация */
  paymentMethod: z.literal("CASH"),
  /** Итог, который видел клиент; при расхождении с пересчётом из БД — PRICE_CHANGED */
  expectedTotalTenge: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_ORDER_ITEM_QUANTITY),
      }),
    )
    .min(1, "Корзина пуста"),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export type CreateOrderErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "PICKUP_TIME_INVALID"
  | "ITEMS_UNAVAILABLE"
  | "PRICE_CHANGED"
  | "TOO_MANY_ACTIVE"
  | "CONFLICT"
  | "INTERNAL";

export type CreateOrderResult =
  | { ok: true; orderId: string; publicNumber: number }
  | {
      ok: false;
      code: CreateOrderErrorCode;
      message: string;
      /** Для ITEMS_UNAVAILABLE — какие позиции убрать из корзины */
      unavailableIds?: string[];
      /** Для PRICE_CHANGED — актуальный итог, пересчитанный из БД */
      actualTotalTenge?: number;
    };
