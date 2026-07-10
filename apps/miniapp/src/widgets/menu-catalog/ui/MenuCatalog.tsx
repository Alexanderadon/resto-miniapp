"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ChipTabs, EmptyState } from "@repo/ui";
import type { MenuCategoryData, MenuItemData } from "@/entities/menu";
import { DishSheet } from "@/features/dish-sheet";
import { haptic } from "@/shared/lib/haptics";
import { DishCard } from "./DishCard";

const ALL_CATEGORY = "all";

type MenuCatalogProps = {
  categories: MenuCategoryData[];
};

export function MenuCatalog({ categories }: MenuCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Корзина живёт в localStorage (zustand persist): до гидрации показываем
  // «пустое» состояние, чтобы SSR-разметка совпала с первым рендером клиента.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const chipOptions = useMemo(
    () => [
      { value: ALL_CATEGORY, label: "Все" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.emoji ? `${category.emoji} ${category.name}` : category.name,
      })),
    ],
    [categories],
  );

  const visibleItems: MenuItemData[] =
    activeCategory === ALL_CATEGORY
      ? categories.flatMap((category) => category.items)
      : (categories.find((category) => category.id === activeCategory)?.items ?? []);

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
        <header className="px-4 pb-2 pt-3">
          <h1 className="text-title text-ink">Апорт</h1>
          <p className="text-caption text-muted">Самовывоз ・ Алматы</p>
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

      {visibleItems.length === 0 ? (
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
        <div className="grid grid-cols-2 gap-3 px-4 pt-3">
          {visibleItems.map((item, index) => (
            <DishCard
              key={item.id}
              item={item}
              onOpen={handleOpenItem}
              hydrated={hydrated}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      <DishSheet
        item={selectedItem}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
