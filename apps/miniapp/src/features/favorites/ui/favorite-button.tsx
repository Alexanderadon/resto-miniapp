"use client";

import type { MouseEvent } from "react";
import { haptic } from "@/shared/lib/haptics";
import { toggleFavorite } from "../api/toggle-favorite";

type FavoriteButtonProps = {
  menuItemId: string;
  /** Текущее состояние из Set родителя — единственный источник правды */
  favorited: boolean;
  /**
   * Optimistic-переключение в Set родителя. Вызывается сразу при тапе;
   * при ошибке Action — этим же колбэком откатываем к прежнему значению.
   */
  onToggle: (menuItemId: string, favorited: boolean) => void;
  /** Позиционирование задаёт родитель (absolute поверх фото карточки) */
  className?: string;
};

/**
 * Кнопка-сердце на карточке блюда. Рендерится СИБЛИНГОМ кнопки карточки
 * (button внутри button — невалидный HTML), позиционируется absolute.
 */
export function FavoriteButton({
  menuItemId,
  favorited,
  onToggle,
  className,
}: FavoriteButtonProps) {
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    // Тап по сердцу не должен открывать dish-sheet карточки
    event.stopPropagation();

    const next = !favorited;
    onToggle(menuItemId, next);
    haptic.impact("light");

    const result = await toggleFavorite(menuItemId);
    if (!result.ok) {
      onToggle(menuItemId, favorited); // откат optimistic-состояния
      if (result.code === "INTERNAL") {
        haptic.notification("error");
      }
      // UNAUTHORIZED (вне Telegram / сессия истекла) — тихо, без тостов
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorited ? "Убрать из избранного" : "В избранное"}
      aria-pressed={favorited}
      className={`tap-target grid place-items-center rounded-chip bg-surface/80 backdrop-blur ${
        favorited ? "text-danger" : "text-ink"
      }${className ? ` ${className}` : ""}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
