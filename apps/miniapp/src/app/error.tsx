"use client";

import { useEffect } from "react";
import { ErrorState } from "@repo/ui";
import { haptic } from "@/shared/lib/haptics";

export default function CatalogError({
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
      <ErrorState title="Не удалось загрузить меню" onRetry={reset} />
    </main>
  );
}
