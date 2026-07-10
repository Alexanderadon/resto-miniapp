// Public API слайса features/admin (FSD)

export { AdminOrdersBoard } from "./ui/admin-orders-board";

export { changeOrderStatus } from "./api/change-order-status";
export type {
  ChangeOrderStatusErrorCode,
  ChangeOrderStatusInput,
  ChangeOrderStatusResult,
} from "./api/change-order-status";

export { STATUS_FILTERS, filterConfig, parseStatusFilter } from "./model/filters";
export type { StatusFilterConfig, StatusFilterValue } from "./model/filters";

export { canCancel, forwardTransition, isAllowedTransition } from "./model/transitions";
export type { ForwardTransition } from "./model/transitions";

export { toAdminOrderDTO } from "./model/types";
export type { AdminOrderDTO, AdminOrderItemDTO } from "./model/types";
