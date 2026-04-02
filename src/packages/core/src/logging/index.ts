/**
 * Logger & Audit Logger
 *
 * Structured logging with severity levels and audit trail support.
 *
 * @module logging
 * @see REQ-ARC-004 — Logging and observability
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  source?: string;
}

export interface LogTransport {
  write(entry: LogEntry): void;
}

export class ConsoleTransport implements LogTransport {
  write(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}]`;
    const src = entry.source ? ` (${entry.source})` : '';
    const msg = `${prefix}${src} ${entry.message}`;

    switch (entry.level) {
      case 'error':
        console.error(msg);
        break;
      case 'warn':
        console.warn(msg);
        break;
      case 'debug':
        console.debug(msg);
        break;
      default:
        console.log(msg);
    }
  }
}

export class MemoryTransport implements LogTransport {
  readonly entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  clear(): void {
    this.entries.length = 0;
  }
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private transports: LogTransport[];
  private minLevel: LogLevel;
  private source?: string;

  constructor(options?: { transports?: LogTransport[]; level?: LogLevel; source?: string }) {
    this.transports = options?.transports ?? [new ConsoleTransport()];
    this.minLevel = options?.level ?? 'info';
    this.source = options?.source;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  child(source: string): Logger {
    return new Logger({
      transports: this.transports,
      level: this.minLevel,
      source: this.source ? `${this.source}:${source}` : source,
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      source: this.source,
    };

    for (const transport of this.transports) {
      transport.write(entry);
    }
  }
}

// --- Audit Logger ---

export interface AuditEvent {
  action: string;
  actor: string;
  target: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  result: 'success' | 'failure';
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger({ source: 'audit' });
  }

  record(event: Omit<AuditEvent, 'timestamp'>): void {
    const full: AuditEvent = { ...event, timestamp: new Date() };
    this.events.push(full);
    this.logger.info(
      `[AUDIT] ${event.action} on ${event.target} by ${event.actor}: ${event.result}`,
    );
  }

  getEvents(filter?: { action?: string; actor?: string }): AuditEvent[] {
    return this.events.filter((e) => {
      if (filter?.action && e.action !== filter.action) {
        return false;
      }
      if (filter?.actor && e.actor !== filter.actor) {
        return false;
      }
      return true;
    });
  }

  clear(): void {
    this.events.length = 0;
  }
}
