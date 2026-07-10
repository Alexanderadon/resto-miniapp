import { Card, Skeleton } from "@repo/ui";

/**
 * Skeleton экрана «Заказ принят»: круг-галочка, заголовок и номер,
 * чек (строки позиций + итог + детали), статус и кнопки.
 */
export default function OrderLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pt-10 pb-safe-4">
      {/* Круг под галочку */}
      <Skeleton h={64} w={64} rounded="9999px" />

      <Skeleton h={28} w={176} className="mt-4" />
      <Skeleton h={40} w={128} className="mt-2" />

      {/* Чек: позиции + итог + детали самовывоза */}
      <Card className="mt-6 w-full p-4">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <Skeleton h={16} className="w-1/2" />
              <Skeleton h={16} w={72} />
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <Skeleton h={20} w={56} />
            <Skeleton h={24} w={96} />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <Skeleton h={14} w={72} />
              <Skeleton h={14} className="w-2/5" />
            </div>
          ))}
        </div>
      </Card>

      {/* Статус */}
      <div className="mt-4 flex items-center gap-2">
        <Skeleton h={24} w={88} rounded="9999px" />
        <Skeleton h={14} w={160} />
      </div>

      {/* Кнопки */}
      <div className="mt-8 w-full space-y-3">
        <Skeleton h={48} className="w-full" />
        <Skeleton h={48} className="w-full" />
      </div>
    </main>
  );
}
