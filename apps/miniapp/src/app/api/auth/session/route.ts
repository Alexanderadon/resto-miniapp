import { NextResponse } from "next/server";
import { z } from "zod";
import { validateInitData } from "@/shared/telegram";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  type Session,
} from "@/shared/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  initDataRaw: z.string().min(1),
});

/**
 * POST /api/auth/session — обмен Telegram initData на серверную сессию.
 * Единственный клиентский fetch к собственному API (ADR-001 §8): нужен
 * raw-ответ с Set-Cookie до первого Server Action.
 */
export async function POST(request: Request) {
  const botToken = process.env.BOT_TOKEN;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!botToken || !sessionSecret) {
    console.error(
      "[api/auth/session] misconfigured: " +
        `${!botToken ? "BOT_TOKEN " : ""}${!sessionSecret ? "SESSION_SECRET " : ""}is not set`,
    );
    return NextResponse.json(
      { ok: false, error: "SERVER_MISCONFIGURED" },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const result = validateInitData(parsed.data.initDataRaw, botToken);
  if (!result.ok) {
    // Причина в лог, клиенту — только факт: детали валидации наружу не отдаём.
    console.warn(`[api/auth/session] initData rejected: ${result.reason}`);
    return NextResponse.json(
      { ok: false, error: "INVALID_INIT_DATA" },
      { status: 401 },
    );
  }

  const session: Session = {
    tgUserId: String(result.user.id),
    firstName: result.user.firstName,
    ...(result.user.username ? { username: result.user.username } : {}),
  };

  const token = await createSessionToken(session);
  const response = NextResponse.json({ ok: true, firstName: session.firstName });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
