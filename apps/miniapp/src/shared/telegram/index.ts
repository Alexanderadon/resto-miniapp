// Public API слайса shared/telegram.
// ВНИМАНИЕ: init-data.ts использует node:crypto — импортировать этот индекс
// можно только из серверного кода (route handlers, Server Actions).
export {
  validateInitData,
  safeEqual,
  type InitDataUser,
  type ValidateInitDataResult,
} from "./init-data";
export { sendMessage, type SendMessageOptions } from "./bot-api";
