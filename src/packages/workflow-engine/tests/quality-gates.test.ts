import { describe, it, expect } from 'vitest';
import {
  ExtendedQualityGateRunner,
  createExtendedQualityGateRunner,
  DEFAULT_EXTENDED_GATE_CONFIG,
  GATE_CONSTITUTION_MAP,
  type GateCheckContext,
} from '../src/index.js';

function makeContext(overrides: Partial<GateCheckContext> = {}): GateCheckContext {
  return {
    phase: 'implementation',
    coveragePercent: 90,
    lintErrors: 0,
    testsPassed: 50,
    testsTotal: 50,
    documentedExports: 8,
    totalExports: 10,
    ...overrides,
  };
}

describe('DES-SDD-003: ExtendedQualityGateRunner', () => {
  it('checkCoverage passes when above threshold', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkCoverage(makeContext({ coveragePercent: 85 }));
    expect(result.passed).toBe(true);
    expect(result.gateName).toBe('coverage');
  });

  it('checkCoverage fails when below threshold', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkCoverage(makeContext({ coveragePercent: 50 }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('below');
  });

  it('checkLint passes with 0 errors', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkLint(makeContext({ lintErrors: 0 }));
    expect(result.passed).toBe(true);
    expect(result.gateName).toBe('lint');
  });

  it('checkLint fails with errors', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkLint(makeContext({ lintErrors: 3 }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('exceed');
  });

  it('checkTests passes at 100% rate', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkTests(makeContext({ testsPassed: 20, testsTotal: 20 }));
    expect(result.passed).toBe(true);
    expect(result.gateName).toBe('tests');
  });

  it('checkTests fails below required rate', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkTests(makeContext({ testsPassed: 18, testsTotal: 20 }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('below');
  });

  it('checkDocumentation passes when above threshold', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkDocumentation(makeContext({ documentedExports: 7, totalExports: 10 }));
    expect(result.passed).toBe(true);
    expect(result.gateName).toBe('documentation');
  });

  it('checkDocumentation fails when below threshold', () => {
    const runner = new ExtendedQualityGateRunner();
    const result = runner.checkDocumentation(makeContext({ documentedExports: 2, totalExports: 10 }));
    expect(result.passed).toBe(false);
  });

  it('runAll returns allPassed true when all checks pass', () => {
    const runner = new ExtendedQualityGateRunner();
    const { results, allPassed } = runner.runAll(makeContext());
    expect(allPassed).toBe(true);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('runAll returns allPassed false when any check fails', () => {
    const runner = new ExtendedQualityGateRunner();
    const { allPassed } = runner.runAll(makeContext({ coveragePercent: 10 }));
    expect(allPassed).toBe(false);
  });

  it('custom config overrides defaults', () => {
    const runner = new ExtendedQualityGateRunner({ coverageThreshold: 50, lintErrorsAllowed: 5 });
    const coverageResult = runner.checkCoverage(makeContext({ coveragePercent: 55 }));
    expect(coverageResult.passed).toBe(true);
    const lintResult = runner.checkLint(makeContext({ lintErrors: 3 }));
    expect(lintResult.passed).toBe(true);
  });

  it('factory creates a runner with defaults', () => {
    const runner = createExtendedQualityGateRunner();
    expect(runner).toBeInstanceOf(ExtendedQualityGateRunner);
    const result = runner.checkCoverage(makeContext({ coveragePercent: 85 }));
    expect(result.passed).toBe(true);
  });

  it('DEFAULT_EXTENDED_GATE_CONFIG has expected values', () => {
    expect(DEFAULT_EXTENDED_GATE_CONFIG.coverageThreshold).toBe(80);
    expect(DEFAULT_EXTENDED_GATE_CONFIG.lintErrorsAllowed).toBe(0);
    expect(DEFAULT_EXTENDED_GATE_CONFIG.testPassRate).toBe(100);
    expect(DEFAULT_EXTENDED_GATE_CONFIG.docCoverageThreshold).toBe(60);
  });
});

describe('DES-SDD-003: Constitution Mapping', () => {
  it('should map gates to constitution articles', () => {
    const runner = new ExtendedQualityGateRunner();
    const map = runner.getConstitutionMap();
    expect(map.length).toBeGreaterThan(0);
    const coverageMapping = map.find((m) => m.gateName === 'coverage');
    expect(coverageMapping).toBeDefined();
    expect(coverageMapping!.articles).toContain('CONST-003');
  });

  it('should return articles for a specific gate', () => {
    const runner = new ExtendedQualityGateRunner();
    const articles = runner.getArticlesForGate('tests');
    expect(articles).toContain('CONST-003');
    expect(articles).toContain('CONST-009');
  });

  it('GATE_CONSTITUTION_MAP covers all 4 gates', () => {
    const gateNames = GATE_CONSTITUTION_MAP.map((m) => m.gateName);
    expect(gateNames).toContain('coverage');
    expect(gateNames).toContain('lint');
    expect(gateNames).toContain('tests');
    expect(gateNames).toContain('documentation');
  });
});

describe('DES-SDD-003: Violation Report', () => {
  it('should generate clean report when all pass', () => {
    const runner = new ExtendedQualityGateRunner();
    runner.runAll(makeContext());
    const report = runner.generateViolationReport();
    expect(report).toContain('All gates passed');
  });

  it('should generate detailed markdown report with violations', () => {
    const runner = new ExtendedQualityGateRunner();
    runner.runAll(makeContext({ coveragePercent: 10, lintErrors: 5 }));
    const report = runner.generateViolationReport();
    expect(report).toContain('# Quality Gate Violation Report');
    expect(report).toContain('❌ Gate: coverage');
    expect(report).toContain('❌ Gate: lint');
    expect(report).toContain('CONST-003');
    expect(report).toContain('CONST-001');
    expect(report).toContain('blocks phase progression');
  });

  it('gate failure blocks progression', () => {
    const runner = new ExtendedQualityGateRunner();
    const { allPassed } = runner.runAll(makeContext({ coveragePercent: 10 }));
    expect(allPassed).toBe(false);
    expect(runner.getViolations().length).toBeGreaterThan(0);
  });
});
