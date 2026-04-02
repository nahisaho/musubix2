/**
 * Performance Optimization
 *
 * Lazy loading, caching, and memory monitoring utilities.
 *
 * @module performance
 * @see DES-PER-001 — 処理性能
 */

export interface LazyModule<T> {
  loaded: boolean;
  load: () => Promise<T>;
  get: () => T | undefined;
}

export class LazyLoader {
  private modules = new Map<string, { loader: () => Promise<unknown>; value?: unknown; loaded: boolean }>();

  register<T>(key: string, loader: () => Promise<T>): void {
    this.modules.set(key, { loader, loaded: false });
  }

  async get<T>(key: string): Promise<T> {
    const entry = this.modules.get(key);
    if (!entry) {
      throw new Error(`Module "${key}" is not registered`);
    }

    if (!entry.loaded) {
      entry.value = await entry.loader();
      entry.loaded = true;
    }

    return entry.value as T;
  }

  isLoaded(key: string): boolean {
    const entry = this.modules.get(key);
    return entry?.loaded ?? false;
  }

  async preload(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.get(key)));
  }

  unload(key: string): void {
    const entry = this.modules.get(key);
    if (entry) {
      entry.value = undefined;
      entry.loaded = false;
    }
  }

  getStats(): { registered: number; loaded: number; keys: string[] } {
    const keys = [...this.modules.keys()];
    const loaded = keys.filter((k) => this.modules.get(k)!.loaded).length;
    return { registered: keys.length, loaded, keys };
  }
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export class MemoryMonitor {
  getUsage(): MemoryUsage {
    const mem = process.memoryUsage();
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
    };
  }

  checkThreshold(maxMB: number): { ok: boolean; usedMB: number; maxMB: number } {
    const usage = this.getUsage();
    const usedMB = Math.round((usage.heapUsed / (1024 * 1024)) * 100) / 100;
    return {
      ok: usedMB <= maxMB,
      usedMB,
      maxMB,
    };
  }

  formatUsage(usage: MemoryUsage): string {
    const fmt = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return [
      `Heap Used: ${fmt(usage.heapUsed)}`,
      `Heap Total: ${fmt(usage.heapTotal)}`,
      `External: ${fmt(usage.external)}`,
      `RSS: ${fmt(usage.rss)}`,
    ].join(' | ');
  }
}

export function createLazyLoader(): LazyLoader {
  return new LazyLoader();
}

export function createMemoryMonitor(): MemoryMonitor {
  return new MemoryMonitor();
}
