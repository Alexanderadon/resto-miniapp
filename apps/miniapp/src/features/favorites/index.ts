// Публичный API фичи — только client-safe экспорты.
// getFavoriteIds (prisma + cookies) намеренно не реэкспортируется:
// баррель импортируют клиентские компоненты, серверные модули не должны
// попадать в их граф. RSC берёт его из "./api/get-favorite-ids" напрямую.
export { FavoriteButton } from "./ui/favorite-button";
export {
  toggleFavorite,
  type ToggleFavoriteResult,
} from "./api/toggle-favorite";
