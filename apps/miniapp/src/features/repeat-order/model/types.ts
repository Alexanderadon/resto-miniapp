// Публичный тип features/repeat-order: позиция прошлого заказа,
// сверенная с текущим меню. Discriminated union по `available` —
// у доступной позиции все поля для корзины гарантированно заполнены.

export type RepeatableItem =
  | {
      available: true;
      menuItemId: string;
      slug: string;
      name: string;
      /** Текущая цена из БД (не снапшот заказа) */
      priceTenge: number;
      imageUrl: string | null;
      quantity: number;
    }
  | {
      /** Блюдо удалено из меню (menuItemId null) или isAvailable=false */
      available: false;
      menuItemId: string | null;
      slug: string | null;
      name: string;
      priceTenge: number | null;
      imageUrl: string | null;
      quantity: number;
    };
