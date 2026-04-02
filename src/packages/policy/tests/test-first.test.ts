import { describe, it, expect, beforeEach } from 'vitest';
import {
  TestFirstTracker,
  CoverageGate,
  createTestFirstTracker,
  createCoverageGate,
  DEFAULT_TEST_FIRST_CONFIG,
  type TestFirstConfig,
  type CoverageGateConfig,
} from '../src/test-first.js';

describe('DES-GOV-002: TestFirstTracker', () => {
  let tracker: TestFirstTracker;

  beforeEach(() => {
    tracker = createTestFirstTracker();
  });

  it('should start in red phase', () => {
    expect(tracker.getCurrentPhase()).toBe('red');
  });

  it('should transition red → green', () => {
    const result = tracker.transitionTo('green');
    expect(result.success).toBe(true);
    expect(tracker.getCurrentPhase()).toBe('green');
  });

  it('should transition green → refactor', () => {
    tracker.transitionTo('green');
    const result = tracker.transitionTo('refactor');
    expect(result.success).toBe(true);
    expect(tracker.getCurrentPhase()).toBe('refactor');
  });

  it('should reject red → refactor (skip green)', () => {
    const result = tracker.transitionTo('refactor');
    expect(result.success).toBe(false);
    expect(result.error).toContain('expected');
  });

  it('should reject green → red (backwards)', () => {
    tracker.transitionTo('green');
    const result = tracker.transitionTo('red');
    expect(result.success).toBe(false);
    expect(result.error).toContain('expected');
  });

  it('should reject transition after cycle complete', () => {
    tracker.transitionTo('green');
    tracker.transitionTo('refactor');
    const result = tracker.transitionTo('red');
    expect(result.success).toBe(false);
    expect(result.error).toContain('reset()');
  });

  it('should report isComplete after refactor', () => {
    expect(tracker.isComplete()).toBe(false);
    tracker.transitionTo('green');
    expect(tracker.isComplete()).toBe(false);
    tracker.transitionTo('refactor');
    expect(tracker.isComplete()).toBe(true);
  });

  it('should reset to red phase', () => {
    tracker.transitionTo('green');
    tracker.transitionTo('refactor');
    tracker.reset();
    expect(tracker.getCurrentPhase()).toBe('red');
    expect(tracker.isComplete()).toBe(false);
  });
});

describe('DES-GOV-002: CoverageGate', () => {
  let gate: CoverageGate;

  beforeEach(() => {
    gate = createCoverageGate();
  });

  it('should pass when all thresholds met', () => {
    const config: CoverageGateConfig = {
      minLineCoverage: 80,
      minBranchCoverage: 70,
      minFunctionCoverage: 90,
    };
    const result = gate.check({ line: 85, branch: 75, function: 95 }, config);
    expect(result.passed).toBe(true);
    expect(result.details).toContain('All coverage thresholds met');
  });

  it('should fail when line coverage below threshold', () => {
    const config: CoverageGateConfig = {
      minLineCoverage: 80,
      minBranchCoverage: 70,
      minFunctionCoverage: 90,
    };
    const result = gate.check({ line: 60, branch: 75, function: 95 }, config);
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.includes('Line coverage'))).toBe(true);
  });

  it('should fail when branch coverage below threshold', () => {
    const config: CoverageGateConfig = {
      minLineCoverage: 80,
      minBranchCoverage: 70,
      minFunctionCoverage: 90,
    };
    const result = gate.check({ line: 85, branch: 50, function: 95 }, config);
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.includes('Branch coverage'))).toBe(true);
  });

  it('should report multiple failures', () => {
    const config: CoverageGateConfig = {
      minLineCoverage: 80,
      minBranchCoverage: 70,
      minFunctionCoverage: 90,
    };
    const result = gate.check({ line: 50, branch: 50, function: 50 }, config);
    expect(result.passed).toBe(false);
    expect(result.details.length).toBe(3);
  });
});

describe('DES-GOV-002: DEFAULT_TEST_FIRST_CONFIG', () => {
  it('should have correct defaults', () => {
    expect(DEFAULT_TEST_FIRST_CONFIG.requireRedPhase).toBe(true);
    expect(DEFAULT_TEST_FIRST_CONFIG.coverageThreshold).toBe(80);
    expect(DEFAULT_TEST_FIRST_CONFIG.requireGreenBeforeRefactor).toBe(true);
  });
});
