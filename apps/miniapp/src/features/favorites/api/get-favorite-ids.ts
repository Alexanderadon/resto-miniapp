import { prisma } from "@repo/db";
import { getSession } from "@/shared/session";

/**
 * id избранных блюд текущего пользователя — для RSC (каталог).
 * Нет сессии (первый заход, открыто вне Telegram) → пустой список, не ошибка.
 *
 * Серверный модуль (prisma + cookies) — намеренно НЕ реэкспортируется из
 * index.ts фичи: клиентский импорт барреля не должен тянуть его в бандл.
 * RSC импортирует напрямую: "@/features/favorites/api/get-favorite-ids".
 */
export async function getFavoriteIds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const favorites = await prisma.favorite.findMany({
    where: { tgUserId: session.tgUserId },
    select: { menuItemId: true },
  });
  return favorites.map((favorite) => favorite.menuItemId);
}
