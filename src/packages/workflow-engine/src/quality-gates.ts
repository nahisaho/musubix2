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

/** Maps gate stages to constitution articles they validate */
export interface ConstitutionMapping {
  gateName: string;
  articles: string[];
  description: string;
}

export interface ViolationEntry {
  gateName: string;
  articles: string[];
  message: string;
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_EXTENDED_GATE_CONFIG: ExtendedGateConfig = {
  coverageThreshold: 80,
  lintErrorsAllowed: 0,
  testPassRate: 100,
  docCoverageThreshold: 60,
};

export const GATE_CONSTITUTION_MAP: ConstitutionMapping[] = [
  { gateName: 'coverage', articles: ['CONST-003'], description: 'テストファースト: カバレッジ≥80%' },
  { gateName: 'lint', articles: ['CONST-001'], description: 'ライブラリファースト: コード品質' },
  { gateName: 'tests', articles: ['CONST-003', 'CONST-009'], description: 'テストファースト + 品質ゲート' },
  { gateName: 'documentation', articles: ['CONST-007'], description: 'デザインパターン文書化' },
];

// ── ExtendedQualityGateRunner ──────────────────────────────────────────────

export class ExtendedQualityGateRunner {
  private config: ExtendedGateConfig;
  private violations: ViolationEntry[] = [];

  constructor(config?: Partial<ExtendedGateConfig>) {
    this.config = { ...DEFAULT_EXTENDED_GATE_CONFIG, ...config };
  }

  getConstitutionMap(): ConstitutionMapping[] {
    return [...GATE_CONSTITUTION_MAP];
  }

  getArticlesForGate(gateName: string): string[] {
    const mapping = GATE_CONSTITUTION_MAP.find((m) => m.gateName === gateName);
    return mapping ? [...mapping.articles] : [];
  }

  checkCoverage(context: GateCheckContext): GateResult {
    const passed = context.coveragePercent >= this.config.coverageThreshold;
    const result: GateResult = {
      gateName: 'coverage',
      passed,
      message: passed
        ? `Coverage ${context.coveragePercent}% meets threshold ${this.config.coverageThreshold}%`
        : `Coverage ${context.coveragePercent}% is below threshold ${this.config.coverageThreshold}%`,
    };
    if (!passed) {
      this.violations.push({
        gateName: 'coverage',
        articles: this.getArticlesForGate('coverage'),
        message: result.message,
      });
    }
    return result;
  }

  checkLint(context: GateCheckContext): GateResult {
    const passed = context.lintErrors <= this.config.lintErrorsAllowed;
    const result: GateResult = {
      gateName: 'lint',
      passed,
      message: passed
        ? `Lint errors (${context.lintErrors}) within allowed limit (${this.config.lintErrorsAllowed})`
        : `Lint errors (${context.lintErrors}) exceed allowed limit (${this.config.lintErrorsAllowed})`,
    };
    if (!passed) {
      this.violations.push({
        gateName: 'lint',
        articles: this.getArticlesForGate('lint'),
        message: result.message,
      });
    }
    return result;
  }

  checkTests(context: GateCheckContext): GateResult {
    const rate = context.testsTotal > 0 ? (context.testsPassed / context.testsTotal) * 100 : 0;
    const passed = rate >= this.config.testPassRate;
    const result: GateResult = {
      gateName: 'tests',
      passed,
      message: passed
        ? `Test pass rate ${rate.toFixed(1)}% meets threshold ${this.config.testPassRate}%`
        : `Test pass rate ${rate.toFixed(1)}% is below threshold ${this.config.testPassRate}%`,
    };
    if (!passed) {
      this.violations.push({
        gateName: 'tests',
        articles: this.getArticlesForGate('tests'),
        message: result.message,
      });
    }
    return result;
  }

  checkDocumentation(context: GateCheckContext): GateResult {
    const rate =
      context.totalExports > 0 ? (context.documentedExports / context.totalExports) * 100 : 0;
    const passed = rate >= this.config.docCoverageThreshold;
    const result: GateResult = {
      gateName: 'documentation',
      passed,
      message: passed
        ? `Doc coverage ${rate.toFixed(1)}% meets threshold ${this.config.docCoverageThreshold}%`
        : `Doc coverage ${rate.toFixed(1)}% is below threshold ${this.config.docCoverageThreshold}%`,
    };
    if (!passed) {
      this.violations.push({
        gateName: 'documentation',
        articles: this.getArticlesForGate('documentation'),
        message: result.message,
      });
    }
    return result;
  }

  runAll(context: GateCheckContext): { results: GateResult[]; allPassed: boolean } {
    this.violations = [];
    const results = [
      this.checkCoverage(context),
      this.checkLint(context),
      this.checkTests(context),
      this.checkDocumentation(context),
    ];
    const allPassed = results.every((r) => r.passed);
    return { results, allPassed };
  }

  getViolations(): ViolationEntry[] {
    return [...this.violations];
  }

  generateViolationReport(): string {
    if (this.violations.length === 0) {
      return '# Quality Gate Report\n\n✅ All gates passed. No violations detected.';
    }

    const lines: string[] = [];
    lines.push('# Quality Gate Violation Report');
    lines.push('');
    lines.push(`**Violations found:** ${this.violations.length}`);
    lines.push('');

    for (const v of this.violations) {
      lines.push(`## ❌ Gate: ${v.gateName}`);
      lines.push('');
      lines.push(`- **Message:** ${v.message}`);
      lines.push(`- **Constitution Articles:** ${v.articles.join(', ')}`);
      const mapping = GATE_CONSTITUTION_MAP.find((m) => m.gateName === v.gateName);
      if (mapping) {
        lines.push(`- **Description:** ${mapping.description}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('⛔ Gate failure blocks phase progression until all violations are resolved.');

    return lines.join('\n');
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createExtendedQualityGateRunner(
  config?: Partial<ExtendedGateConfig>,
): ExtendedQualityGateRunner {
  return new ExtendedQualityGateRunner(config);
}
