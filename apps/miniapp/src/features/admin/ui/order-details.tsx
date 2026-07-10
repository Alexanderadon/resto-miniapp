import { formatTenge } from "@repo/ui";
import { formatDateTimeAlmaty } from "../lib/format";
import type { AdminOrderDTO } from "../model/types";

/** Раскрытая карточка заказа: полный состав, комментарий, время создания. */
export function OrderDetails({ order }: { order: AdminOrderDTO }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3">
            <span>
              {item.name}
              <span className="text-muted"> × {item.quantity}</span>
            </span>
            <span data-numeric>{formatTenge(item.priceTenge * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
        <span className="font-semibold">Итого</span>
        <span className="text-price">{formatTenge(order.totalTenge)}</span>
      </div>

      {order.comment && (
        <div>
          <p className="text-caption text-muted">Комментарий клиента</p>
          <p className="mt-1 rounded-button bg-brand-soft px-3 py-2">{order.comment}</p>
        </div>
      )}

      <p className="text-caption text-muted" data-numeric>
        Создан {formatDateTimeAlmaty(order.createdAt)}
      </p>
    </div>
  );
}
