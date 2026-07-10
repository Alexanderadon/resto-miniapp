"use client";

import { useState, useTransition } from "react";
import { Button } from "@repo/ui";
import type { OrderStatus } from "@repo/db";
import { changeOrderStatus, type ChangeOrderStatusResult } from "../api/change-order-status";
import { canCancel, forwardTransition } from "../model/transitions";

type Props = {
  orderId: string;
  status: OrderStatus;
  /** Например, offline: сеть нужна для смены статуса */
  disabled?: boolean;
  onResult: (result: ChangeOrderStatusResult) => void;
};

/**
 * Кнопки смены статуса: только валидные переходы из текущего статуса.
 * Отмена — в два шага (danger + inline-confirm), без window.confirm.
 */
export function OrderActions({ orderId, status, disabled = false, onResult }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const forward = forwardTransition(status);
  const cancellable = canCancel(status);
  const blocked = disabled || isPending;

  if (!forward && !cancellable) {
    return <span className="text-caption text-muted">—</span>;
  }

  const apply = (to: OrderStatus) => {
    startTransition(async () => {
      try {
        const result = await changeOrderStatus({ orderId, from: status, to });
        onResult(result);
      } catch {
        // Сеть оборвалась/сервер упал — server action бросает, показываем тост
        onResult({ ok: false, code: "UNKNOWN", message: "Не удалось обновить заказ" });
      }
    });
  };

  if (confirmingCancel) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="danger"
          className="tap-target"
          disabled={blocked}
          onClick={() => {
            setConfirmingCancel(false);
            apply("CANCELLED");
          }}
        >
          Да, отменить
        </Button>
        <Button
          variant="secondary"
          className="tap-target"
          disabled={isPending}
          onClick={() => setConfirmingCancel(false)}
        >
          Нет
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {forward && (
        <Button
          variant="primary"
          className="tap-target"
          disabled={blocked}
          onClick={() => apply(forward.to)}
        >
          {isPending ? "Сохраняем…" : forward.label}
        </Button>
      )}
      {cancellable && (
        <Button
          variant="danger"
          className="tap-target"
          disabled={blocked}
          onClick={() => setConfirmingCancel(true)}
        >
          Отменить
        </Button>
      )}
    </div>
  );
}
