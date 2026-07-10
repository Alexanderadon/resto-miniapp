/** Узкий неразрывный пробел (NARROW NO-BREAK SPACE, U+202F). */
const THIN_NBSP = "\u202F";

/**
 * Форматирует целую сумму в тенге: `formatTenge(2400)` → "2 400 ₸".
 * Разряды и знак валюты разделены U+202F, чтобы цена
 * никогда не переносилась по строкам.
 */
export function formatTenge(tenge: number): string {
  const sign = tenge < 0 ? "−" : "";
  const digits = Math.trunc(Math.abs(tenge)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
  return `${sign}${grouped}${THIN_NBSP}₸`;
}