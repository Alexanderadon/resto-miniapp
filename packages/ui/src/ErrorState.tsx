"use client";

import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Ошибка загрузки: «Не удалось загрузить» + кнопка «Повторить» (44px). */
export function ErrorState({
  title = "Не удалось загрузить",
  description = "Проверьте соединение и попробуйте ещё раз",
  onRetry,
  retryLabel = "Повторить",
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon="📡"
      title={title}
      description={description}
      className={className}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
