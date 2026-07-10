import { describe, expect, it } from "vitest";
import { extractPhoneDigits, formatPhoneMask } from "./phone-input";

describe("extractPhoneDigits", () => {
  it("ввод по цифре внутри маски: префикс «+7» не считается локальной цифрой", () => {
    expect(extractPhoneDigits("+7 ")).toBe("");
    expect(extractPhoneDigits("+7 (7")).toBe("7");
    expect(extractPhoneDigits("+7 (707")).toBe("707");
    expect(extractPhoneDigits("+7 (707) 123-45-67")).toBe("7071234567");
  });

  it("вставка «87071234567» вместо содержимого поля", () => {
    expect(extractPhoneDigits("87071234567")).toBe("7071234567");
  });

  it("вставка «87071234567» после префикса маски «+7 »", () => {
    expect(extractPhoneDigits("+7 87071234567")).toBe("7071234567");
  });

  it("вставка «+77071234567»", () => {
    expect(extractPhoneDigits("+77071234567")).toBe("7071234567");
    // вставка после префикса маски
    expect(extractPhoneDigits("+7 +77071234567")).toBe("7071234567");
  });

  it("вставка «77071234567» (11 цифр без плюса)", () => {
    expect(extractPhoneDigits("77071234567")).toBe("7071234567");
  });

  it("вставка «7071234567» (10 локальных цифр)", () => {
    expect(extractPhoneDigits("7071234567")).toBe("7071234567");
    // вставка после префикса маски
    expect(extractPhoneDigits("+7 7071234567")).toBe("7071234567");
  });

  it("лишние цифры усекаются до 10", () => {
    expect(extractPhoneDigits("+7 (707) 123-45-678")).toBe("7071234567");
  });
});

describe("formatPhoneMask", () => {
  it("собирает маску по группам", () => {
    expect(formatPhoneMask("")).toBe("+7");
    expect(formatPhoneMask("707")).toBe("+7 (707");
    expect(formatPhoneMask("7071234567")).toBe("+7 (707) 123-45-67");
  });
});
