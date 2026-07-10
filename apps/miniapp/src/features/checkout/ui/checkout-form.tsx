"use client";

// Форма оформления заказа (ui-spec §4). Клиентская: инлайн-валидация Zod,
// слоты генерируются после маунта, черновик — в localStorage,
// idempotencyKey — один на маунт формы.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, RadioGroup, Input, Textarea, formatTenge } from "@repo/ui";
import { totalTenge, useCartStore } from "@/entities/cart";
import { haptic } from "@/shared/lib/haptics";
import { createOrder } from "../api/create-order";
import { generateTimeSlots, type SlotGeneration } from "../lib/time-slots";
import { customerNameSchema, phoneE164Schema } from "../model/schema";
import { PhoneInput } from "./phone-input";
import { TimeSlotPicker } from "./time-slot-picker";

const DRAFT_KEY = "aport-checkout-draft";

type FieldErrors = {
  name?: string;
  phone?: string;
  slot?: string;
};

type Draft = {
  name?: string;
  phoneDigits?: string;
  comment?: string;
};

export function CheckoutForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const removeItem = useCartStore((s) => s.remove);

  // До маунта items из persist ещё не совпадают с SSR-разметкой — скелетон.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Один ключ идемпотентности на маунт формы: ретрай сабмита не создаёт дубль.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [name, setName] = useState(initialName);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [slots, setSlots] = useState<SlotGeneration | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [payment, setPayment] = useState<"CASH">("CASH");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const succeededRef = useRef(false);

  const total = totalTenge(items);

  // Слоты — только на клиенте после маунта (SSR-время сервера ≠ время устройства).
  useEffect(() => {
    const generated = generateTimeSlots();
    setSlots(generated);
    setSlotIso(generated.slots[0]?.iso ?? null);
  }, []);

  // Восстановление черновика (телефон, комментарий; имя — если сессия его не дала).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      if (!initialName && draft.name) setName(draft.name);
      if (draft.phoneDigits) setPhoneDigits(draft.phoneDigits);
      if (draft.comment) setComment(draft.comment);
    } catch {
      // битый черновик — игнорируем
    }
  }, [initialName]);

  // Автосохранение черновика.
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ name, phoneDigits, comment } satisfies Draft),
      );
    } catch {
      // квота/приватный режим — не критично
    }
  }, [name, phoneDigits, comment]);

  // Прямой заход с пустой корзиной → в корзину (empty-state).
  // Только после маунта: во время гидрации useSyncExternalStore отдаёт
  // серверный снапшот (пустой), и без гварда редирект срабатывал бы
  // на любой прямой заход/перезагрузку /checkout с полной корзиной.
  useEffect(() => {
    if (mounted && items.length === 0 && !succeededRef.current) {
      router.replace("/cart");
    }
  }, [mounted, items.length, router]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const nameCheck = customerNameSchema.safeParse(name);
    if (!nameCheck.success) {
      next.name = nameCheck.error.issues[0]?.message ?? "Введите имя";
    }
    if (!phoneE164Schema.safeParse(`+7${phoneDigits}`).success) {
      next.phone = "Введите телефон полностью";
    }
    if (!slotIso) {
      next.slot = "Выберите время самовывоза";
    }
    return next;
  }

  function scrollToFirstInvalid(fieldErrors: FieldErrors) {
    const firstId = fieldErrors.name
      ? "checkout-name"
      : fieldErrors.phone
        ? "checkout-phone"
        : "checkout-slots";
    document
      .getElementById(firstId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      haptic.notification("error");
      scrollToFirstInvalid(fieldErrors);
      return;
    }

    setServerError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createOrder>>;
      try {
        result = await createOrder({
          idempotencyKey,
          customerName: name.trim(),
          phone: `+7${phoneDigits}`,
          pickupTimeIso: slotIso!,
          comment: comment.trim() ? comment.trim() : undefined,
          paymentMethod: payment,
          expectedTotalTenge: total,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
        });
      } catch {
        // Сеть/сервер упали до ответа. idempotencyKey делает ретрай безопасным.
        haptic.notification("error");
        setServerError(
          "Не удалось отправить заказ. Проверьте соединение и попробуйте ещё раз",
        );
        return;
      }

      if (result.ok) {
        succeededRef.current = true;
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // не критично
        }
        clearCart();
        haptic.notification("success");
        router.push(`/order/${result.orderId}`);
        return;
      }

      if (result.code === "ITEMS_UNAVAILABLE") {
        // Убираем закончившиеся позиции из корзины (имена — ДО удаления),
        // чтобы ретрай не упирался в ту же ошибку.
        const unavailable = new Set(result.unavailableIds ?? []);
        const names = items
          .filter((i) => unavailable.has(i.menuItemId))
          .map((i) => `«${i.name}»`);
        for (const id of unavailable) removeItem(id);
        haptic.notification("warning");
        setServerError(
          names.length > 0
            ? `Закончились: ${names.join(", ")} — мы убрали их из корзины. Проверьте заказ и подтвердите ещё раз`
            : result.message,
        );
        return;
      }

      if (result.code === "PRICE_CHANGED") {
        // Актуальных цен по позициям в ответе нет — показываем новый итог.
        haptic.notification("warning");
        setServerError(result.message);
        return;
      }

      haptic.notification("error");
      if (result.code === "PICKUP_TIME_INVALID") {
        // Слот протух, пока пользователь заполнял форму — перегенерируем.
        const regenerated = generateTimeSlots();
        setSlots(regenerated);
        setSlotIso(regenerated.slots[0]?.iso ?? null);
      }
      setServerError(result.message);
    });
  }

  if (!mounted) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 w-full rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4 pt-3">
      <fieldset disabled={isPending} className="flex flex-col gap-4">
        <Card className="p-4">
          <h2 className="mb-3 text-caption font-medium uppercase text-muted">
            Контакты
          </h2>
          <div className="space-y-3">
            <Input
              id="checkout-name"
              label="Имя"
              autoComplete="name"
              placeholder="Как к вам обращаться"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              error={errors.name}
            />
            <PhoneInput
              id="checkout-phone"
              value={phoneDigits}
              onChange={setPhoneDigits}
              error={errors.phone}
            />
          </div>
        </Card>

        <div id="checkout-slots">
          <Card className="p-4">
            <h2 className="mb-3 text-caption font-medium uppercase text-muted">
              Время самовывоза
            </h2>
            <TimeSlotPicker
              generation={slots}
              value={slotIso}
              onChange={setSlotIso}
              error={errors.slot}
              disabled={isPending}
            />
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="mb-3 text-caption font-medium uppercase text-muted">
            Оплата
          </h2>
          <RadioGroup
            name="payment"
            label="Способ оплаты"
            value={payment}
            onChange={(value: string) => {
              haptic.selection();
              if (value === "CASH") setPayment("CASH");
            }}
            options={[
              { value: "CASH", label: "Наличными при получении" },
              {
                value: "STRIPE",
                label: "Картой онлайн",
                disabled: true,
                description: "Скоро",
              },
            ]}
          />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-caption font-medium uppercase text-muted">
            Комментарий
          </h2>
          <Textarea
            id="checkout-comment"
            aria-label="Комментарий к заказу"
            placeholder="Например: без лука"
            rows={2}
            maxLength={200}
            value={comment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setComment(e.target.value.slice(0, 200))
            }
          />
        </Card>

        <div className="flex items-center justify-between px-1">
          <span className="font-medium text-ink">Итого</span>
          <span className="text-price text-ink" data-numeric>
            {formatTenge(total)}
          </span>
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-4 mt-auto bg-bg px-4 pt-2 pb-safe-3">
        {serverError && (
          <p
            role="alert"
            className="mb-2 rounded-button bg-danger-soft px-3 py-2 text-caption text-danger"
          >
            {serverError}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={isPending}
          disabled={isPending || items.length === 0}
        >
          {isPending ? "Отправляем…" : `Заказать ・ ${formatTenge(total)}`}
        </Button>
      </div>
    </form>
  );
}
