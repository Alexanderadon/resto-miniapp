// packages/iiko-adapter/src/index.test.ts
// Юнит-тесты MockIikoProvider и фабрики getOrderProvider.
// Без сети и Prisma — только чистая логика пакета.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockIikoProvider, type OrderPayload } from './index';

const makeOrder = (overrides: Partial<OrderPayload> = {}): OrderPayload => ({
  orderId: 'ord-test-1',
  publicNumber: 42,
  customerName: 'Тестовый Клиент',
  phone: '+77001234567',
  pickupTime: '2026-07-10T12:30:00.000Z',
  paymentMethod: 'CASH',
  items: [
    { externalId: null, name: 'Плов', quantity: 2, priceTenge: 2500 },
    { externalId: 'ext-77', name: 'Чай', quantity: 1, priceTenge: 500 },
  ],
  totalTenge: 5500,
  ...overrides,
});

const makeLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

/** Нулевая задержка — чтобы тесты не ждали реальные 300–1200 мс */
const instant = { min: 0, max: 0 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MockIikoProvider.pushOrder', () => {
  it('failureRate 0: возвращает ok:true и externalId с префиксом mock-iiko-', async () => {
    const logger = makeLogger();
    const provider = new MockIikoProvider({ failureRate: 0, latency: instant, logger });

    const result = await provider.pushOrder(makeOrder());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.externalId).toMatch(/^mock-iiko-[0-9a-f-]{36}$/);
    }
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('failureRate 0: externalId уникален между вызовами', async () => {
    const provider = new MockIikoProvider({ latency: instant, logger: makeLogger() });

    const first = await provider.pushOrder(makeOrder());
    const second = await provider.pushOrder(makeOrder());

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.externalId).not.toBe(second.externalId);
    }
  });

  it('failureRate 0: успех даже при Math.random() === 0 (строгое сравнение <)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const provider = new MockIikoProvider({ failureRate: 0, latency: instant, logger: makeLogger() });

    const result = await provider.pushOrder(makeOrder());

    expect(result.ok).toBe(true);
  });

  it('failureRate 1: возвращает ok:false с retryable:true и непустой ошибкой, не бросая исключение', async () => {
    const logger = makeLogger();
    const provider = new MockIikoProvider({ failureRate: 1, latency: instant, logger });

    const result = await provider.pushOrder(makeOrder());

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('timeout'),
      retryable: true,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('failureRate 1: сбой даже при Math.random(), близком к 1 (граница диапазона)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999);
    const provider = new MockIikoProvider({ failureRate: 1, latency: instant, logger: makeLogger() });

    const result = await provider.pushOrder(makeOrder());

    expect(result.ok).toBe(false);
  });
});

describe('MockIikoProvider.healthcheck', () => {
  it('возвращает healthy:true, provider "mock-iiko" и неотрицательный latencyMs', async () => {
    const provider = new MockIikoProvider({ latency: instant, logger: makeLogger() });

    const result = await provider.healthcheck();

    expect(result.healthy).toBe(true);
    expect(result.provider).toBe('mock-iiko');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.latencyMs)).toBe(true);
  });
});

describe('имитация сетевой задержки', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('не резолвится раньше рассчитанной задержки внутри диапазона [min, max]', async () => {
    // random=0.5 → delay = 300 + 0.5 * (1200 - 300) = 750 мс
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const provider = new MockIikoProvider({
      latency: { min: 300, max: 1200 },
      logger: makeLogger(),
    });

    let resolved = false;
    const pending = provider.healthcheck().then((r) => {
      resolved = true;
      return r;
    });

    await vi.advanceTimersByTimeAsync(749);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(resolved).toBe(true);
    expect(result.latencyMs).toBe(750);
  });

  it('при min === max задержка детерминирована и равна min', async () => {
    const provider = new MockIikoProvider({
      latency: { min: 500, max: 500 },
      logger: makeLogger(),
    });

    let resolved = false;
    void provider.healthcheck().then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });
});

describe('getOrderProvider', () => {
  // Модуль держит singleton в переменной уровня модуля — для изоляции тестов
  // сбрасываем кэш модулей и импортируем заново в каждом кейсе.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('singleton: два вызова возвращают один и тот же инстанс MockIikoProvider', async () => {
    vi.stubEnv('IIKO_PROVIDER', 'mock');
    const mod = await import('./index');

    const first = mod.getOrderProvider();
    const second = mod.getOrderProvider();

    expect(first).toBe(second);
    expect(first).toBeInstanceOf(mod.MockIikoProvider);
  });

  it('без IIKO_PROVIDER по умолчанию возвращает mock-провайдер', async () => {
    vi.stubEnv('IIKO_PROVIDER', undefined);
    const mod = await import('./index');

    const provider = mod.getOrderProvider();

    expect(provider).toBeInstanceOf(mod.MockIikoProvider);
  });

  it('IIKO_PROVIDER=iiko: бросает — реальный провайдер не реализован', async () => {
    vi.stubEnv('IIKO_PROVIDER', 'iiko');
    const mod = await import('./index');

    expect(() => mod.getOrderProvider()).toThrow(/not implemented/i);
  });

  it('неизвестное значение IIKO_PROVIDER: бросает с именем провайдера в сообщении', async () => {
    vi.stubEnv('IIKO_PROVIDER', 'r-keeper');
    const mod = await import('./index');

    expect(() => mod.getOrderProvider()).toThrow('Unknown IIKO_PROVIDER: "r-keeper"');
  });

  it('IIKO_MOCK_FAILURE_RATE=1 пробрасывается в mock: pushOrder фабричного провайдера фейлится', async () => {
    vi.stubEnv('IIKO_PROVIDER', 'mock');
    vi.stubEnv('IIKO_MOCK_FAILURE_RATE', '1');
    // random=0 → delay = дефолтный min (300 мс); 0 < failureRate 1 → сбой
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // Фабрика создаёт провайдер с logger=console — глушим warn, чтобы не шуметь в выводе
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      const mod = await import('./index');
      const provider = mod.getOrderProvider();

      const pending = provider.pushOrder(makeOrder());
      await vi.advanceTimersByTimeAsync(300);
      const result = await pending;

      expect(result).toMatchObject({ ok: false, retryable: true });
    } finally {
      vi.useRealTimers();
    }
  });
});
