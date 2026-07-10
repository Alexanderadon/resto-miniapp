import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Серверная сессия поверх Telegram initData (ADR-001 §3):
 * одна HMAC-валидация в /api/auth/session → дальше собственный JWT
 * в httpOnly cookie. Identity в Actions — только из этой сессии.
 */

export type Session = {
  tgUserId: string;
  firstName: string;
  username?: string;
};

export const SESSION_COOKIE = "session";

/** TTL токена — 1 час. */
const SESSION_TTL_SEC = 3600;
/** Sliding refresh: осталось меньше 45 минут → перевыпускаем cookie. */
const REFRESH_THRESHOLD_SEC = 45 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "[session] SESSION_SECRET is not set — cannot sign/verify session tokens",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Подписывает JWT сессии (HS256, exp = now + 1h). */
export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({
    firstName: session.firstName,
    ...(session.username ? { username: session.username } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.tgUserId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(getSecretKey());
}

/**
 * Опции cookie сессии. SameSite=None обязателен: в Telegram Web клиенте
 * Mini App живёт в iframe, Lax-cookie туда не доедет.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: SESSION_TTL_SEC,
  };
}

/**
 * Читает и верифицирует сессию из cookie. Невалидный/просроченный токен → null.
 *
 * Sliding refresh: если токену осталось < 45 минут — перевыпускает cookie
 * с новым exp (initData для этого не нужен). cookies().set() доступен только
 * в Server Actions и Route Handlers; в RSC-рендере set бросает — глушим,
 * сессия при этом остаётся валидной до фактического exp.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    }));
  } catch {
    // Просрочен или подпись невалидна — клиент молча повторит POST /api/auth/session.
    return null;
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (typeof payload.firstName !== "string") return null;

  const session: Session = {
    tgUserId: payload.sub,
    firstName: payload.firstName,
    ...(typeof payload.username === "string" && payload.username
      ? { username: payload.username }
      : {}),
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresInSec = (payload.exp ?? 0) - nowSec;
  if (expiresInSec > 0 && expiresInSec < REFRESH_THRESHOLD_SEC) {
    try {
      const freshToken = await createSessionToken(session);
      store.set(SESSION_COOKIE, freshToken, sessionCookieOptions());
    } catch {
      // RSC-рендер: мутация cookie запрещена — не рефрешим, это не ошибка.
    }
  }

  return session;
}

/** Как getSession, но отсутствие сессии — ошибка UNAUTHORIZED. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/** tgUserId входит в ADMIN_TG_IDS (csv в env)? Только для сервера. */
export function isAdminId(tgUserId: string): boolean {
  return (process.env.ADMIN_TG_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(tgUserId);
}

/**
 * requireSession + проверка, что tgUserId входит в ADMIN_TG_IDS (csv в env).
 * Не входит → FORBIDDEN.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isAdminId(session.tgUserId)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
