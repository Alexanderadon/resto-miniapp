#!/usr/bin/env node
/**
 * Регистрация webhook у Telegram после деплоя (ADR-001 §9).
 *
 * Использование:
 *   node scripts/set-webhook.mjs [appUrl]
 *
 * Параметры (argv имеет приоритет над env):
 *   appUrl                    — публичный https-адрес приложения (или env APP_URL)
 *   env BOT_TOKEN             — токен бота
 *   env TELEGRAM_WEBHOOK_SECRET — secret_token для заголовка
 *                               X-Telegram-Bot-Api-Secret-Token
 *
 * allowed_updates=["message"] — бот обрабатывает только /start,
 * остальные типы update Telegram даже не присылает.
 */

const botToken = process.env.BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.argv[2] ?? process.env.APP_URL;

const missing = [];
if (!botToken) missing.push("BOT_TOKEN (env)");
if (!webhookSecret) missing.push("TELEGRAM_WEBHOOK_SECRET (env)");
if (!appUrl) missing.push("APP_URL (env или первый аргумент)");
if (missing.length > 0) {
  console.error(`Не заданы обязательные параметры: ${missing.join(", ")}`);
  process.exit(1);
}

let webhookUrl;
try {
  webhookUrl = new URL("/api/bot/webhook", appUrl).toString();
} catch {
  console.error(`APP_URL не является корректным URL: ${appUrl}`);
  process.exit(1);
}
if (!webhookUrl.startsWith("https://")) {
  console.error(`Telegram принимает только https webhook, получено: ${webhookUrl}`);
  process.exit(1);
}

console.log(`Регистрируем webhook: ${webhookUrl}`);

try {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message"],
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const result = await response.json();
  // В ответе Telegram токена нет — печатать безопасно.
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    console.error("setWebhook завершился ошибкой (см. ответ выше).");
    process.exit(1);
  }
  console.log("Webhook установлен.");
} catch (error) {
  console.error(
    `Не удалось вызвать setWebhook: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
}
