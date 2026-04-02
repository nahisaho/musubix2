/**
 * Graceful Degradation
 *
 * Handles errors gracefully with fallback strategies,
 * circuit breaker pattern, and retry with backoff.
 *
 * @module error/graceful-degradation
 * @see REQ-ARC-004 — Graceful degradation strategies
 */

// --- Types ---

export type DegradationLevel = 'full' | 'reduced' | 'minimal' | 'offline' | 'emergency';

export type ServiceStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export type FallbackStrategy =
  | 'cache'
  | 'default'
  | 'retry'
  | 'alternative'
  | 'skip'
  | 'queue'
  | 'manual';

// --- Interfaces ---

export interface HealthCheckResult {
  service: string;
  status: ServiceStatus;
  responseTime?: number;
  lastSuccess?: Date;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ServiceConfig {
  name: string;
  healthCheck: () => Promise<boolean>;
  fallbackStrategies: FallbackStrategy[];
  cacheTtl?: number;
  retryAttempts?: number;
  retryDelay?: number;
  alternative?: string;
  priority: number;
  required: boolean;
}

export interface FallbackAction<T = unknown> {
  strategy: FallbackStrategy;
  execute: () => Promise<T>;
  description: string;
}

export interface DegradationEvent {
  id: string;
  timestamp: Date;
  service: string;
  previousLevel: DegradationLevel;
  newLevel: DegradationLevel;
  reason: string;
  fallbackUsed?: FallbackStrategy;
  estimatedRecovery?: Date;
}

export interface DegradedResult<T> {
  value: T;
  degraded: boolean;
  level: DegradationLevel;
  strategy?: FallbackStrategy;
  originalError?: Error;
  warnings: string[];
}

export interface GracefulDegradationConfig {
  services: ServiceConfig[];
  healthCheckInterval: number;
  cacheProvider?: CacheProvider;
  queueProvider?: QueueProvider;
  onDegradation?: (event: DegradationEvent) => void;
  onRecovery?: (service: string, level: DegradationLevel) => void;
  autoRecovery: boolean;
  maxQueueSize: number;
}

// --- Provider interfaces ---

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface QueueProvider {
  enqueue<T>(item: T): Promise<string>;
  dequeue<T>(): Promise<T | null>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

// --- In-memory implementations ---

export class MemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, {
      value,
      expires: ttl ? Date.now() + ttl : 0,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class MemoryQueueProvider implements QueueProvider {
  private queue: Array<{ id: string; item: unknown }> = [];
  private counter = 0;

  async enqueue<T>(item: T): Promise<string> {
    const id = `q-${Date.now()}-${++this.counter}`;
    this.queue.push({ id, item });
    return id;
  }

  async dequeue<T>(): Promise<T | null> {
    const entry = this.queue.shift();
    return entry ? (entry.item as T) : null;
  }

  async size(): Promise<number> {
    return this.queue.length;
  }

  async clear(): Promise<void> {
    this.queue = [];
  }
}

// --- Default config ---

export const DEFAULT_DEGRADATION_CONFIG: GracefulDegradationConfig = {
  services: [],
  healthCheckInterval: 30000,
  autoRecovery: true,
  maxQueueSize: 1000,
};

// --- GracefulDegradation manager ---

export class GracefulDegradation {
  private config: GracefulDegradationConfig;
  private serviceStatus: Map<string, HealthCheckResult>;
  private currentLevel: DegradationLevel = 'full';
  private events: DegradationEvent[] = [];
  private eventCounter = 0;
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private cache: CacheProvider;
  private queue: QueueProvider;

  constructor(config?: Partial<GracefulDegradationConfig>) {
    this.config = { ...DEFAULT_DEGRADATION_CONFIG, ...config };
    this.serviceStatus = new Map();
    this.cache = config?.cacheProvider ?? new MemoryCacheProvider();
    this.queue = config?.queueProvider ?? new MemoryQueueProvider();

    for (const service of this.config.services) {
      this.serviceStatus.set(service.name, {
        service: service.name,
        status: 'unknown',
      });
    }
  }

  start(): void {
    this.runHealthChecks();
    this.healthCheckTimer = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckInterval,
    );
  }

  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  registerService(service: ServiceConfig): void {
    this.config.services.push(service);
    this.serviceStatus.set(service.name, {
      service: service.name,
      status: 'unknown',
    });
  }

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    options?: {
      cacheKey?: string;
      defaultValue?: T;
      timeout?: number;
    },
  ): Promise<DegradedResult<T>> {
    const service = this.config.services.find((s) => s.name === serviceName);
    const status = this.serviceStatus.get(serviceName);

    if (!status || status.status === 'healthy' || status.status === 'unknown') {
      try {
        const value = await this.withTimeout(operation, options?.timeout ?? 30000);

        if (options?.cacheKey) {
          await this.cache.set(options.cacheKey, value, service?.cacheTtl);
        }

        return {
          value,
          degraded: false,
          level: this.currentLevel,
          warnings: [],
        };
      } catch (error) {
        return this.executeFallback(serviceName, error as Error, options);
      }
    }

    return this.executeFallback(
      serviceName,
      new Error(`Service ${serviceName} is ${status.status}`),
      options,
    );
  }

  private async executeFallback<T>(
    serviceName: string,
    error: Error,
    options?: {
      cacheKey?: string;
      defaultValue?: T;
      timeout?: number;
    },
  ): Promise<DegradedResult<T>> {
    const service = this.config.services.find((s) => s.name === serviceName);
    const strategies = service?.fallbackStrategies ?? ['default'];
    const warnings: string[] = [`Primary operation failed: ${error.message}`];

    for (const strategy of strategies) {
      try {
        const result = await this.executeStrategy<T>(serviceName, strategy, options);

        if (result !== null) {
          return {
            value: result,
            degraded: true,
            level: this.currentLevel,
            strategy,
            originalError: error,
            warnings,
          };
        }
      } catch (e) {
        warnings.push(`Fallback ${strategy} failed: ${(e as Error).message}`);
      }
    }

    throw new Error(
      `All fallback strategies failed for ${serviceName}. ` + `Warnings: ${warnings.join('; ')}`,
    );
  }

  private async executeStrategy<T>(
    _serviceName: string,
    strategy: FallbackStrategy,
    options?: {
      cacheKey?: string;
      defaultValue?: T;
    },
  ): Promise<T | null> {
    switch (strategy) {
      case 'cache':
        if (options?.cacheKey) {
          const cached = await this.cache.get<T>(options.cacheKey);
          if (cached !== null) {
            return cached;
          }
        }
        return null;

      case 'default':
        if (options?.defaultValue !== undefined) {
          return options.defaultValue;
        }
        return null;

      case 'retry':
        return null;

      case 'alternative':
        return null;

      case 'skip':
        return null;

      case 'queue':
        if ((await this.queue.size()) < this.config.maxQueueSize) {
          await this.queue.enqueue({
            service: _serviceName,
            timestamp: new Date(),
            options,
          });
        }
        return null;

      case 'manual':
        return null;

      default:
        return null;
    }
  }

  async runHealthChecks(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();

    for (const service of this.config.services) {
      const result = await this.checkServiceHealth(service);
      results.set(service.name, result);

      const previousStatus = this.serviceStatus.get(service.name);
      this.serviceStatus.set(service.name, result);

      if (previousStatus?.status !== result.status) {
        if (result.status === 'unavailable' || result.status === 'degraded') {
          this.handleServiceDegradation(service, result);
        } else if (result.status === 'healthy' && previousStatus?.status !== 'healthy') {
          this.handleServiceRecovery(service);
        }
      }
    }

    this.recalculateLevel();
    return results;
  }

  private async checkServiceHealth(service: ServiceConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const healthy = await this.withTimeout(service.healthCheck, 5000);
      const responseTime = Date.now() - startTime;

      return {
        service: service.name,
        status: healthy ? 'healthy' : 'degraded',
        responseTime,
        lastSuccess: healthy ? new Date() : undefined,
      };
    } catch (error) {
      return {
        service: service.name,
        status: 'unavailable',
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  private handleServiceDegradation(service: ServiceConfig, result: HealthCheckResult): void {
    const previousLevel = this.currentLevel;

    const event: DegradationEvent = {
      id: `deg-${Date.now()}-${++this.eventCounter}`,
      timestamp: new Date(),
      service: service.name,
      previousLevel,
      newLevel: this.currentLevel,
      reason: result.error ?? `Service ${service.name} is ${result.status}`,
    };

    this.events.push(event);
    this.config.onDegradation?.(event);
  }

  private handleServiceRecovery(service: ServiceConfig): void {
    this.config.onRecovery?.(service.name, this.currentLevel);

    if (this.config.autoRecovery) {
      this.processQueue(service.name).catch(() => {});
    }
  }

  private async processQueue(serviceName: string): Promise<void> {
    let processed = 0;
    const maxProcess = 10;

    while (processed < maxProcess) {
      const item = await this.queue.dequeue<{ service: string }>();
      if (!item) {
        break;
      }
      if (item.service === serviceName) {
        processed++;
      } else {
        await this.queue.enqueue(item);
      }
    }
  }

  private recalculateLevel(): void {
    const statuses = [...this.serviceStatus.values()];

    const unavailableRequired = this.config.services.filter(
      (s) => s.required && this.serviceStatus.get(s.name)?.status === 'unavailable',
    );

    const totalUnavailable = statuses.filter((s) => s.status === 'unavailable').length;
    const totalDegraded = statuses.filter((s) => s.status === 'degraded').length;

    if (unavailableRequired.length > 0) {
      this.currentLevel = 'emergency';
    } else if (totalUnavailable > statuses.length / 2) {
      this.currentLevel = 'offline';
    } else if (totalUnavailable > 0) {
      this.currentLevel = 'minimal';
    } else if (totalDegraded > 0) {
      this.currentLevel = 'reduced';
    } else {
      this.currentLevel = 'full';
    }
  }

  getLevel(): DegradationLevel {
    return this.currentLevel;
  }

  getServiceStatus(serviceName: string): HealthCheckResult | undefined {
    return this.serviceStatus.get(serviceName);
  }

  getAllStatuses(): Map<string, HealthCheckResult> {
    return new Map(this.serviceStatus);
  }

  getEvents(limit?: number): DegradationEvent[] {
    const events = [...this.events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? events.slice(0, limit) : events;
  }

  isFeatureAvailable(requiredLevel: DegradationLevel): boolean {
    const levels: DegradationLevel[] = ['full', 'reduced', 'minimal', 'offline', 'emergency'];
    return levels.indexOf(this.currentLevel) <= levels.indexOf(requiredLevel);
  }

  async cacheValue<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }

  async getCachedValue<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  private async withTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

// --- Standalone utilities ---

export function createGracefulDegradation(
  config?: Partial<GracefulDegradationConfig>,
): GracefulDegradation {
  return new GracefulDegradation(config);
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;
  const backoffFactor = options?.backoffFactor ?? 2;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }
  }

  throw lastError ?? new Error('Operation failed after retries');
}

/**
 * Circuit breaker — prevents cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailure) {
      return true;
    }
    return Date.now() - this.lastFailure.getTime() > this.resetTimeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailure = undefined;
    this.state = 'closed';
  }
}
