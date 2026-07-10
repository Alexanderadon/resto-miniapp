import { prisma } from "@repo/db";
import type { MenuCategoryData } from "../model/types";

/**
 * Каталог меню: активные категории с доступными блюдами.
 * Сортировка категорий и блюд — по sortOrder (порядок задаёт ресторан).
 *
 * Вызывается только из серверного кода (RSC / Server Actions):
 * клиентские компоненты импортируют из "@/entities/menu" только типы
 * (`import type`), чтобы prisma не попадала в клиентский бандл.
 */
export async function getMenuCatalog(): Promise<MenuCategoryData[]> {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      emoji: true,
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          imageUrl: true,
          priceTenge: true,
        },
      },
    },
  });
}
