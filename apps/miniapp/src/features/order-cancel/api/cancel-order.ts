"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus, prisma } from "@repo/db";
import { requireSession } from "@/shared/session";

export type CancelOrderResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHORIZED" | "TOO_LATE" | "INTERNAL"; message: string };

/**
 * Отмена заказа клиентом: только свой заказ (owner-фильтр по сессии)
 * и только пока кухня его не приняла (status NEW). updateMany с условием
 * по статусу — атомарно: гонка с подтверждением админа даёт count 0.
 */
export async function cancelOrder(orderId: string): Promise<CancelOrderResult> {
  let tgUserId: string;
  try {
    tgUserId = (await requireSession()).tgUserId;
  } catch {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Сессия истекла — переоткройте приложение",
    };
  }

  try {
    const { count } = await prisma.order.updateMany({
      where: { id: orderId, tgUserId, status: OrderStatus.NEW },
      data: { status: OrderStatus.CANCELLED },
    });
    if (count === 0) {
      return {
        ok: false,
        code: "TOO_LATE",
        message: "Заказ уже готовится — для отмены позвоните в кафе",
      };
    }
    revalidatePath(`/order/${orderId}`);
    return { ok: true };
  } catch (error) {
    console.error(
      "[cancelOrder] failed:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      ok: false,
      code: "INTERNAL",
      message: "Не получилось отменить — попробуйте ещё раз",
    };
  }
}
