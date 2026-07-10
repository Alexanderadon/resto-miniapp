// Серверный хелпер (вызывается из RSC страницы заказа): сверяет позиции
// прошлого заказа с текущим меню. Цены — только текущие из БД, снапшоты
// заказа для повтора не используются (меню могло подорожать).

import { prisma } from "@repo/db";
import type { RepeatableItem } from "../model/types";

type OrderItemInput = {
  /** null — блюдо удалено из меню (onDelete: SetNull) */
  menuItemId: string | null;
  nameSnapshot: string;
  quantity: number;
};

export async function getRepeatableItems(
  orderItems: OrderItemInput[],
): Promise<RepeatableItem[]> {
  const menuItemIds = orderItems
    .map((item) => item.menuItemId)
    .filter((id): id is string => id !== null);

  const menuItems =
    menuItemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: menuItemIds } },
          select: {
            id: true,
            slug: true,
            name: true,
            priceTenge: true,
            imageUrl: true,
            isAvailable: true,
          },
        })
      : [];
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  return orderItems.map((orderItem): RepeatableItem => {
    const menuItem = orderItem.menuItemId
      ? menuItemById.get(orderItem.menuItemId)
      : undefined;

    if (menuItem && menuItem.isAvailable) {
      return {
        available: true,
        menuItemId: menuItem.id,
        slug: menuItem.slug,
        name: menuItem.name,
        priceTenge: menuItem.priceTenge,
        imageUrl: menuItem.imageUrl,
        quantity: orderItem.quantity,
      };
    }

    // Недоступна: имя — из снапшота (стабильно есть даже для удалённых блюд).
    return {
      available: false,
      menuItemId: menuItem?.id ?? null,
      slug: menuItem?.slug ?? null,
      name: orderItem.nameSnapshot,
      priceTenge: menuItem?.priceTenge ?? null,
      imageUrl: menuItem?.imageUrl ?? null,
      quantity: orderItem.quantity,
    };
  });
}
