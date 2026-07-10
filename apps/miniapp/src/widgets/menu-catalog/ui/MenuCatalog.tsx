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
// Виртуальный чипс «Избранное»: cuid-id категорий с ним не пересекаются
const FAVORITES_CATEGORY = "favorites";

type MenuCatalogProps = {
  categories: MenuCategoryData[];
  /** Сессия принадлежит админу (ADMIN_TG_IDS) — показать вход в админку */
  showAdminLink?: boolean;
  /** id избранных блюд из БД (RSC) — начальное значение optimistic-Set */
  favoriteIds: string[];
};

export function MenuCatalog({
  categories,
  showAdminLink = false,
  favoriteIds,
}: MenuCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Optimistic-состояние избранного: инициализируется серверным пропом,
  // дальше живёт на клиенте (FavoriteButton переключает и откатывает).
  // SSR и первый клиентский рендер видят один и тот же проп — mismatch нет.
  const [favoriteIdSet, setFavoriteIdSet] = useState<Set<string>>(
    () => new Set(favoriteIds),
  );
  // Чипс «Избранное» виден, если избранное было при загрузке или появилось
  // в этой сессии. После снятия всех сердец чипс НЕ прячем — вкладка
  // показывает EmptyState, а не исчезает из-под пальца.
  const [showFavoritesChip, setShowFavoritesChip] = useState(
    favoriteIds.length > 0,
  );

  const handleToggleFavorite = (menuItemId: string, favorited: boolean) => {
    setFavoriteIdSet((prev) => {
      const next = new Set(prev);
      if (favorited) {
        next.add(menuItemId);
      } else {
        next.delete(menuItemId);
      }
      return next;
    });
    if (favorited) setShowFavoritesChip(true);
  };

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
      ...(showFavoritesChip
        ? [{ value: FAVORITES_CATEGORY, label: "Избранное" }]
        : []),
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories, showFavoritesChip],
  );

  // «Все» — секции по категориям с заголовками; конкретная категория — одна
  // секция; «Избранное» — те же секции, но только с избранными блюдами
  // (заголовки сохраняются, опустевшие секции скрываются).
  const visibleSections: MenuCategoryData[] =
    activeCategory === ALL_CATEGORY
      ? categories.filter((category) => category.items.length > 0)
      : activeCategory === FAVORITES_CATEGORY
        ? categories
            .map((category) => ({
              ...category,
              items: category.items.filter((item) => favoriteIdSet.has(item.id)),
            }))
            .filter((category) => category.items.length > 0)
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
          {activeCategory === FAVORITES_CATEGORY ? (
            <EmptyState
              icon="♥"
              title="В избранном пусто"
              description="Жмите ♥ на блюдах, чтобы собрать сюда любимое"
            />
          ) : (
            <EmptyState
              title="В этой категории пока пусто"
              action={
                <Button onClick={() => handleCategoryChange(ALL_CATEGORY)}>
                  Смотреть всё меню
                </Button>
              }
            />
          )}
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
                  favorited={favoriteIdSet.has(item.id)}
                  onToggleFavorite={handleToggleFavorite}
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
