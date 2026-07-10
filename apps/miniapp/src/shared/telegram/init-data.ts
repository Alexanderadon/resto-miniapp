import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Валидация Telegram Mini Apps initData по официальной спецификации:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Чистая функция на node:crypto — без внешних SDK, покрывается unit-тестами.
 */

export interface InitDataUser {
  /** Telegram user id. В сессии храним как String (см. schema.prisma). */
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
}

export type ValidateInitDataResult =
  | { ok: true; user: InitDataUser; authDate: number }
  | { ok: false; reason: string };

/**
 * Константное по времени сравнение строк: длины выравниваются через Buffer,
 * чтобы timingSafeEqual не бросал на разной длине и не давал утечку по времени.
 */
function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  const len = Math.max(bufA.length, bufB.length);
  const padA = Buffer.alloc(len);
  const padB = Buffer.alloc(len);
  bufA.copy(padA);
  bufB.copy(padB);
  // timingSafeEqual по выровненным буферам + отдельная проверка длины:
  // порядок операндов фиксирован, ветвления по содержимому нет.
  return timingSafeEqual(padA, padB) && bufA.length === bufB.length;
}

export function validateInitData(
  initDataRaw: string,
  botToken: string,
  maxAgeSec = 300,
): ValidateInitDataResult {
  if (!initDataRaw) {
    return { ok: false, reason: "empty init data" };
  }
  if (!botToken) {
    return { ok: false, reason: "empty bot token" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initDataRaw);
  } catch {
    return { ok: false, reason: "init data is not a valid query string" };
  }

  const receivedHash = params.get("hash");
  if (!receivedHash) {
    return { ok: false, reason: "hash field is missing" };
  }

  // data_check_string: все пары key=value кроме hash, отсортированные по ключу,
  // соединённые через \n. Значения — уже URL-декодированные (URLSearchParams).
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // secret_key = HMAC_SHA256(message = botToken, key = "WebAppData")
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqualHex(expectedHash, receivedHash)) {
    return { ok: false, reason: "hash mismatch" };
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number.parseInt(authDateRaw, 10) : Number.NaN;
  if (!Number.isFinite(authDate)) {
    return { ok: false, reason: "auth_date field is missing or invalid" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSec) {
    return { ok: false, reason: "init data is expired (replay protection)" };
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return { ok: false, reason: "user field is missing" };
  }

  let userJson: unknown;
  try {
    userJson = JSON.parse(userRaw);
  } catch {
    return { ok: false, reason: "user field is not valid JSON" };
  }

  if (typeof userJson !== "object" || userJson === null) {
    return { ok: false, reason: "user field is not an object" };
  }

  const u = userJson as Record<string, unknown>;
  if (typeof u.id !== "number" || !Number.isFinite(u.id)) {
    return { ok: false, reason: "user.id is missing or invalid" };
  }
  if (typeof u.first_name !== "string" || u.first_name.length === 0) {
    return { ok: false, reason: "user.first_name is missing" };
  }

  const user: InitDataUser = {
    id: u.id,
    firstName: u.first_name,
    ...(typeof u.last_name === "string" && u.last_name
      ? { lastName: u.last_name }
      : {}),
    ...(typeof u.username === "string" && u.username
      ? { username: u.username }
      : {}),
    ...(typeof u.language_code === "string" && u.language_code
      ? { languageCode: u.language_code }
      : {}),
    ...(typeof u.photo_url === "string" && u.photo_url
      ? { photoUrl: u.photo_url }
      : {}),
  };

  return { ok: true, user, authDate };
}

/**
 * Константное по времени сравнение произвольных строк (секрет webhook и т.п.).
 */
export function safeEqual(a: string, b: string): boolean {
  return safeEqualHex(a, b);
}
