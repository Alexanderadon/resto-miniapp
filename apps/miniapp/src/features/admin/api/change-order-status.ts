"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { OrderStatus, prisma } from "@repo/db";
import { requireAdmin } from "@/shared/session";
import { sendMessage } from "@/shared/telegram/bot-api";
import { formatTimeAlmaty } from "../lib/format";
import { isAllowedTransition } from "../model/transitions";

const inputSchema = z.object({
  orderId: z.string().min(1),
  from: z.enum(OrderStatus),
  to: z.enum(OrderStatus),
});

export type ChangeOrderStatusInput = z.infer<typeof inputSchema>;

export type ChangeOrderStatusErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "UNKNOWN";

export type ChangeOrderStatusResult =
  | { ok: true }
  | { ok: false; code: ChangeOrderStatusErrorCode; message: string };

/**
 * Смена статуса заказа админом.
 *
 * Optimistic concurrency: updateMany с условием { id, status: from } —
 * count 0 означает, что заказ уже изменён с другого устройства (CONFLICT),
 * клиент показывает тост и делает router.refresh().
 */
export async function changeOrderStatus(
  input: ChangeOrderStatusInput,
): Promise<ChangeOrderStatusResult> {
  // Доступ проверяется внутри КАЖДОГО action: server actions — публичные endpoints.
  try {
    await requireAdmin();
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "FORBIDDEN";
    return { ok: false, code: forbidden ? "FORBIDDEN" : "UNAUTHORIZED", message: "Нет доступа" };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", message: "Некорректный запрос" };
  }
  const { orderId, from, to } = parsed.data;

  if (!isAllowedTransition(from, to)) {
    return { ok: false, code: "INVALID_TRANSITION", message: "Недопустимая смена статуса" };
  }

  let count: number;
  try {
    ({ count } = await prisma.order.updateMany({
      where: { id: orderId, status: from },
      data: { status: to },
    }));
  } catch (error) {
    console.error("[admin] changeOrderStatus: update failed", error);
    return { ok: false, code: "UNKNOWN", message: "Не удалось обновить заказ" };
  }

  if (count === 0) {
    return { ok: false, code: "CONFLICT", message: "Заказ обновлён другим устройством" };
  }

  // Уведомления клиенту в Telegram — после ответа, не блокируют UI админа.
  if (to === "CONFIRMED" || to === "READY") {
    after(async () => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { publicNumber: true, tgUserId: true, pickupTime: true },
        });
        if (!order) return;
        const text =
          to === "CONFIRMED"
            ? `Заказ №${order.publicNumber} принят, будет готов к ${formatTimeAlmaty(order.pickupTime)}`
            : `Заказ №${order.publicNumber} готов к выдаче 🎉`;
        await sendMessage(order.tgUserId, text);
      } catch (error) {
        // sendMessage по контракту не бросает; страхуемся от findUnique
        console.error("[admin] changeOrderStatus: notification failed", error);
      }
    });
  }

  revalidatePath("/admin");
  return { ok: true };
}
