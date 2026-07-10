"use server";

import { Prisma, prisma } from "@repo/db";
import { requireSession } from "@/shared/session";

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; code: "UNAUTHORIZED" | "INTERNAL"; message: string };

function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

/**
 * Тоггл избранного: есть запись — удаляем, нет — создаём.
 * Identity — только из серверной сессии (ADR-001 §4).
 *
 * Гонки двойного тапа схлопываем в идемпотентный успех:
 * P2002 (параллельный create уже вставил) и P2025 (параллельный delete
 * уже удалил) — не ошибки, итоговое состояние совпадает с намерением.
 *
 * Без revalidatePath — клиент держит optimistic-Set, полный рефреш
 * каталога затёр бы его и откатил ещё не доехавшие переключения.
 */
export async function toggleFavorite(
  menuItemId: string,
): Promise<ToggleFavoriteResult> {
  let tgUserId: string;
  try {
    ({ tgUserId } = await requireSession());
  } catch {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Сессия истекла — переоткройте приложение",
    };
  }

  try {
    const existing = await prisma.favorite.findUnique({
      where: { tgUserId_menuItemId: { tgUserId, menuItemId } },
      select: { menuItemId: true },
    });

    if (existing) {
      try {
        await prisma.favorite.delete({
          where: { tgUserId_menuItemId: { tgUserId, menuItemId } },
        });
      } catch (error) {
        if (!isPrismaError(error, "P2025")) throw error;
      }
      return { ok: true, favorited: false };
    }

    try {
      await prisma.favorite.create({ data: { tgUserId, menuItemId } });
    } catch (error) {
      if (!isPrismaError(error, "P2002")) throw error;
    }
    return { ok: true, favorited: true };
  } catch (error) {
    console.error(
      "[toggleFavorite] failed:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      ok: false,
      code: "INTERNAL",
      message: "Не получилось обновить избранное — попробуйте ещё раз",
    };
  }
}
