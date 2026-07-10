import type { Metadata } from "next";
import { OrderStatus, prisma } from "@repo/db";
import { ErrorState } from "@repo/ui";
import { requireAdmin } from "@/shared/session";
import {
  AdminOrdersBoard,
  filterConfig,
  parseStatusFilter,
  toAdminOrderDTO,
} from "@/features/admin";

// Страница ходит в БД на каждый запрос; на билде без DATABASE_URL не рендерится
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заказы — Апорт",
  robots: { index: false, follow: false },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.CONFIRMED,
  OrderStatus.COOKING,
  OrderStatus.READY,
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  // Не админ или нет сессии → один и тот же экран без деталей
  try {
    await requireAdmin();
  } catch {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <ErrorState title="Нет доступа" description="Эта страница доступна только персоналу кафе" />
      </main>
    );
  }

  const params = await searchParams;
  const filter = parseStatusFilter(params.status);
  const { statuses } = filterConfig(filter);

  // PENDING_PAYMENT не попадает ни в один фильтр: заказ до оплаты кухне не виден
  const [orders, newCount, activeCount] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: [...statuses] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        items: {
          select: { id: true, nameSnapshot: true, priceSnapshot: true, quantity: true },
        },
      },
    }),
    prisma.order.count({ where: { status: OrderStatus.NEW } }),
    prisma.order.count({ where: { status: { in: ACTIVE_STATUSES } } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-safe-4">
      <AdminOrdersBoard
        orders={orders.map(toAdminOrderDTO)}
        filter={filter}
        newCount={newCount}
        activeCount={activeCount}
      />
    </main>
  );
}
