"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@repo/ui";
import { haptic } from "@/shared/lib/haptics";
import type { ChangeOrderStatusResult } from "../api/change-order-status";
import { filterConfig, type StatusFilterValue } from "../model/filters";
import type { AdminOrderDTO } from "../model/types";
import { AutoRefreshToggle } from "./auto-refresh-toggle";
import { OrderCards } from "./order-cards";
import { OrdersTable } from "./orders-table";
import { StatusFilter } from "./status-filter";

const FLASH_DURATION_MS = 2_000;
const TOAST_DURATION_MS = 3_500;

type Props = {
  orders: AdminOrderDTO[];
  filter: StatusFilterValue;
  newCount: number;
  activeCount: number;
};

/**
 * Клиентская обвязка админки: фильтр, авто-обновление, раскрытие строк,
 * подсветка новых заказов при polling'е, тосты и offline-режим.
 * Данные приходят из RSC-страницы и обновляются через router.refresh().
 */
export function AdminOrdersBoard({ orders, filter, newCount, activeCount }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [online, setOnline] = useState(true);
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(() => new Set());
  const knownIds = useRef<Set<string> | null>(null);

  // Offline: авто-обновление на паузе, кнопки смены статуса disabled
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Заказы, появившиеся при авто-обновлении, подсвечиваем brand-soft на 2с
  useEffect(() => {
    if (knownIds.current === null) {
      // Первый рендер — ничего не подсвечиваем
      knownIds.current = new Set(orders.map((o) => o.id));
      return;
    }
    const known = knownIds.current;
    const fresh = orders.filter((o) => !known.has(o.id)).map((o) => o.id);
    if (fresh.length === 0) return;
    for (const id of fresh) known.add(id);
    setFlashIds(new Set(fresh));
    const timer = setTimeout(() => setFlashIds(new Set()), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [orders]);

  // Авто-скрытие тоста
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((text: string) => {
    setToast({ key: Date.now(), text });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const handleActionResult = useCallback(
    (result: ChangeOrderStatusResult) => {
      if (result.ok) {
        haptic.notification("success");
        return;
      }
      haptic.notification("error");
      showToast(result.message);
      if (result.code === "CONFLICT") {
        // Заказ изменён с другого устройства — подтягиваем актуальное состояние
        router.refresh();
      }
    },
    [router, showToast],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title">Заказы</h1>
          <p className="text-caption text-muted" data-numeric>
            Активных: {activeCount}
          </p>
        </div>
        <AutoRefreshToggle paused={!online} />
      </header>

      {!online && (
        <p
          role="status"
          className="rounded-button bg-danger-soft px-3 py-2 text-caption text-danger"
        >
          Нет соединения — авто-обновление на паузе, смена статусов недоступна
        </p>
      )}

      <StatusFilter value={filter} newCount={newCount} />

      {orders.length === 0 ? (
        <EmptyState title={filterConfig(filter).emptyText} />
      ) : (
        <>
          <OrdersTable
            orders={orders}
            expandedId={expandedId}
            onToggle={handleToggle}
            flashIds={flashIds}
            actionsDisabled={!online}
            onActionResult={handleActionResult}
          />
          <OrderCards
            orders={orders}
            expandedId={expandedId}
            onToggle={handleToggle}
            flashIds={flashIds}
            actionsDisabled={!online}
            onActionResult={handleActionResult}
          />
        </>
      )}

      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-button bg-ink px-4 py-3 text-sm text-bg shadow-bar"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
