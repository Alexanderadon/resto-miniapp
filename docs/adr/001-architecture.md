# ADR-001: Архитектура Telegram Mini App «Заказ из ресторана»

Статус: Принято · Дата: 2026-07-10 · Автор: архитектор проекта

## 1. Версии стека (проверено по npm registry 2026-07-10)

Все версии сняты фактическими запросами `registry.npmjs.org/<pkg>/latest`, не по памяти.

### 1.1 Вердикт по Next.js 16 vs 15

Бриф фиксировал «Next.js 15+». Актуальный latest — **16.2.10**. Проверка зрелости по registry:

- `16.0.0` опубликован **2025-10-22** → major живёт ~8.5 месяцев;
- текущий патч `16.2.10` — от **2026-07-01**, ветка активно поддерживается;
- ветка 15.x (последний `15.5.20`) — уже maintenance-режим.

Ключевые breaking changes 16 относительно 15: Turbopack как дефолтный бандлер, окончательный перевод request APIs (`params`, `searchParams`, `cookies()`, `headers()`) в async-only, поднятая минимальная Node-версия. Ни один из них не конфликтует с Tailwind v4 (PostCSS-плагин `@tailwindcss/postcss` совместим с Turbopack) и Prisma 7 (серверный код, бандлеру безразличен).

**Решение: Next.js 16.2.10.** Начинать новый флагманский проект портфолио на maintenance-ветке 15.x в июле 2026 — минус на собеседовании, а не плюс.

### 1.2 Оговорка по TypeScript 7

Latest `typescript` = **7.0.2** — это первый стабильный релиз нативного (Go) компилятора, опубликован **2026-07-08, за два дня до этого ADR** (до него был только `7.0.1-rc`). Экосистема (typescript-eslint, плагины редакторов, next lint-пайплайн) физически не успела заявить официальную поддержку.

**Решение: в проекте пиннуем `typescript@5.9.3`** (последний стабильный 5.x, 2025-09-30). Апгрейд на 7.x — отдельный низкорисковый PR позже; для проекта, который должен «выглядеть как коммерческий продукт», зелёный CI важнее свежести компилятора. В таблице versions при этом зафиксирован фактический latest (7.0.2) — как того требует процесс.

Остальное — по latest без оговорок: React 19.2.7, Tailwind 4.3.2, Prisma 7.8.0, Zod 4 (импорт из `zod`, API v4), Vitest 4, ESLint 10 (только flat config), Stripe SDK 22.

## 2. Структура монорепо и контракты пакетов

```
/
├─ apps/
│  └─ miniapp/            # Next.js 16 App Router, FSD внутри src/
│     ├─ src/app/          # роуты — тонкий слой поверх FSD
│     │  ├─ (menu)/        # RSC-страницы меню
│     │  ├─ checkout/
│     │  └─ api/
│     │     ├─ auth/session/route.ts    # HMAC initData → JWT cookie
│     │     ├─ bot/webhook/route.ts     # Telegram webhook
│     │     └─ stripe/webhook/route.ts  # Stripe events
│     └─ src/{shared,entities,features,widgets}/   # FSD (light: без processes)
├─ packages/
│  ├─ ui/                 # тупые презентационные компоненты + общие Tailwind-токены (@theme)
│  ├─ db/                 # schema.prisma, миграции, seed, экспорт клиента
│  └─ iiko-adapter/       # интерфейс OrderProvider + MockIikoProvider
├─ turbo.json
└─ pnpm-workspace.yaml
```

Контракты (кто что имеет право знать):

| Пакет | Экспортирует | Не имеет права |
|---|---|---|
| `@repo/db` | singleton `prisma` (с `@prisma/adapter-pg`), сгенерированные типы, enum'ы | знать о Telegram, Stripe, iiko |
| `@repo/ui` | компоненты без бизнес-логики (Button, Card, Skeleton, Price), CSS-токены Tailwind v4 через `@theme` | импортировать db/adapter, делать fetch |
| `@repo/iiko-adapter` | `OrderProvider`, `MockIikoProvider`, `getOrderProvider()` | импортировать Prisma — принимает plain-DTO `OrderPayload` |
| `apps/miniapp` | — (потребитель) | ходить в Prisma мимо `@repo/db` |

Направление зависимостей строго вниз: `miniapp → {ui, db, iiko-adapter}`; пакеты друг о друге не знают. Это и есть демонстрируемый на собеседовании контракт монорепо.

FSD внутри miniapp — light: слои `shared → entities (menu-item, order, cart) → features (add-to-cart, checkout, favorites) → widgets (menu-list, cart-sheet) → app`. Public API каждого слайса через `index.ts`, кросс-импорты внутрь слайсов запрещены ESLint-правилом (`eslint-plugin-boundaries`).

## 3. Auth-флоу: initData → сессия

Проблема: `initData` приходит только при открытии Mini App, а валидировать HMAC в каждом Server Action — значит таскать initData в каждый вызов руками и дублировать криптографию.

Решение — **одна валидация, дальше собственная сессия**:

1. Клиент при монтировании (`@telegram-apps/sdk`) берёт `initDataRaw` и отправляет `POST /api/auth/session`.
2. Route handler валидирует по спецификации Telegram: `secret = HMAC_SHA256(key="WebAppData", data=bot_token)`, затем `hash == hex(HMAC_SHA256(key=secret, data=data_check_string))`, сравнение через `crypto.timingSafeEqual`.
3. **TTL initData: `auth_date` не старше 300 секунд.** Просроченный initData — это replay-риск, отклоняем 401 (Mini App при повторном открытии всё равно получает свежий).
4. При успехе подписываем **JWT (jose, HS256, секрет `SESSION_SECRET` — отдельный от bot token)** с payload `{ tgUserId, firstName, username }`, TTL 1 час, кладём в cookie `session`: `httpOnly; Secure; SameSite=None; Path=/` (SameSite=None обязателен — в Telegram Web клиенте Mini App живёт в iframe).
5. Server Actions и route handlers достают identity функцией `requireSession()` (читает `cookies()`, верифицирует JWT, кидает типизированную ошибку UNAUTHENTICATED). Проверка JWT — микросекунды, повторной HMAC-валидации initData нет.
6. Истечение JWT → любой Action возвращает `{ok:false, code:'UNAUTHENTICATED'}` → клиент молча повторяет шаг 1 (initDataRaw доступен всё время жизни WebApp) и ретраит. Пользователь ничего не замечает.

`tgUserId` в токене — единственный источник identity; клиентские поля «кто я» в Server Actions не принимаются никогда.

## 4. Поток заказа

**Корзина — на клиенте: zustand + `persist` (localStorage).** Обоснование против Context: корзина переживает закрытие Mini App (Telegram агрессивно убивает webview), обновления точечные без каскада ре-рендеров, стор не связан с RSC-деревом. В сторе лежат `{menuItemId, quantity}` и цена *только для отображения*.

**Оформление — Server Action `createOrder`, атомарно, цены из БД:**

```
input (zod): { items: {menuItemId, quantity(1..50)}[], customerName, phone(E.164),
               pickupTime(ISO, > now+20min, < now+7d), comment?, paymentMethod }
```

1. `requireSession()` → `tgUserId`.
2. Zod-парсинг. Клиентские цены в input отсутствуют по типу — их некуда даже прислать.
3. `prisma.$transaction`:
   - `menuItem.findMany({ where: { id: { in: ids }, isAvailable: true } })`;
   - если найдено меньше, чем заказано → `{ok:false, code:'ITEMS_UNAVAILABLE', ids:[...]}` (клиент подсвечивает и предлагает убрать);
   - сумма считается на сервере из БД-цен;
   - `order.create` с вложенными `items.create` — в каждый OrderItem пишутся **снапшоты `nameSnapshot` и `priceSnapshot`**: последующее изменение меню не переписывает историю заказов.
4. `paymentMethod=STRIPE` → создаём Stripe Checkout Session (test mode), сохраняем `stripeSessionId`, возвращаем URL; статус остаётся NEW до `checkout.session.completed` в Stripe-webhook (подпись события проверяется, `event.id` идемпотентен). `CASH` → сразу к шагу 5.
5. **После коммита**, через `after()` из `next/server` (не блокирует ответ, но выполняется в рамках жизни функции на Vercel): push в iiko-адаптер и подтверждение в чат.

Ответ Action — всегда discriminated union `{ok:true, orderId, publicNumber} | {ok:false, code, message}`; throw наружу не выпускаем, кроме непредвиденных (их ловит error boundary).

## 5. Webhook бота

Роут `POST /api/bot/webhook` (webhook, без long-polling — на Vercel long-polling в принципе невозможен):

1. **`secret_token`**: при `setWebhook` передаём `secret_token` (случайные 64 hex из env `TG_WEBHOOK_SECRET`); в роуте сверяем заголовок `X-Telegram-Bot-Api-Secret-Token` через `timingSafeEqual`, иначе 401. Это отсекает всех, кто не Telegram.
2. **Идемпотентность**: Telegram ретраит недоставленные update. Таблица `ProcessedUpdate(updateId BigInt @id)`: `create` первым действием; ловим `P2002` (duplicate) → мгновенно 200 без обработки.
3. Обрабатываем минимум: `/start` (приветствие + кнопка `web_app`), остальное игнорируем. Отвечаем 200 всегда и быстро (< 10 c, иначе Telegram считает недоставленным).
4. **Bot API — прямые fetch, без grammY** (см. keyDecisions): нужны 2-3 метода, типизированный клиент `callTgApi<T>(method, body)` на ~40 строк; grammY-middleware-стек в serverless-роуте — лишний вес и лишняя абстракция. Решение обратимо: если бот дорастёт до сцен/диалогов — мигрируем на grammY (`webhookCallback` встаёт в тот же роут).

**Подтверждение заказа в чат** — не через webhook, а из `after()`-хука `createOrder`: `sendMessage(chat_id = tgUserId)` с номером заказа, составом, суммой и временем самовывоза. Это работает, потому что пользователь уже нажимал Start у бота (Mini App открывается из бота). Ошибка отправки логируется, заказ не откатывает.

## 6. iiko-adapter

Ресторанные POS (iiko) — внешняя система, до которой в pet-проекте доступа нет. Честная стратегия для портфолио:

- **Интерфейс `OrderProvider`** — спроектирован по форме реального iikoCloud API (externalId, healthcheck, retryable-ошибки), см. код в отдельном артефакте.
- **`MockIikoProvider`** — задержка 300–1200 мс, структурированное логирование, настраиваемый `failureRate` для демонстрации обработки сбоев.
- **Фабрика `getOrderProvider()`** по `IIKO_PROVIDER=mock|iiko`; ветка `iiko` кидает осмысленную ошибку «not implemented, see README».
- **Honest README** в пакете: «Реальная интеграция с iiko не реализована — нет доступа к тестовому стенду. Пакет демонстрирует контракт: доменный слой зависит от интерфейса, провайдер подменяется через env, mock показывает деградацию». Это сильнее для собеседования, чем фейковая «интеграция».

Ошибка push (`ok:false`) не откатывает заказ: заказ уже в БД со статусом NEW, `externalId` пуст — это сигнал персоналу обработать вручную (в реальном продукте тут была бы очередь ретраев; для v1 фиксируем ограничение в README).

## 7. Ошибки и оффлайн

- **Zod на каждом входе**: initData-поля, input всех Server Actions, тело Telegram-update, тело Stripe-webhook. Не прошло — типизированный отказ, никаких «доверяем клиенту».
- **Server Actions не бросают бизнес-ошибки** — возвращают `Result`-union с кодом; UI мапит коды на человеческие сообщения. `error.tsx`-boundaries на сегмент — только для непредвиденного.
- **Оффлайн**: Mini App живёт в webview с нестабильной мобильной сетью. Корзина в localStorage уже переживает обрыв; сабмит заказа — с таймаутом 10 с и кнопкой «Повторить» (создание заказа идемпотентно с клиентским `Idempotency-Key`-полем? — нет, для v1 проще: до ответа сервера кнопка заблокирована, при таймауте показываем «проверьте раздел Мои заказы», который читает истину из БД). Слушаем `online/offline` события → баннер «Нет сети».
- **Меню** кэшируется на сервере (`revalidateTag('menu')`), так что при деградации БД страница отдаётся из кэша.

## 8. Сервер vs клиент (RSC-граница)

| Рендерим на сервере (RSC) | На клиенте ('use client') |
|---|---|
| Страницы меню: категории, карточки, цены — данные из Prisma, кэш `revalidateTag('menu')` | Инициализация `@telegram-apps/sdk` (theme, viewport, MainButton, haptics) — provider в корневом layout, dynamic без SSR |
| Страница «Мои заказы» (по сессии) | Корзина целиком: стор, cart-sheet, счётчики количества |
| Layout, статические тексты | Форма checkout (интерактивная валидация) + вызов Server Action |
| — | Кнопки «избранное» (optimistic update + Server Action) |

Правило: данные и цены рождаются только на сервере; клиентские компоненты — тонкие интерактивные острова поверх серверного каркаса. Мутации — только Server Actions, ни одного клиентского fetch к собственному API (кроме `POST /api/auth/session`, которому нужен raw-ответ с Set-Cookie до первого Action).

## 9. Деплой

Vercel hobby: apps/miniapp как Next-проект, Postgres — Neon (или Vercel Postgres), Prisma 7 через `@prisma/adapter-pg` (driver adapters в v7 — GA, обязательны для нового `prisma-client`-генератора). Env: `DATABASE_URL`, `BOT_TOKEN`, `TG_WEBHOOK_SECRET`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `IIKO_PROVIDER=mock`. Webhook ставится скриптом `scripts/set-webhook.ts` после деплоя.