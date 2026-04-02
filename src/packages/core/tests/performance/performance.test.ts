import { describe, it, expect } from 'vitest';
import {
  LazyLoader,
  MemoryMonitor,
  createLazyLoader,
  createMemoryMonitor,
} from '../../src/performance/index.js';

describe('DES-PER-001: LazyLoader', () => {
  it('should register and load a module on first access', async () => {
    const loader = createLazyLoader();
    loader.register('greet', async () => 'hello');

    expect(loader.isLoaded('greet')).toBe(false);
    const value = await loader.get<string>('greet');
    expect(value).toBe('hello');
    expect(loader.isLoaded('greet')).toBe(true);
  });

  it('should cache the loaded value on subsequent access', async () => {
    let callCount = 0;
    const loader = createLazyLoader();
    loader.register('counter', async () => {
      callCount++;
      return callCount;
    });

    const first = await loader.get<number>('counter');
    const second = await loader.get<number>('counter');
    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(callCount).toBe(1);
  });

  it('should throw for unregistered module', async () => {
    const loader = createLazyLoader();
    await expect(loader.get('unknown')).rejects.toThrow('Module "unknown" is not registered');
  });

  it('should preload multiple modules', async () => {
    const loader = createLazyLoader();
    loader.register('a', async () => 1);
    loader.register('b', async () => 2);
    loader.register('c', async () => 3);

    await loader.preload(['a', 'b']);

    expect(loader.isLoaded('a')).toBe(true);
    expect(loader.isLoaded('b')).toBe(true);
    expect(loader.isLoaded('c')).toBe(false);
  });

  it('should unload a module', async () => {
    const loader = createLazyLoader();
    loader.register('temp', async () => 'data');
    await loader.get('temp');
    expect(loader.isLoaded('temp')).toBe(true);

    loader.unload('temp');
    expect(loader.isLoaded('temp')).toBe(false);
  });

  it('should return correct stats', async () => {
    const loader = createLazyLoader();
    loader.register('x', async () => 1);
    loader.register('y', async () => 2);
    await loader.get('x');

    const stats = loader.getStats();
    expect(stats.registered).toBe(2);
    expect(stats.loaded).toBe(1);
    expect(stats.keys).toContain('x');
    expect(stats.keys).toContain('y');
  });

  it('factory createLazyLoader returns a LazyLoader instance', () => {
    const loader = createLazyLoader();
    expect(loader).toBeInstanceOf(LazyLoader);
  });
});

describe('DES-PER-001: MemoryMonitor', () => {
  it('should return memory usage with all fields', () => {
    const monitor = createMemoryMonitor();
    const usage = monitor.getUsage();

    expect(usage.heapUsed).toBeGreaterThan(0);
    expect(usage.heapTotal).toBeGreaterThan(0);
    expect(typeof usage.external).toBe('number');
    expect(usage.rss).toBeGreaterThan(0);
  });

  it('should check threshold correctly', () => {
    const monitor = createMemoryMonitor();

    const high = monitor.checkThreshold(10000);
    expect(high.ok).toBe(true);
    expect(high.maxMB).toBe(10000);

    const low = monitor.checkThreshold(0.001);
    expect(low.ok).toBe(false);
    expect(low.usedMB).toBeGreaterThan(0);
  });

  it('should format usage as human-readable string', () => {
    const monitor = createMemoryMonitor();
    const usage = monitor.getUsage();
    const formatted = monitor.formatUsage(usage);

    expect(formatted).toContain('Heap Used:');
    expect(formatted).toContain('MB');
    expect(formatted).toContain('RSS:');
  });

  it('factory createMemoryMonitor returns a MemoryMonitor instance', () => {
    const monitor = createMemoryMonitor();
    expect(monitor).toBeInstanceOf(MemoryMonitor);
  });
});
