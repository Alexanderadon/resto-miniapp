"use client";

// Телефон с маской «+7 (XXX) XXX-XX-XX». Наружу отдаём только 10 цифр
// после +7; в E.164 собирается на сабмите: "+7" + digits.

import { Input } from "@repo/ui";

type Props = {
  /** 10 цифр после +7 (или меньше, пока вводится) */
  value: string;
  onChange: (digits: string) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
};

/** Собирает маску из цифр; закрывающая «)» появляется только со второй группой,
 *  чтобы backspace не зацикливался на переформатировании. */
export function formatPhoneMask(digits: string): string {
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);

  let out = "+7";
  if (p1) out += ` (${p1}`;
  if (p2) out += `) ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

/** Достаёт 10 локальных цифр из произвольного ввода (маска, вставка «8707…», «+7707…») */
export function extractPhoneDigits(raw: string): string {
  // Вставка «+7707…» в конец занятого поля даёт два «+» — парсим от последнего.
  const plusIndex = raw.trimStart().startsWith("+") ? raw.lastIndexOf("+") : -1;
  const source = plusIndex >= 0 ? raw.slice(plusIndex) : raw;

  let digits = source.replace(/\D/g, "");
  if (plusIndex >= 0) {
    // «7» из префикса +7 (маска или вставленный «+7707…»)
    digits = digits.slice(1);
    // Вставка «87071234567» после префикса маски: локальный номер
    // с «8» не начинается — это код страны, отбрасываем.
    if (digits.length === 11 && digits[0] === "8") {
      digits = digits.slice(1);
    }
  } else if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    // Вставка полного номера с кодом страны вместо содержимого поля
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function PhoneInput({ value, onChange, error, disabled, id }: Props) {
  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      label="Телефон"
      placeholder="+7 (___) ___-__-__"
      value={value ? formatPhoneMask(value) : "+7 "}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(extractPhoneDigits(e.target.value))
      }
      error={error}
      disabled={disabled}
    />
  );
}
