"use client";

// «Показать номер бармену»: номер заказа на весь экран, offline-friendly
// (данные уже на странице, сеть не нужна).

import { useState } from "react";

export function ShowNumberButton({ publicNumber }: { publicNumber: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target w-full text-center text-sm font-medium text-link"
      >
        Показать номер бармену
      </button>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Закрыть номер заказа"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg"
        >
          <span className="text-caption uppercase text-muted">Заказ</span>
          <span
            className="text-[5.5rem] font-bold leading-none text-ink"
            data-numeric
          >
            №{publicNumber}
          </span>
          <span className="text-caption text-muted">
            Нажмите, чтобы закрыть
          </span>
        </button>
      )}
    </>
  );
}
