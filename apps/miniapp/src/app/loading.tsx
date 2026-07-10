/**
 * Skeleton каталога: шапка + лента из 5 чипсов + сетка из 6 карточек
 * (фото, две строки названия, строка цены) — по спеке экрана «Каталог».
 */
export default function CatalogLoading() {
  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-10 bg-header">
        <div className="px-4 pb-2 pt-3">
          <div className="skeleton h-7 w-28" />
          <div className="skeleton mt-2 h-4 w-40" />
        </div>
        <div className="flex gap-2 overflow-hidden border-b border-line px-4 pb-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-10 w-24 shrink-0" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-card bg-surface shadow-card"
          >
            <div
              className="skeleton aspect-square w-full"
              style={{ borderRadius: 0 }}
            />
            <div className="p-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton mt-2 h-4 w-2/3" />
              <div className="mt-3 flex items-center justify-between">
                <div className="skeleton h-5 w-20" />
                <div className="skeleton size-11" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
