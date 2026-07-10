import { describe, expect, it } from "vitest";
import {
  MAX_ORDER_ITEM_QUANTITY,
  createOrderInputSchema,
} from "./schema";

/** Валидный вход целиком — отдельные тесты портят по одному полю */
function validInput() {
  return {
    idempotencyKey: "9b2f8a3e-1c4d-4e5f-8a6b-7c8d9e0f1a2b",
    customerName: "Александр",
    phone: "+77071234567",
    pickupTimeIso: "2026-07-11T10:00:00.000Z",
    comment: "Без лука, пожалуйста",
    paymentMethod: "CASH" as const,
    items: [
      { menuItemId: "item-1", quantity: 1 },
      { menuItemId: "item-2", quantity: 3 },
    ],
  };
}

describe("createOrderInputSchema", () => {
  it("валидный вход проходит целиком", () => {
    const result = createOrderInputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("валидный вход без опционального comment проходит", () => {
    const { comment: _omit, ...input } = validInput();
    expect(createOrderInputSchema.safeParse(input).success).toBe(true);
  });

  describe("phone: маска +7XXXXXXXXXX", () => {
    it.each([
      ["без плюса", "77071234567"],
      ["формат 8XXXXXXXXXX", "87071234567"],
      ["9 цифр после +7", "+7707123456"],
      ["11 цифр после +7", "+770712345678"],
      ["с пробелами", "+7 707 123 45 67"],
      ["с дефисами", "+7-707-123-45-67"],
      ["буквы вместо цифр", "+7707abc4567"],
      ["другая страна (+996)", "+996700123456"],
      ["пустая строка", ""],
    ])("телефон не по маске (%s) отклоняется", (_name, phone) => {
      const result = createOrderInputSchema.safeParse({ ...validInput(), phone });
      expect(result.success).toBe(false);
    });

    it("корректный E.164 казахстанский номер проходит", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        phone: "+77001234567",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("items", () => {
    it("пустой массив items отклоняется", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it.each([
      ["ноль", 0],
      ["больше лимита (21)", MAX_ORDER_ITEM_QUANTITY + 1],
      ["дробное", 2.5],
      ["отрицательное", -1],
    ])("quantity %s отклоняется", (_name, quantity) => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        items: [{ menuItemId: "item-1", quantity }],
      });
      expect(result.success).toBe(false);
    });

    it("граничные quantity 1 и 20 проходят", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        items: [
          { menuItemId: "item-1", quantity: 1 },
          { menuItemId: "item-2", quantity: MAX_ORDER_ITEM_QUANTITY },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("пустой menuItemId отклоняется", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        items: [{ menuItemId: "", quantity: 1 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("idempotencyKey", () => {
    it.each([
      ["произвольная строка", "not-a-uuid"],
      ["почти uuid (лишний символ)", "9b2f8a3e-1c4d-4e5f-8a6b-7c8d9e0f1a2bx"],
      ["uuid без дефисов", "9b2f8a3e1c4d4e5f8a6b7c8d9e0f1a2b"],
      ["пустая строка", ""],
    ])("не-uuid idempotencyKey (%s) отклоняется", (_name, idempotencyKey) => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        idempotencyKey,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("comment", () => {
    it("comment из 201 символа отклоняется", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        comment: "к".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("comment ровно из 200 символов проходит", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        comment: "к".repeat(200),
      });
      expect(result.success).toBe(true);
    });

    it("comment из 201 символа с хвостовыми пробелами проходит после trim (200 значимых)", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        comment: `${"к".repeat(200)} `,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("expectedTotalTenge (опциональный)", () => {
    it("вход без expectedTotalTenge проходит", () => {
      const result = createOrderInputSchema.safeParse(validInput());
      expect(result.success).toBe(true);
      expect(result.data?.expectedTotalTenge).toBeUndefined();
    });

    it("целое положительное значение проходит", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        expectedTotalTenge: 4500,
      });
      expect(result.success).toBe(true);
    });

    it.each([
      ["ноль", 0],
      ["дробное", 4500.5],
      ["отрицательное", -100],
    ])("expectedTotalTenge %s отклоняется", (_name, expectedTotalTenge) => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        expectedTotalTenge,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("прочие поля", () => {
    it("paymentMethod STRIPE принимается (оплата картой онлайн)", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        paymentMethod: "STRIPE",
      });
      expect(result.success).toBe(true);
    });

    it("неизвестный paymentMethod отклоняется", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        paymentMethod: "CRYPTO",
      });
      expect(result.success).toBe(false);
    });

    it("pickupTimeIso не в ISO-формате отклоняется", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        pickupTimeIso: "завтра в 10",
      });
      expect(result.success).toBe(false);
    });

    it("customerName короче 2 символов после trim отклоняется", () => {
      const result = createOrderInputSchema.safeParse({
        ...validInput(),
        customerName: " А ",
      });
      expect(result.success).toBe(false);
    });
  });
});
