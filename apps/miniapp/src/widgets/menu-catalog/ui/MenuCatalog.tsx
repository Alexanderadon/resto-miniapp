"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Button, ChipTabs, EmptyState } from "@repo/ui";
import type { MenuCategoryData, MenuItemData } from "@/entities/menu";
import { haptic } from "@/shared/lib/haptics";
import { DishCard } from "./DishCard";

// Шит блюда нужен только после тапа по карточке — выносим из бандла
// первого экрана (даёт заметный кусок TBT на слабых устройствах).
const DishSheet = dynamic(
  () => import("@/features/dish-sheet").then((m) => m.DishSheet),
  { ssr: false },
);

const ALL_CATEGORY = "all";

type MenuCatalogProps = {
  categories: MenuCategoryData[];
  /** Сессия принадлежит админу (ADMIN_TG_IDS) — показать вход в админку */
  showAdminLink?: boolean;
};

export function MenuCatalog({ categories, showAdminLink = false }: MenuCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Корзина живёт в localStorage (zustand persist): до гидрации показываем
  // «пустое» состояние, чтобы SSR-разметка совпала с первым рендером клиента.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Без эмодзи: вне Telegram (десктопные браузеры) они рендерятся
  // монохромными глифами и разваливают вид ленты.
  const chipOptions = useMemo(
    () => [
      { value: ALL_CATEGORY, label: "Все" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  // «Все» — секции по категориям с заголовками; конкретная категория — одна секция.
  const visibleSections: MenuCategoryData[] =
    activeCategory === ALL_CATEGORY
      ? categories.filter((category) => category.items.length > 0)
      : categories.filter((category) => category.id === activeCategory);

  const hasItems = visibleSections.some((section) => section.items.length > 0);

  const handleCategoryChange = (value: string) => {
    haptic.selection();
    setActiveCategory(value);
    // Спека: при выборе категории — плавный скролл к началу секции
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenItem = (item: MenuItemData) => {
    haptic.impact("light");
    setSelectedItem(item);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-header">
        <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div>
            <h1 className="text-title text-ink">Апорт</h1>
            <p className="text-caption text-muted">Самовывоз ・ Алматы</p>
          </div>
          {showAdminLink && (
            <a
              href="/admin"
              className="tap-target inline-flex items-center rounded-chip border border-line bg-surface px-3 text-sm font-medium text-ink"
            >
              Админка
            </a>
          )}
        </header>
        <div className="border-b border-line pb-2">
          <ChipTabs
            tabs={chipOptions}
            aria-label="Категории меню"
            value={activeCategory}
            onChange={handleCategoryChange}
          />
        </div>
      </div>

      {!hasItems ? (
        <div className="px-4 pt-12">
          <EmptyState
            title="В этой категории пока пусто"
            action={
              <Button onClick={() => handleCategoryChange(ALL_CATEGORY)}>
                Смотреть всё меню
              </Button>
            }
          />
        </div>
      ) : (
        visibleSections.map((section, sectionIndex) => (
          <section key={section.id} className="px-4 pt-4">
            <h2 className="pb-2 text-lg font-bold leading-tight text-ink">
              {section.name}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {section.items.map((item, index) => (
                <DishCard
                  key={item.id}
                  item={item}
                  onOpen={handleOpenItem}
                  hydrated={hydrated}
                  priority={sectionIndex === 0 && index < 4}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <DishSheet
        item={selectedItem}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
