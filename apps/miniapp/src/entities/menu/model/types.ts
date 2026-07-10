/**
 * Плоские DTO меню — результат prisma-select без служебных полей.
 * Безопасны для сериализации в props клиентских компонентов
 * (никаких Date/Decimal — только примитивы).
 */

export type MenuItemData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Цена в тенге, целое число */
  priceTenge: number;
};

export type MenuCategoryData = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  /** Только доступные блюда (isAvailable), отсортированы по sortOrder */
  items: MenuItemData[];
};
