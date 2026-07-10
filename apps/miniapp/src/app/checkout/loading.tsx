import { Card, Skeleton } from "@repo/ui";

/**
 * Skeleton оформления заказа: шапка + секции формы
 * (контакты, время самовывоза, оплата, комментарий) + итог и кнопка.
 */
export default function CheckoutLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 bg-header px-4 py-3">
        <Skeleton h={28} w={144} />
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-3">
        {/* Контакты: заголовок секции + два поля */}
        <Card className="p-4">
          <Skeleton h={13} w={80} />
          <div className="mt-3 space-y-3">
            <Skeleton h={44} className="w-full" />
            <Skeleton h={44} className="w-full" />
          </div>
        </Card>

        {/* Время самовывоза: заголовок + лента слотов */}
        <Card className="p-4">
          <Skeleton h={13} w={144} />
          <div className="mt-3 flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} h={40} w={88} className="shrink-0" />
            ))}
          </div>
        </Card>

        {/* Оплата: заголовок + две радио-строки */}
        <Card className="p-4">
          <Skeleton h={13} w={56} />
          <div className="mt-3 space-y-3">
            <Skeleton h={24} className="w-3/4" />
            <Skeleton h={24} className="w-2/3" />
          </div>
        </Card>

        {/* Комментарий: заголовок + textarea */}
        <Card className="p-4">
          <Skeleton h={13} w={96} />
          <Skeleton h={64} className="mt-3 w-full" />
        </Card>

        {/* Итого */}
        <div className="flex items-center justify-between px-1">
          <Skeleton h={20} w={48} />
          <Skeleton h={24} w={96} />
        </div>

        {/* Кнопка сабмита */}
        <div className="mt-auto pt-2 pb-safe-3">
          <Skeleton h={48} className="w-full" />
        </div>
      </div>
    </main>
  );
}
