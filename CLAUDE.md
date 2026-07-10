# resto-miniapp — Claude Code Context

## Что это
Telegram Mini App для ресторанов: каталог меню → корзина → оформление → подтверждение ботом → админка заказов. Флагманский продукт-витрина Alexander Kurchakov (GitHub Alexanderadon). Должен выглядеть и работать как коммерческий продукт.

## Жёсткие правила
- В README/коде НЕ писать: «учебный», «pet», «demo», «заказчик/клиент». Это личный продукт.
- Ноль lorem ipsum — только реальное меню и реальные тексты.
- Язык UI — русский. README — RU + короткая EN-секция в конце.
- Секреты только в env. Токены в код/коммиты не попадают никогда.
- iiko-интеграция — честный mock-слой: `packages/iiko-adapter` («adapter interface, mock provider» в README).
- Никаких тяжёлых UI-китов — свой UI на Tailwind v4.
- Auth = серверная валидация Telegram initData (HMAC). Цены заказов пересчитываются из БД, клиентским не верим.

## Стек
Next.js 15 App Router (RSC + Server Actions), TypeScript strict, Turborepo + pnpm,
FSD в `apps/miniapp`, Tailwind CSS v4, Prisma + Postgres (Supabase, ref `mdhifvjxrbkzqyuqajzk`, eu-central-1),
Zod, Vitest, Playwright, Vercel (бот — webhook-роут, без long-polling), Stripe Checkout test mode (v1).

## Структура
- `apps/miniapp` — Next.js мини-апп + api-роуты (bot webhook, stripe webhook)
- `packages/ui` — shared UI-компоненты
- `packages/db` — Prisma схема, клиент, seed
- `packages/iiko-adapter` — интерфейс OrderProvider + mock
- `docs/` — ADR, UI-спека

## Команды
- `pnpm install` / `pnpm dev` / `pnpm build`
- `pnpm test` — Vitest
- `pnpm lint` / `pnpm typecheck`

## Git
Conventional commits, мелкие атомарные (5–15 за сессию, не squash). CI зелёный на main. Реп публичный: Alexanderadon/resto-miniapp.
