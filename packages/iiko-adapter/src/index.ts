// packages/iiko-adapter/src/index.ts
// Контракт интеграции с POS-системой (iiko) + mock-провайдер.
// ВАЖНО (см. README пакета): реальная интеграция с iikoCloud не реализована —
// нет доступа к тестовому стенду. Пакет демонстрирует контракт: доменный слой
// зависит только от интерфейса, реализация подменяется через env.
// Пакет намеренно не зависит от Prisma — принимает plain-DTO.

// ── Входной DTO ──────────────────────────────────────────────────────────

export interface OrderPayloadItem {
  /** Идентификатор блюда во внешней POS; null, если маппинг не настроен */
  externalId: string | null;
  /** Снапшот названия на момент заказа */
  name: string;
  quantity: number;
  /** Цена за единицу в тенге (целое) */
  priceTenge: number;
}

export interface OrderPayload {
  /** Внутренний id заказа (Order.id) — для трассировки и идемпотентности */
  orderId: string;
  /** Человекочитаемый номер (Order.publicNumber) */
  publicNumber: number;
  customerName: string;
  phone: string;
  /** ISO 8601, время самовывоза */
  pickupTime: string;
  comment?: string;
  paymentMethod: 'CASH' | 'STRIPE';
  items: OrderPayloadItem[];
  /** Итог в тенге, уже пересчитанный сервером из БД */
  totalTenge: number;
}

// ── Результаты ───────────────────────────────────────────────────────────

export type PushOrderResult =
  | { ok: true; externalId: string }
  | { ok: false; error: string; retryable: boolean };

export interface HealthcheckResult {
  healthy: boolean;
  latencyMs: number;
  provider: string;
}

// ── Контракт провайдера ──────────────────────────────────────────────────

export interface OrderProvider {
  /** Передать заказ в POS. Никогда не бросает — все сбои в PushOrderResult. */
  pushOrder(order: OrderPayload): Promise<PushOrderResult>;
  healthcheck(): Promise<HealthcheckResult>;
}

// ── Mock-провайдер ───────────────────────────────────────────────────────

export interface MockIikoOptions {
  /** Доля искусственных сбоев, 0..1 (для демонстрации обработки ошибок) */
  failureRate?: number;
  /** Диапазон имитируемой сетевой задержки, мс */
  latency?: { min: number; max: number };
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export class MockIikoProvider implements OrderProvider {
  private readonly failureRate: number;
  private readonly latency: { min: number; max: number };
  private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>;

  constructor(options: MockIikoOptions = {}) {
    this.failureRate = options.failureRate ?? 0;
    this.latency = options.latency ?? { min: 300, max: 1200 };
    this.logger = options.logger ?? console;
  }

  async pushOrder(order: OrderPayload): Promise<PushOrderResult> {
    const startedAt = Date.now();
    await this.simulateNetwork();

    if (Math.random() < this.failureRate) {
      const error = 'iiko API timeout (simulated)';
      this.logger.warn(
        `[iiko:mock] pushOrder FAILED order=${order.orderId} #${order.publicNumber} ` +
          `after ${Date.now() - startedAt}ms: ${error}`,
      );
      return { ok: false, error, retryable: true };
    }

    const externalId = `mock-iiko-${crypto.randomUUID()}`;
    this.logger.info(
      `[iiko:mock] pushOrder OK order=${order.orderId} #${order.publicNumber} ` +
        `items=${order.items.length} total=${order.totalTenge}₸ ` +
        `pickup=${order.pickupTime} -> externalId=${externalId} ` +
        `(${Date.now() - startedAt}ms)`,
    );
    return { ok: true, externalId };
  }

  async healthcheck(): Promise<HealthcheckResult> {
    const startedAt = Date.now();
    await this.simulateNetwork();
    return {
      healthy: true,
      latencyMs: Date.now() - startedAt,
      provider: 'mock-iiko',
    };
  }

  private simulateNetwork(): Promise<void> {
    const { min, max } = this.latency;
    const delayMs = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

// ── Фабрика ──────────────────────────────────────────────────────────────

let cached: OrderProvider | undefined;

/**
 * Выбор провайдера по env IIKO_PROVIDER ('mock' | 'iiko', default 'mock').
 * Singleton — переиспользуется между инвокациями serverless-функции.
 */
export function getOrderProvider(): OrderProvider {
  if (cached) return cached;

  const kind = process.env.IIKO_PROVIDER ?? 'mock';
  switch (kind) {
    case 'mock':
      cached = new MockIikoProvider({
        failureRate: Number(process.env.IIKO_MOCK_FAILURE_RATE ?? 0),
      });
      return cached;
    case 'iiko':
      throw new Error(
        'Real iiko provider is not implemented (no access to an iiko sandbox). ' +
          'See packages/iiko-adapter/README.md. Use IIKO_PROVIDER=mock.',
      );
    default:
      throw new Error(`Unknown IIKO_PROVIDER: "${kind}" (expected 'mock' | 'iiko')`);
  }
}