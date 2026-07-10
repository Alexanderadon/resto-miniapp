import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateInitData } from "./init-data";

const BOT_TOKEN = "7654321098:AAHtestBotToken_ABCdef1234567890xyz";

/** HMAC-подпись по официальному алгоритму Telegram Mini Apps */
function sign(params: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
}

function toQuery(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) sp.append(key, value);
  return sp.toString();
}

const TEST_USER = {
  id: 123456789,
  first_name: "Александр",
  last_name: "Курчаков",
  username: "alex_test",
  language_code: "ru",
};

function baseParams(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    query_id: "AAHdF6IQAAAAANF0ohDhrOrc",
    user: JSON.stringify(TEST_USER),
    auth_date: String(Math.floor(Date.now() / 1000)),
    ...overrides,
  };
}

/** Собирает подписанный initData; overrides применяются ДО подписи */
function buildInitData(overrides: Record<string, string> = {}): string {
  const params = baseParams(overrides);
  return toQuery({ ...params, hash: sign(params, BOT_TOKEN) });
}

describe("validateInitData", () => {
  it("валидный initData проходит и возвращает user и authDate", () => {
    const authDate = Math.floor(Date.now() / 1000);
    const result = validateInitData(
      buildInitData({ auth_date: String(authDate) }),
      BOT_TOKEN,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.authDate).toBe(authDate);
    expect(result.user).toEqual({
      id: 123456789,
      firstName: "Александр",
      lastName: "Курчаков",
      username: "alex_test",
      languageCode: "ru",
    });
  });

  it("подделанный hash (валидный hex, но не та подпись) отклоняется", () => {
    const params = baseParams();
    const goodHash = sign(params, BOT_TOKEN);
    // Меняем первый символ hex на другой — длина и формат сохраняются
    const forged = (goodHash[0] === "0" ? "1" : "0") + goodHash.slice(1);
    const result = validateInitData(toQuery({ ...params, hash: forged }), BOT_TOKEN);

    expect(result).toEqual({ ok: false, reason: "hash mismatch" });
  });

  it("подпись другим бот-токеном отклоняется", () => {
    const params = baseParams();
    const hash = sign(params, "0000000000:otherBotTokenXYZ");
    const result = validateInitData(toQuery({ ...params, hash }), BOT_TOKEN);

    expect(result).toEqual({ ok: false, reason: "hash mismatch" });
  });

  it("истёкший auth_date (старше 300 секунд) отклоняется", () => {
    const stale = Math.floor(Date.now() / 1000) - 301;
    const result = validateInitData(
      buildInitData({ auth_date: String(stale) }),
      BOT_TOKEN,
    );

    expect(result).toEqual({
      ok: false,
      reason: "init data is expired (replay protection)",
    });
  });

  it("кастомный maxAgeSec: возраст 120с режется при лимите 60с и проходит при 3600с", () => {
    const initData = buildInitData({
      auth_date: String(Math.floor(Date.now() / 1000) - 120),
    });

    expect(validateInitData(initData, BOT_TOKEN, 60).ok).toBe(false);
    expect(validateInitData(initData, BOT_TOKEN, 3600).ok).toBe(true);
  });

  it("отсутствующий hash отклоняется", () => {
    const result = validateInitData(toQuery(baseParams()), BOT_TOKEN);
    expect(result).toEqual({ ok: false, reason: "hash field is missing" });
  });

  it("пустая строка отклоняется", () => {
    expect(validateInitData("", BOT_TOKEN)).toEqual({
      ok: false,
      reason: "empty init data",
    });
  });

  it("мусор вместо query string отклоняется", () => {
    expect(validateInitData("%%%не-query-строка%%%", BOT_TOKEN).ok).toBe(false);
    expect(validateInitData("just some garbage", BOT_TOKEN).ok).toBe(false);
  });

  it("пустой botToken отклоняется", () => {
    expect(validateInitData(buildInitData(), "")).toEqual({
      ok: false,
      reason: "empty bot token",
    });
  });

  it("лишние подписанные поля (включая спецсимволы) участвуют в data_check_string и не ломают валидацию", () => {
    const result = validateInitData(
      buildInitData({
        start_param: "promo_2026",
        chat_instance: "-9007199254740991",
        custom: "значение с пробелами & знаком = внутри",
      }),
      BOT_TOKEN,
    );

    expect(result.ok).toBe(true);
  });

  it("неподписанное лишнее поле, добавленное после подписи, ломает подпись", () => {
    const params = baseParams();
    const hash = sign(params, BOT_TOKEN); // подписали БЕЗ extra
    const query = toQuery({ ...params, extra: "injected", hash });

    expect(validateInitData(query, BOT_TOKEN)).toEqual({
      ok: false,
      reason: "hash mismatch",
    });
  });

  it.each(["user", "auth_date", "query_id"])(
    "изменение поля %s после подписи ломает подпись",
    (field) => {
      const params = baseParams();
      const hash = sign(params, BOT_TOKEN);
      const tampered = {
        ...params,
        [field]:
          field === "user"
            ? JSON.stringify({ ...TEST_USER, id: 999 })
            : `${params[field]}0`,
        hash,
      };

      expect(validateInitData(toQuery(tampered), BOT_TOKEN)).toEqual({
        ok: false,
        reason: "hash mismatch",
      });
    },
  );

  it("подписанный initData без auth_date отклоняется", () => {
    const params = {
      query_id: "AAH1",
      user: JSON.stringify(TEST_USER),
    };
    const query = toQuery({ ...params, hash: sign(params, BOT_TOKEN) });
    const result = validateInitData(query, BOT_TOKEN);

    expect(result).toEqual({
      ok: false,
      reason: "auth_date field is missing or invalid",
    });
  });

  it("подписанный initData без user отклоняется", () => {
    const params = {
      query_id: "AAH1",
      auth_date: String(Math.floor(Date.now() / 1000)),
    };
    const query = toQuery({ ...params, hash: sign(params, BOT_TOKEN) });

    expect(validateInitData(query, BOT_TOKEN)).toEqual({
      ok: false,
      reason: "user field is missing",
    });
  });

  it("user с невалидным JSON отклоняется", () => {
    const result = validateInitData(
      buildInitData({ user: "{not json" }),
      BOT_TOKEN,
    );
    expect(result).toEqual({ ok: false, reason: "user field is not valid JSON" });
  });

  it("опциональные поля user не подставляются, если их нет", () => {
    const result = validateInitData(
      buildInitData({ user: JSON.stringify({ id: 42, first_name: "Ая" }) }),
      BOT_TOKEN,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user).toEqual({ id: 42, firstName: "Ая" });
    expect("lastName" in result.user).toBe(false);
    expect("username" in result.user).toBe(false);
  });
});
