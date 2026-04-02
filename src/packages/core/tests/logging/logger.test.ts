import { describe, it, expect } from 'vitest';
import { Logger, MemoryTransport, AuditLogger } from '../../src/logging/index.js';

describe('REQ-ARC-004: Logger', () => {
  it('should log at appropriate levels', () => {
    const transport = new MemoryTransport();
    const logger = new Logger({ transports: [transport], level: 'debug' });

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(transport.entries).toHaveLength(4);
    expect(transport.entries[0].level).toBe('debug');
    expect(transport.entries[3].level).toBe('error');
  });

  it('should filter below minimum level', () => {
    const transport = new MemoryTransport();
    const logger = new Logger({ transports: [transport], level: 'warn' });

    logger.debug('skip');
    logger.info('skip');
    logger.warn('keep');
    logger.error('keep');

    expect(transport.entries).toHaveLength(2);
  });

  it('should include context', () => {
    const transport = new MemoryTransport();
    const logger = new Logger({ transports: [transport], level: 'info' });

    logger.info('msg', { key: 'value' });
    expect(transport.entries[0].context).toEqual({ key: 'value' });
  });

  it('should create child logger with source', () => {
    const transport = new MemoryTransport();
    const logger = new Logger({ transports: [transport], level: 'info', source: 'parent' });
    const child = logger.child('child');

    child.info('from child');
    expect(transport.entries[0].source).toBe('parent:child');
  });
});

describe('REQ-ARC-004: AuditLogger', () => {
  it('should record audit events', () => {
    const transport = new MemoryTransport();
    const logger = new Logger({ transports: [transport], level: 'info' });
    const audit = new AuditLogger(logger);

    audit.record({
      action: 'phase-transition',
      actor: 'user',
      target: 'design',
      result: 'success',
    });

    const events = audit.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe('phase-transition');
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  it('should filter events', () => {
    const audit = new AuditLogger();
    audit.record({ action: 'create', actor: 'alice', target: 'req', result: 'success' });
    audit.record({ action: 'approve', actor: 'bob', target: 'des', result: 'success' });
    audit.record({ action: 'create', actor: 'bob', target: 'adr', result: 'failure' });

    expect(audit.getEvents({ action: 'create' })).toHaveLength(2);
    expect(audit.getEvents({ actor: 'bob' })).toHaveLength(2);
    expect(audit.getEvents({ action: 'create', actor: 'bob' })).toHaveLength(1);
  });

  it('should clear events', () => {
    const audit = new AuditLogger();
    audit.record({ action: 'x', actor: 'a', target: 't', result: 'success' });
    audit.clear();
    expect(audit.getEvents()).toHaveLength(0);
  });
});
