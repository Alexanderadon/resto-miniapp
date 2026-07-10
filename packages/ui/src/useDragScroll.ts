"use client";

import { useCallback, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * Перетаскивание горизонтальной ленты мышью (десктоп/Telegram Desktop):
 * тач скроллит нативно, а мышь без этого хука выделяет текст вместо скролла.
 * После реального драга клик по чипсу гасится, чтобы не срабатывал выбор.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({ dragging: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    state.current = {
      dragging: true,
      startX: event.clientX,
      startLeft: el.scrollLeft,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const s = state.current;
    const el = ref.current;
    if (!s.dragging || !el) return;
    const dx = event.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startLeft - dx;
  }, []);

  const endDrag = useCallback(() => {
    state.current.dragging = false;
  }, []);

  const onClickCapture = useCallback((event: ReactMouseEvent<T>) => {
    if (!state.current.moved) return;
    // Это был драг, а не клик — не даём сработать выбору чипса.
    event.preventDefault();
    event.stopPropagation();
    state.current.moved = false;
  }, []);

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
      onClickCapture,
    },
  };
}
