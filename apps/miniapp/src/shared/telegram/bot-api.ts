/**
 * Минимальный клиент Telegram Bot API — прямые fetch без grammY (ADR-001 §5.4):
 * нужны 1-2 метода, middleware-стек в serverless-роуте — лишний вес.
 *
 * Контракт: sendMessage НЕ бросает — ошибки логируются, возвращается { ok }.
 * Токен бота в логи не попадает никогда.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 8000;

export interface SendMessageOptions {
  parseMode?: "HTML";
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  opts?: SendMessageOptions,
): Promise<{ ok: boolean }> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    console.error("[telegram/bot-api] sendMessage skipped: BOT_TOKEN is not set");
    return { ok: false };
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...(opts?.parseMode ? { parse_mode: opts.parseMode } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      // Тело ответа Telegram безопасно логировать: токена в нём нет.
      const body = await response.text().catch(() => "<unreadable>");
      console.error(
        `[telegram/bot-api] sendMessage failed: HTTP ${response.status}, chat_id=${chatId}, body=${body.slice(0, 500)}`,
      );
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    // На случай, если рантайм включит URL запроса в текст ошибки —
    // вычищаем токен перед логированием.
    const message = (error instanceof Error ? error.message : String(error))
      .split(botToken)
      .join("<bot-token>");
    console.error(
      `[telegram/bot-api] sendMessage error: chat_id=${chatId}, ${message}`,
    );
    return { ok: false };
  }
}
