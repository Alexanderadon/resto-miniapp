import type { Metadata } from "next";
import { getSession } from "@/shared/session";
import { CheckoutForm } from "@/features/checkout";

// Server Component: читает сессию (cookie) и передаёт имя в форму.
// Читаем cookies → рендер только в рантайме.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оформление заказа — Апорт",
};

export default async function CheckoutPage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 bg-header px-4 py-3">
        <h1 className="text-title text-ink">Оформление</h1>
      </header>
      <CheckoutForm initialName={session?.firstName ?? ""} />
    </main>
  );
}
