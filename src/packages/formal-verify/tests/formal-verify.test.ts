import { describe, it, expect } from 'vitest';
import {
  EarsToSmtConverter,
  Z3Adapter,
  PreconditionVerifier,
  createEarsToSmtConverter,
  createZ3Adapter,
  createPreconditionVerifier,
} from '../src/index.js';
import type { ParsedRequirement } from '../src/index.js';

// ── Test data ───────────────────────────────────────────────────

const ubiquitousReq: ParsedRequirement = {
  id: 'REQ-001',
  title: 'System availability',
  text: 'The system shall log all errors',
  pattern: 'ubiquitous',
  action: 'log errors',
};

const eventDrivenReq: ParsedRequirement = {
  id: 'REQ-002',
  title: 'User login',
  text: 'When the user submits credentials the system shall authenticate',
  pattern: 'event-driven',
  trigger: 'user submits credentials',
  action: 'authenticate',
};

const stateDrivenReq: ParsedRequirement = {
  id: 'REQ-003',
  title: 'Battery warning',
  text: 'While battery is low the system shall display warning',
  pattern: 'state-driven',
  condition: 'battery is low',
  action: 'display warning',
};

const unwantedReq: ParsedRequirement = {
  id: 'REQ-004',
  title: 'No data loss',
  text: 'The system shall not lose data',
  pattern: 'unwanted',
  action: 'lose data',
};

const complexReq: ParsedRequirement = {
  id: 'REQ-005',
  title: 'Complex requirement',
  text: 'While connected when message arrives the system shall process message',
  pattern: 'complex',
  condition: 'connected',
  trigger: 'message arrives',
  action: 'process message',
};

const optionalReq: ParsedRequirement = {
  id: 'REQ-006',
  title: 'Optional dark mode',
  text: 'If dark mode is enabled the system shall apply dark theme',
  pattern: 'optional',
  trigger: 'dark mode enabled',
  action: 'apply dark theme',
};

// ── EarsToSmtConverter ──────────────────────────────────────────

describe('DES-FV-001: EarsToSmtConverter', () => {
  const converter = new EarsToSmtConverter();

  it('should convert ubiquitous requirement to valid SMT formula', () => {
    const result = converter.convert(ubiquitousReq);
    expect(result.success).toBe(true);
    expect(result.formula).toBeDefined();
    expect(result.formula!.assertions[0]).toContain('(assert (=> true');
    expect(result.formula!.requirementId).toBe('REQ-001');
  });

  it('should convert event-driven requirement with trigger implies action', () => {
    const result = converter.convert(eventDrivenReq);
    expect(result.success).toBe(true);
    expect(result.formula!.assertions[0]).toContain('(assert (=>');
    expect(result.formula!.assertions[0]).toContain('user_submits_credentials');
    expect(result.formula!.assertions[0]).toContain('authenticate');
  });

  it('should convert state-driven requirement with condition implies action', () => {
    const result = converter.convert(stateDrivenReq);
    expect(result.success).toBe(true);
    expect(result.formula!.assertions[0]).toContain('(assert (=>');
    expect(result.formula!.assertions[0]).toContain('battery_is_low');
    expect(result.formula!.assertions[0]).toContain('display_warning');
  });

  it('should convert unwanted requirement to negation assertion', () => {
    const result = converter.convert(unwantedReq);
    expect(result.success).toBe(true);
    expect(result.formula!.assertions[0]).toContain('(assert (not');
    expect(result.formula!.assertions[0]).toContain('lose_data');
  });

  it('should convert complex requirement with combined condition and trigger', () => {
    const result = converter.convert(complexReq);
    expect(result.success).toBe(true);
    expect(result.formula!.assertions[0]).toContain('(assert (=> (and');
    expect(result.formula!.assertions[0]).toContain('connected');
    expect(result.formula!.assertions[0]).toContain('message_arrives');
    expect(result.formula!.assertions[0]).toContain('process_message');
  });

  it('should convert optional requirement with feature trigger', () => {
    const result = converter.convert(optionalReq);
    expect(result.success).toBe(true);
    expect(result.formula!.assertions[0]).toContain('(assert (=>');
    expect(result.formula!.assertions[0]).toContain('dark_mode_enabled');
    expect(result.formula!.assertions[0]).toContain('apply_dark_theme');
  });

  it('should process multiple requirements with convertBatch', () => {
    const results = converter.convertBatch([
      ubiquitousReq,
      eventDrivenReq,
      stateDrivenReq,
    ]);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should generate valid SMT-LIB2 script with declarations', () => {
    const results = converter.convertBatch([ubiquitousReq, eventDrivenReq]);
    const formulas = results
      .filter((r) => r.formula)
      .map((r) => r.formula!);
    const script = converter.generateSmtLib2Script(formulas);

    expect(script).toContain('(set-logic QF_LIA)');
    expect(script).toContain('(declare-const');
    expect(script).toContain('(assert');
    expect(script).toContain('(check-sat)');
    expect(script).toContain('(get-model)');
  });
});

// ── Z3Adapter ───────────────────────────────────────────────────

describe('DES-FV-001: Z3Adapter', () => {
  const adapter = new Z3Adapter();

  it('should report isAvailable as false in mock mode', async () => {
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('should return mock version string', () => {
    expect(adapter.getVersion()).toBe('mock-4.12.0');
  });

  it('should return sat for a simple satisfiable script', async () => {
    const script =
      '(declare-const x Bool)\n(assert (=> true x))\n(check-sat)';
    const result = await adapter.solve(script);
    expect(result.status).toBe('sat');
    expect(result.time).toBeGreaterThanOrEqual(0);
  });

  it('should return unsat for a contradictory script', async () => {
    const script = '(assert false)\n(check-sat)';
    const result = await adapter.solve(script);
    expect(result.status).toBe('unsat');
  });
});

// ── PreconditionVerifier ────────────────────────────────────────

describe('DES-FV-001: PreconditionVerifier', () => {
  const converter = createEarsToSmtConverter();
  const solver = createZ3Adapter();
  const verifier = createPreconditionVerifier();

  it('should return verified for a satisfiable requirement', async () => {
    const result = await verifier.verify(ubiquitousReq, converter, solver);
    expect(result.requirementId).toBe('REQ-001');
    expect(result.status).toBe('verified');
    expect(result.explanation).toContain('satisfiable');
  });

  it('should detect no conflicts when formulas are consistent', async () => {
    const r1 = converter.convert(ubiquitousReq);
    const r2 = converter.convert(eventDrivenReq);
    const formulas = [r1.formula!, r2.formula!];

    const result = await verifier.checkConsistency(formulas, solver);
    expect(result.consistent).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });
});
