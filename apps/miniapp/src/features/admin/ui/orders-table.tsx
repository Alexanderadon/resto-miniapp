"use client";

import { Fragment } from "react";
import { StatusBadge, formatTenge } from "@repo/ui";
import type { ChangeOrderStatusResult } from "../api/change-order-status";
import { formatDateAlmaty, formatTimeAlmaty, itemsCountLabel, paymentLabel } from "../lib/format";
import type { AdminOrderDTO } from "../model/types";
import { ChevronIcon } from "./chevron-icon";
import { OrderActions } from "./order-actions";
import { OrderDetails } from "./order-details";

type Props = {
  orders: AdminOrderDTO[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  /** Заказы, появившиеся при последнем авто-обновлении, — подсветка 2с */
  flashIds: ReadonlySet<string>;
  actionsDisabled: boolean;
  onActionResult: (result: ChangeOrderStatusResult) => void;
};

/** Таблица заказов для ≥768px; на телефоне вместо неё — OrderCards. */
export function OrdersTable({
  orders,
  expandedId,
  onToggle,
  flashIds,
  actionsDisabled,
  onActionResult,
}: Props) {
  return (
    <div className="hidden overflow-x-auto rounded-card bg-surface shadow-card md:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-caption text-muted">
            <th className="px-4 py-3 font-normal">№</th>
            <th className="px-4 py-3 font-normal">Слот</th>
            <th className="px-4 py-3 font-normal">Клиент</th>
            <th className="px-4 py-3 font-normal">Состав</th>
            <th className="px-4 py-3 font-normal">Сумма</th>
            <th className="px-4 py-3 font-normal">Оплата</th>
            <th className="px-4 py-3 font-normal">Статус</th>
            <th className="px-4 py-3 font-normal">Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const expanded = expandedId === order.id;
            return (
              <Fragment key={order.id}>
                <tr
                  className={`cursor-pointer border-b border-line transition-colors ${
                    flashIds.has(order.id) ? "bg-brand-soft" : "hover:bg-bg"
                  }`}
                  onClick={() => onToggle(order.id)}
                >
                  <td className="px-4 py-3 font-semibold" data-numeric>
                    №{order.publicNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3" data-numeric>
                    <span className="font-medium">{formatTimeAlmaty(order.pickupTime)}</span>{" "}
                    <span className="text-caption text-muted">
                      {formatDateAlmaty(order.pickupTime)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{order.customerName}</span>
                    <a
                      href={`tel:${order.phone}`}
                      className="text-caption text-link"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {order.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="tap-target inline-flex items-center gap-1 text-link"
                      aria-expanded={expanded}
                      aria-label={`Состав заказа №${order.publicNumber}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggle(order.id);
                      }}
                    >
                      {itemsCountLabel(order.items.length)}
                      <ChevronIcon expanded={expanded} />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-price" data-numeric>
                    {formatTenge(order.totalTenge)}
                  </td>
                  <td className="px-4 py-3 text-caption text-muted">
                    {paymentLabel(order.paymentMethod)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <OrderActions
                      orderId={order.id}
                      status={order.status}
                      disabled={actionsDisabled}
                      onResult={onActionResult}
                    />
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-b border-line bg-bg">
                    <td colSpan={8} className="px-4 py-4">
                      <OrderDetails order={order} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
