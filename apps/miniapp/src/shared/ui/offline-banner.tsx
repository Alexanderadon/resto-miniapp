"use client";

import { useEffect, useState } from "react";

/**
 * Глобальный индикатор оффлайна: фиксированная полоса под шапкой
 * (верх вьюпорта мини-аппа). Live-region всегда в DOM, чтобы
 * скринридер озвучил появление текста.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <div role="status" aria-live="polite">
      {offline && (
        <>
          <style>{`@keyframes offline-banner-in{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div
            className="fixed inset-x-0 top-0 z-50 bg-danger-soft px-4 py-2 text-center text-caption font-medium text-danger"
            style={{ animation: "offline-banner-in 200ms ease-out both" }}
          >
            Нет соединения
          </div>
        </>
      )}
    </div>
  );
}
