"use client";

import { useEffect } from "react";
import { ErrorState } from "@repo/ui";
import { haptic } from "@/shared/lib/haptics";

// Общий error boundary приложения: текст нейтральный — экран может быть любым
// (каталог, корзина, оформление, заказ, админка).
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    haptic.notification("error");
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <ErrorState title="Что-то пошло не так" description="Попробуйте ещё раз" onRetry={reset} />
    </main>
  );
}
