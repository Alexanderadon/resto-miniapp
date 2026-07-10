"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 15_000;

type Props = {
  /** Пауза извне (offline): интервал не тикает, переключатель остаётся в своём состоянии */
  paused?: boolean;
};

/** Авто-обновление списка: router.refresh() каждые 15 секунд, с переключателем. */
export function AutoRefreshToggle({ paused = false }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled || paused) return;
    const timer = setInterval(() => {
      // Не дёргаем сервер из фоновой вкладки и без сети
      if (document.visibilityState === "visible" && navigator.onLine) {
        router.refresh();
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, paused, router]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled((v) => !v)}
      className="tap-target flex items-center gap-2 text-caption text-muted"
    >
      <span>Авто-обновление</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-chip transition-colors ${
          enabled ? "bg-brand" : "bg-line"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-chip bg-surface shadow-card transition-transform ${
            enabled ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
