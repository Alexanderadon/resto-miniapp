// Тип позиции корзины — публичный контракт @/entities/cart.

export type CartItem = {
  menuItemId: string;
  slug: string;
  name: string;
  /** Цена за единицу в тенге (целое) — только для отображения; сервер пересчитывает из БД */
  priceTenge: number;
  imageUrl: string | null;
  quantity: number;
};

/** Клэмп количества одной позиции: 1..20 */
export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 20;
