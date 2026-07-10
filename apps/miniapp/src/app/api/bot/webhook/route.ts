import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/db";
import { safeEqual, sendMessage } from "@/shared/telegram";

export const dynamic = "force-dynamic";

/**
 * Ленивый Zod-парс update: только нужные поля, незнакомые ключи Zod
 * отбрасывает сам. Не-message update сюда не приходят (allowed_updates
 * ограничен в set-webhook.mjs), но схема на них тоже не падает.
 */
const updateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
      from: z
        .object({
          id: z.union([z.number(), z.string()]).optional(),
          first_name: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const WELCOME_TEXT = (firstName?: string) =>
  `${firstName ? `${firstName}, добро` : "Добро"} пожаловать в «Апорт»! 🍽\n\n` +
  "Здесь можно посмотреть меню, собрать заказ и забрать его самовывозом в Алматы.\n\n" +
  "Нажмите кнопку «Меню» внизу, чтобы открыть приложение и сделать заказ.";

/**
 * POST /api/bot/webhook — приём update от Telegram.
 *
 * Идемпотентность (ADR-001 §5.2 + ревью): Telegram ретраит недоставленные
 * update. Проверяем ProcessedUpdate ДО обработки (findUnique), а запись
 * создаём ПОСЛЕ успешной обработки: редкий дубль /start-приветствия безопаснее,
 * чем «съеденный» ретрай при упавшей обработке.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    // Без секрета аутентифицировать Telegram невозможно — отклоняем всё.
    console.error(
      "[api/bot/webhook] TELEGRAM_WEBHOOK_SECRET is not set — rejecting update",
    );
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!headerSecret || !safeEqual(headerSecret, secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    // Битое тело — ретрай Telegram не поможет, отвечаем 200.
    console.warn("[api/bot/webhook] non-JSON body ignored");
    return NextResponse.json({ ok: true });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    // Незнакомая форма update — игнорируем, ретрай не нужен.
    console.warn("[api/bot/webhook] unrecognized update shape ignored");
    return NextResponse.json({ ok: true });
  }

  const update = parsed.data;
  const updateId = BigInt(update.update_id);

  try {
    const alreadyProcessed = await prisma.processedUpdate.findUnique({
      where: { updateId },
    });
    if (alreadyProcessed) {
      // Ретрай уже обработанного update — просто подтверждаем.
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (message?.text?.startsWith("/start")) {
      // sendMessage не бросает: ошибка отправки логируется внутри,
      // update при этом считаем обработанным (ретрай приветствия не критичен).
      await sendMessage(message.chat.id, WELCOME_TEXT(message.from?.first_name));
    } else if (message?.text?.startsWith("/whoami")) {
      // Диагностика доступа к админке: в личном чате chat.id === id юзера.
      const tgId = message.from?.id ?? message.chat.id;
      await sendMessage(message.chat.id, `Ваш Telegram ID: ${tgId}`);
    }
    // Остальные типы сообщений намеренно игнорируем (ADR-001 §5.3).

    try {
      await prisma.processedUpdate.create({ data: { updateId } });
    } catch (error) {
      // P2002 — параллельный ретрай успел записать раньше: это не ошибка.
      if ((error as { code?: string })?.code !== "P2002") {
        throw error;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Возвращаем 500 осознанно: обработка упала ДО записи ProcessedUpdate
    // (обычно недоступна БД), значит ретрай Telegram безопасен — при повторе
    // findUnique/обработка отработают заново без дублей побочных эффектов.
    const messageText = error instanceof Error ? error.message : String(error);
    console.error(
      `[api/bot/webhook] processing failed for update_id=${update.update_id}: ${messageText}`,
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
