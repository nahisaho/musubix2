import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GracefulDegradation,
  CircuitBreaker,
  MemoryCacheProvider,
  MemoryQueueProvider,
  retryWithBackoff,
  createGracefulDegradation,
} from '../../src/error/graceful-degradation.js';

describe('REQ-ARC-004: MemoryCacheProvider', () => {
  it('should set and get values', async () => {
    const cache = new MemoryCacheProvider();
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', async () => {
    const cache = new MemoryCacheProvider();
    expect(await cache.get('missing')).toBeNull();
  });

  it('should expire entries by TTL', async () => {
    const cache = new MemoryCacheProvider();
    await cache.set('key', 'val', 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(await cache.get('key')).toBeNull();
  });

  it('should delete entries', async () => {
    const cache = new MemoryCacheProvider();
    await cache.set('key', 'val');
    await cache.delete('key');
    expect(await cache.get('key')).toBeNull();
  });

  it('should clear all entries', async () => {
    const cache = new MemoryCacheProvider();
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.clear();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });
});

describe('REQ-ARC-004: MemoryQueueProvider', () => {
  it('should enqueue and dequeue', async () => {
    const queue = new MemoryQueueProvider();
    const id = await queue.enqueue({ data: 'test' });
    expect(id).toMatch(/^q-/);
    const item = await queue.dequeue();
    expect(item).toEqual({ data: 'test' });
  });

  it('should return null when empty', async () => {
    const queue = new MemoryQueueProvider();
    expect(await queue.dequeue()).toBeNull();
  });

  it('should track size', async () => {
    const queue = new MemoryQueueProvider();
    expect(await queue.size()).toBe(0);
    await queue.enqueue('a');
    await queue.enqueue('b');
    expect(await queue.size()).toBe(2);
  });

  it('should clear all items', async () => {
    const queue = new MemoryQueueProvider();
    await queue.enqueue('a');
    await queue.clear();
    expect(await queue.size()).toBe(0);
  });
});

describe('REQ-ARC-004: CircuitBreaker', () => {
  it('should pass through when closed', async () => {
    const breaker = new CircuitBreaker(3, 100);
    const result = await breaker.execute(async () => 42);
    expect(result).toBe(42);
    expect(breaker.getState()).toBe('closed');
  });

  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker(3, 100);
    const failOp = async (): Promise<never> => {
      throw new Error('fail');
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failOp)).rejects.toThrow('fail');
    }
    expect(breaker.getState()).toBe('open');
  });

  it('should reject when open', async () => {
    const breaker = new CircuitBreaker(1, 100000);
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('open');
    await expect(breaker.execute(async () => 1)).rejects.toThrow('Circuit breaker is open');
  });

  it('should transition to half-open after reset timeout', async () => {
    const breaker = new CircuitBreaker(1, 10); // 10ms reset
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('open');

    await new Promise((r) => setTimeout(r, 20));
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('closed');
  });

  it('should reset manually', () => {
    const breaker = new CircuitBreaker(1, 100000);
    breaker.reset();
    expect(breaker.getState()).toBe('closed');
  });
});

describe('REQ-ARC-004: retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const result = await retryWithBackoff(async () => 'ok', {
      maxAttempts: 3,
      initialDelay: 1,
    });
    expect(result).toBe('ok');
  });

  it('should retry and succeed', async () => {
    let attempt = 0;
    const result = await retryWithBackoff(
      async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('not yet');
        }
        return 'done';
      },
      { maxAttempts: 3, initialDelay: 1 },
    );
    expect(result).toBe('done');
    expect(attempt).toBe(3);
  });

  it('should throw after all attempts fail', async () => {
    await expect(
      retryWithBackoff(
        async () => {
          throw new Error('always fails');
        },
        { maxAttempts: 2, initialDelay: 1 },
      ),
    ).rejects.toThrow('always fails');
  });
});

describe('REQ-ARC-004: GracefulDegradation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create with factory function', () => {
    const gd = createGracefulDegradation();
    expect(gd.getLevel()).toBe('full');
  });

  it('should execute operation successfully', async () => {
    const gd = new GracefulDegradation();
    const result = await gd.execute('test-service', async () => 42);
    expect(result.value).toBe(42);
    expect(result.degraded).toBe(false);
  });

  it('should fallback to default value on failure', async () => {
    const gd = new GracefulDegradation({
      services: [
        {
          name: 'failing',
          healthCheck: async () => false,
          fallbackStrategies: ['default'],
          priority: 1,
          required: false,
        },
      ],
    });

    // Mark service as unavailable
    await gd.runHealthChecks();

    const result = await gd.execute(
      'failing',
      async () => {
        throw new Error('down');
      },
      { defaultValue: 'fallback' },
    );
    expect(result.value).toBe('fallback');
    expect(result.degraded).toBe(true);
    expect(result.strategy).toBe('default');
  });

  it('should fallback to cache on failure', async () => {
    const gd = new GracefulDegradation({
      services: [
        {
          name: 'cached-svc',
          healthCheck: async () => true,
          fallbackStrategies: ['cache', 'default'],
          priority: 1,
          required: false,
        },
      ],
    });

    // First call succeeds and caches
    await gd.execute('cached-svc', async () => 'original', { cacheKey: 'k1' });

    // Simulate failure with cache fallback
    const result = await gd.execute(
      'cached-svc',
      async () => {
        throw new Error('fail');
      },
      { cacheKey: 'k1' },
    );
    expect(result.value).toBe('original');
    expect(result.degraded).toBe(true);
    expect(result.strategy).toBe('cache');
  });

  it('should run health checks and update levels', async () => {
    const gd = new GracefulDegradation({
      services: [
        {
          name: 'healthy-svc',
          healthCheck: async () => true,
          fallbackStrategies: ['default'],
          priority: 1,
          required: false,
        },
        {
          name: 'degraded-svc',
          healthCheck: async () => false,
          fallbackStrategies: ['default'],
          priority: 1,
          required: false,
        },
      ],
    });

    const results = await gd.runHealthChecks();
    expect(results.get('healthy-svc')?.status).toBe('healthy');
    expect(results.get('degraded-svc')?.status).toBe('degraded');
    expect(gd.getLevel()).toBe('reduced');
  });

  it('should set emergency level when required service is unavailable', async () => {
    const gd = new GracefulDegradation({
      services: [
        {
          name: 'critical',
          healthCheck: async () => { throw new Error('down'); },
          fallbackStrategies: ['default'],
          priority: 10,
          required: true,
        },
      ],
    });

    await gd.runHealthChecks();
    expect(gd.getLevel()).toBe('emergency');
  });

  it('should check feature availability', () => {
    const gd = new GracefulDegradation();
    expect(gd.isFeatureAvailable('full')).toBe(true);
    expect(gd.isFeatureAvailable('emergency')).toBe(true);
  });

  it('should start and stop health monitoring', () => {
    const gd = new GracefulDegradation({ healthCheckInterval: 60000 });
    gd.start();
    gd.stop();
    // No assertion needed — just verify no throw
  });
});
