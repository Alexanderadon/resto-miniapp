# @repo/iiko-adapter

Слой интеграции с POS-системой ресторана (iiko): **adapter interface + mock provider**.

## Честно о статусе

Реальная интеграция с iikoCloud API здесь **не реализована** — у проекта нет доступа
к тестовому стенду iiko. Пакет демонстрирует то, что в такой интеграции важно
архитектурно:

- доменный код зависит только от интерфейса `OrderProvider`, а не от конкретной POS;
- реализация выбирается через env (`IIKO_PROVIDER=mock`), подмена не трогает бизнес-логику;
- контракт спроектирован по мотивам публичной iikoCloud API (создание доставки/заказа):
  plain-DTO вход, discriminated union результата, `retryable`-флаг для ретраев.

`MockIikoProvider` имитирует сетевую задержку (300–1200 мс) и настраиваемую долю
сбоев (`IIKO_MOCK_FAILURE_RATE`) — на них проверяется обработка ошибок в основном приложении.

## API

```ts
import { getOrderProvider } from "@repo/iiko-adapter";

const provider = getOrderProvider(); // singleton по env IIKO_PROVIDER
const result = await provider.pushOrder(payload); // { ok: true, externalId } | { ok: false, error, retryable }
```

Подключение реальной iiko сводится к реализации `OrderProvider` (авторизация
по apiLogin → access token, `POST /api/1/deliveries/create`) и регистрации её в фабрике.
