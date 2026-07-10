"use client";

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
  flashIds: ReadonlySet<string>;
  actionsDisabled: boolean;
  onActionResult: (result: ChangeOrderStatusResult) => void;
};

/** Карточки заказов для телефона (<768px); на desktop вместо них — OrdersTable. */
export function OrderCards({
  orders,
  expandedId,
  onToggle,
  flashIds,
  actionsDisabled,
  onActionResult,
}: Props) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {orders.map((order) => {
        const expanded = expandedId === order.id;
        return (
          <li
            key={order.id}
            className={`rounded-card p-4 shadow-card transition-colors ${
              flashIds.has(order.id) ? "bg-brand-soft" : "bg-surface"
            }`}
          >
            <button
              type="button"
              className="tap-target flex w-full items-start justify-between gap-3 text-left"
              aria-expanded={expanded}
              onClick={() => onToggle(order.id)}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold" data-numeric>
                    №{order.publicNumber}
                  </span>
                  <span className="text-caption text-muted" data-numeric>
                    {formatTimeAlmaty(order.pickupTime)} ・ {formatDateAlmaty(order.pickupTime)}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-1 text-caption text-link">
                  {itemsCountLabel(order.items.length)} ・ {paymentLabel(order.paymentMethod)}
                  <ChevronIcon expanded={expanded} />
                </span>
              </span>
              <StatusBadge status={order.status} />
            </button>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                {order.customerName}{" "}
                <a href={`tel:${order.phone}`} className="text-link" data-numeric>
                  {order.phone}
                </a>
              </span>
              <span className="shrink-0 text-price" data-numeric>
                {formatTenge(order.totalTenge)}
              </span>
            </div>

            {expanded && (
              <div className="mt-3 border-t border-line pt-3">
                <OrderDetails order={order} />
              </div>
            )}

            <div className="mt-3">
              <OrderActions
                orderId={order.id}
                status={order.status}
                disabled={actionsDisabled}
                onResult={onActionResult}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
