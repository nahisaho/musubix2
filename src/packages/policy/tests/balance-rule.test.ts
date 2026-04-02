import { describe, it, expect } from 'vitest';
import { BalanceRuleEngine, DEFAULT_BALANCE_CONFIG } from '../src/balance-rule.js';

describe('REQ-GOV-001: BalanceRuleEngine', () => {
  const engine = new BalanceRuleEngine();

  it('should have default 90/10 config', () => {
    expect(DEFAULT_BALANCE_CONFIG.automatedThreshold).toBe(0.90);
    expect(DEFAULT_BALANCE_CONFIG.warningThreshold).toBe(0.85);
  });

  it('should evaluate compliant ratio', () => {
    const metrics = engine.evaluate(90, 10);
    expect(metrics.ratio).toBe(0.90);
    expect(metrics.compliant).toBe(true);
  });

  it('should evaluate non-compliant ratio', () => {
    const metrics = engine.evaluate(80, 20);
    expect(metrics.ratio).toBe(0.80);
    expect(metrics.compliant).toBe(false);
  });

  it('should handle zero items', () => {
    const metrics = engine.evaluate(0, 0);
    expect(metrics.compliant).toBe(true);
    expect(metrics.ratio).toBe(1.0);
  });

  it('should detect warning level', () => {
    const metrics = engine.evaluate(87, 13);
    expect(engine.isWarning(metrics)).toBe(true);
    expect(engine.isCritical(metrics)).toBe(false);
  });

  it('should detect critical level', () => {
    const metrics = engine.evaluate(70, 30);
    expect(engine.isCritical(metrics)).toBe(true);
  });

  it('should return null suggestion when compliant', () => {
    const metrics = engine.evaluate(95, 5);
    expect(engine.getSuggestion(metrics)).toBeNull();
  });

  it('should return suggestion when non-compliant', () => {
    const metrics = engine.evaluate(80, 20);
    const suggestion = engine.getSuggestion(metrics);
    expect(suggestion).toContain('automated items');
    expect(suggestion).toContain('90%');
  });

  it('should accept custom config', () => {
    const custom = new BalanceRuleEngine({ automatedThreshold: 0.80 });
    const metrics = custom.evaluate(80, 20);
    expect(metrics.compliant).toBe(true);
  });
});
