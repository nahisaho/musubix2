// DES-SDD-003: Extended Quality Gate Runner — phase-specific quality enforcement

import type { GateResult, WorkflowPhase } from './index.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExtendedGateConfig {
  coverageThreshold: number;
  lintErrorsAllowed: number;
  testPassRate: number;
  docCoverageThreshold: number;
}

export interface GateCheckContext {
  phase: WorkflowPhase;
  coveragePercent: number;
  lintErrors: number;
  testsPassed: number;
  testsTotal: number;
  documentedExports: number;
  totalExports: number;
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_EXTENDED_GATE_CONFIG: ExtendedGateConfig = {
  coverageThreshold: 80,
  lintErrorsAllowed: 0,
  testPassRate: 100,
  docCoverageThreshold: 60,
};

// ── ExtendedQualityGateRunner ──────────────────────────────────────────────

export class ExtendedQualityGateRunner {
  private config: ExtendedGateConfig;

  constructor(config?: Partial<ExtendedGateConfig>) {
    this.config = { ...DEFAULT_EXTENDED_GATE_CONFIG, ...config };
  }

  checkCoverage(context: GateCheckContext): GateResult {
    const passed = context.coveragePercent >= this.config.coverageThreshold;
    return {
      gateName: 'coverage',
      passed,
      message: passed
        ? `Coverage ${context.coveragePercent}% meets threshold ${this.config.coverageThreshold}%`
        : `Coverage ${context.coveragePercent}% is below threshold ${this.config.coverageThreshold}%`,
    };
  }

  checkLint(context: GateCheckContext): GateResult {
    const passed = context.lintErrors <= this.config.lintErrorsAllowed;
    return {
      gateName: 'lint',
      passed,
      message: passed
        ? `Lint errors (${context.lintErrors}) within allowed limit (${this.config.lintErrorsAllowed})`
        : `Lint errors (${context.lintErrors}) exceed allowed limit (${this.config.lintErrorsAllowed})`,
    };
  }

  checkTests(context: GateCheckContext): GateResult {
    const rate = context.testsTotal > 0
      ? (context.testsPassed / context.testsTotal) * 100
      : 0;
    const passed = rate >= this.config.testPassRate;
    return {
      gateName: 'tests',
      passed,
      message: passed
        ? `Test pass rate ${rate.toFixed(1)}% meets threshold ${this.config.testPassRate}%`
        : `Test pass rate ${rate.toFixed(1)}% is below threshold ${this.config.testPassRate}%`,
    };
  }

  checkDocumentation(context: GateCheckContext): GateResult {
    const rate = context.totalExports > 0
      ? (context.documentedExports / context.totalExports) * 100
      : 0;
    const passed = rate >= this.config.docCoverageThreshold;
    return {
      gateName: 'documentation',
      passed,
      message: passed
        ? `Doc coverage ${rate.toFixed(1)}% meets threshold ${this.config.docCoverageThreshold}%`
        : `Doc coverage ${rate.toFixed(1)}% is below threshold ${this.config.docCoverageThreshold}%`,
    };
  }

  runAll(context: GateCheckContext): { results: GateResult[]; allPassed: boolean } {
    const results = [
      this.checkCoverage(context),
      this.checkLint(context),
      this.checkTests(context),
      this.checkDocumentation(context),
    ];
    const allPassed = results.every((r) => r.passed);
    return { results, allPassed };
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createExtendedQualityGateRunner(
  config?: Partial<ExtendedGateConfig>,
): ExtendedQualityGateRunner {
  return new ExtendedQualityGateRunner(config);
}
