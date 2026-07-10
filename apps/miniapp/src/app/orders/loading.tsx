import { Card, Skeleton } from "@repo/ui";

/** Skeleton экрана «Мои заказы»: шапка + карточки заказов. */
export default function OrdersLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-header px-4 py-3">
        <h1 className="text-title text-ink">Мои заказы</h1>
      </header>

      <ul className="space-y-2 px-4 pt-2 pb-safe-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton h={18} w={144} />
                <Skeleton h={24} w={88} rounded="9999px" />
              </div>
              <Skeleton h={16} className="mt-2 w-3/4" />
              <Skeleton h={20} w={96} className="mt-2" />
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
