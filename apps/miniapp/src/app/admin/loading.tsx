import { Card, Skeleton } from "@repo/ui";

const TABLE_ROWS = 6;
/** Ширины «ячеек» строки таблицы: №, слот, клиент, состав, сумма, оплата, статус, действия */
const CELL_WIDTHS = [48, 96, 128, 88, 80, 72, 88, 128] as const;

/**
 * Skeleton админки: шапка со счётчиком, чипсы фильтра,
 * на desktop — таблица из 6 строк, на телефоне — карточки.
 */
export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-safe-4">
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton h={28} w={112} />
            <Skeleton h={13} w={88} className="mt-2" />
          </div>
          <Skeleton h={28} w={160} />
        </header>

        {/* Чипсы фильтра статусов */}
        <div className="flex gap-2 overflow-hidden py-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} h={40} w={96} rounded="9999px" className="shrink-0" />
          ))}
        </div>

        {/* Desktop: таблица-скелетон из 6 строк */}
        <Card padded={false} className="hidden md:block">
          <div className="flex gap-4 border-b border-line px-4 py-3">
            {CELL_WIDTHS.map((width, index) => (
              <Skeleton key={index} h={13} w={width} />
            ))}
          </div>
          {Array.from({ length: TABLE_ROWS }).map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
            >
              {CELL_WIDTHS.map((width, index) => (
                <Skeleton key={index} h={16} w={width} />
              ))}
            </div>
          ))}
        </Card>

        {/* Телефон: карточки заказов */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton h={20} w={64} />
                <Skeleton h={24} w={88} rounded="9999px" />
              </div>
              <Skeleton h={16} className="mt-3 w-2/3" />
              <Skeleton h={14} className="mt-2 w-1/2" />
              <Skeleton h={44} className="mt-3 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
