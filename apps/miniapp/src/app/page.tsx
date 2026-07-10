import { EmptyState } from "@repo/ui";
import { getMenuCatalog } from "@/entities/menu";
import { getSession, isAdminId } from "@/shared/session";
import { CartBar } from "@/widgets/cart-bar";
import { MenuCatalog } from "@/widgets/menu-catalog";

// Меню читается из БД на каждый запрос; на этапе сборки обращений к БД нет.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [categories, session] = await Promise.all([getMenuCatalog(), getSession()]);
  const showAdminLink = session !== null && isAdminId(session.tgUserId);
  const hasDishes = categories.some((category) => category.items.length > 0);

  if (!hasDishes) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <EmptyState
          title="Меню пока пусто"
          description="Мы обновляем блюда — загляните чуть позже"
        />
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-28">
      <MenuCatalog categories={categories} showAdminLink={showAdminLink} />
      <CartBar />
    </main>
  );
}
