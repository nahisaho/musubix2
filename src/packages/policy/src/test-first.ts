// DES-GOV-002: テストファースト強制
// REQ-GOV-002 traceability

// ── Types ──

export interface TestFirstConfig {
  requireRedPhase: boolean;
  coverageThreshold: number;
  requireGreenBeforeRefactor: boolean;
}

export const DEFAULT_TEST_FIRST_CONFIG: TestFirstConfig = {
  requireRedPhase: true,
  coverageThreshold: 80,
  requireGreenBeforeRefactor: true,
};

export type TestPhase = 'red' | 'green' | 'refactor';

// ── TestFirstTracker ──

const VALID_TRANSITIONS: Record<TestPhase, TestPhase | null> = {
  red: 'green',
  green: 'refactor',
  refactor: null,
};

export class TestFirstTracker {
  private phase: TestPhase = 'red';

  getCurrentPhase(): TestPhase {
    return this.phase;
  }

  transitionTo(phase: TestPhase): { success: boolean; error?: string } {
    const expected = VALID_TRANSITIONS[this.phase];
    if (expected === null) {
      return { success: false, error: 'Cycle complete — call reset() before starting a new cycle' };
    }
    if (phase !== expected) {
      return {
        success: false,
        error: `Cannot transition from '${this.phase}' to '${phase}': expected '${expected}'`,
      };
    }
    this.phase = phase;
    return { success: true };
  }

  reset(): void {
    this.phase = 'red';
  }

  isComplete(): boolean {
    return this.phase === 'refactor';
  }
}

// ── CoverageGate ──

export interface CoverageGateConfig {
  minLineCoverage: number;
  minBranchCoverage: number;
  minFunctionCoverage: number;
}

export class CoverageGate {
  check(
    actual: { line: number; branch: number; function: number },
    config: CoverageGateConfig,
  ): { passed: boolean; details: string[] } {
    const details: string[] = [];
    let passed = true;

    if (actual.line < config.minLineCoverage) {
      passed = false;
      details.push(`Line coverage ${actual.line}% < ${config.minLineCoverage}%`);
    }
    if (actual.branch < config.minBranchCoverage) {
      passed = false;
      details.push(`Branch coverage ${actual.branch}% < ${config.minBranchCoverage}%`);
    }
    if (actual.function < config.minFunctionCoverage) {
      passed = false;
      details.push(`Function coverage ${actual.function}% < ${config.minFunctionCoverage}%`);
    }

    if (passed) {
      details.push('All coverage thresholds met');
    }

    return { passed, details };
  }
}

// ── Factories ──

export function createTestFirstTracker(): TestFirstTracker {
  return new TestFirstTracker();
}

export function createCoverageGate(): CoverageGate {
  return new CoverageGate();
}
