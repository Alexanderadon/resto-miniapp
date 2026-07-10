import type { OrderStatus, PaymentMethod } from "@repo/db";

export type AdminOrderItemDTO = {
  id: string;
  name: string;
  /** Цена за единицу в тенге на момент заказа (снапшот) */
  priceTenge: number;
  quantity: number;
};

export type AdminOrderDTO = {
  id: string;
  publicNumber: number;
  customerName: string;
  phone: string;
  /** ISO-строки: Date не тащим через RSC-границу, форматируем на месте */
  pickupTime: string;
  createdAt: string;
  comment: string | null;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  totalTenge: number;
  items: AdminOrderItemDTO[];
};

/** Структурный тип — ровно то, что нужно из результата prisma.order.findMany */
type OrderWithItems = {
  id: string;
  publicNumber: number;
  customerName: string;
  phone: string;
  pickupTime: Date;
  createdAt: Date;
  comment: string | null;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  totalTenge: number;
  items: { id: string; nameSnapshot: string; priceSnapshot: number; quantity: number }[];
};

export function toAdminOrderDTO(order: OrderWithItems): AdminOrderDTO {
  return {
    id: order.id,
    publicNumber: order.publicNumber,
    customerName: order.customerName,
    phone: order.phone,
    pickupTime: order.pickupTime.toISOString(),
    createdAt: order.createdAt.toISOString(),
    comment: order.comment,
    paymentMethod: order.paymentMethod,
    status: order.status,
    totalTenge: order.totalTenge,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      priceTenge: item.priceSnapshot,
      quantity: item.quantity,
    })),
  };
}
