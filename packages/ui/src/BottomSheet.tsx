"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

const TRANSITION_MS = 220;
const CLOSE_THRESHOLD_PX = 88;
const EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Доступное имя диалога для скринридеров */
  label?: string;
  /**
   * Фиксированный низ шита (степпер + «В корзину») — рендерится вне
   * скролл-области, с линией сверху и pb-safe-3.
   */
  footer?: ReactNode;
  className?: string;
}

/**
 * Нижний шит: портал в body, бэкдроп 40%, грабер, свайп вниз для
 * закрытия (за зону грабера), Escape, блокировка скролла body.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  label,
  footer,
  className,
}: BottomSheetProps) {
  const [rendered, setRendered] = useState(false);
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  /** Кто был в фокусе до открытия — вернём фокус при закрытии */
  const lastActiveRef = useRef<HTMLElement | null>(null);

  // Монтирование + анимация входа/выхода
  useEffect(() => {
    if (open) {
      lastActiveRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setRendered(true);
      // двойной rAF — стартовые стили успевают закоммититься до анимации
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    setDragY(0);
    setIsDragging(false);
    // Возврат фокуса туда, откуда шит открывали (диалоговый паттерн)
    lastActiveRef.current?.focus({ preventScroll: true });
    lastActiveRef.current = null;
    const timer = setTimeout(() => setRendered(false), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Блокировка скролла body, пока шит смонтирован
  useEffect(() => {
    if (!rendered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [rendered]);

  // Escape + перевод фокуса на диалог
  useEffect(() => {
    if (!shown) return;
    sheetRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shown, onClose]);

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  };

  const onHandlePointerEnd = () => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    setIsDragging(false);
    if (dragY > CLOSE_THRESHOLD_PX) {
      onClose(); // dragY обнулится в эффекте закрытия — без скачка вверх
    } else {
      setDragY(0);
    }
  };

  if (!rendered) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-sheet bg-surface shadow-sheet outline-none",
          shown ? "translate-y-0" : "translate-y-full",
          className,
        )}
        style={{
          ...(dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined),
          transition: isDragging ? "none" : `transform ${TRANSITION_MS}ms ${EASING}`,
        }}
      >
        <div
          className="shrink-0 cursor-grab touch-none px-4 pt-2.5 pb-2 select-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerEnd}
          onPointerCancel={onHandlePointerEnd}
        >
          <div className="mx-auto h-1 w-9 rounded-full bg-line" />
        </div>
        <IconButton
          variant="ghost"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute right-2 top-2 z-10"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-safe-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
