/**
 * DES-SKL-003: SkillTestHarness
 * Isolated test execution environment with mock injection and assertions.
 */

import type { SkillRuntimeContract, SkillInput, SkillOutput } from './runtime-contract.js';

// --- Types ---

export interface MockProvider {
  name: string;
  responses: Map<string, unknown>;
  get(key: string): unknown;
}

export interface SkillTestCase {
  name: string;
  input: SkillInput;
  expectedOutput?: Partial<SkillOutput>;
  shouldFail?: boolean;
}

export interface SkillTestResult {
  testCase: string;
  passed: boolean;
  actual: SkillOutput;
  duration: number;
  error?: string;
}

// --- Harness ---

export class SkillTestHarness {
  private mockProviders: MockProvider[] = [];

  constructor(private runtime: SkillRuntimeContract) {}

  addMockProvider(provider: MockProvider): void {
    this.mockProviders.push(provider);
  }

  async runTest(testCase: SkillTestCase): Promise<SkillTestResult> {
    const start = performance.now();
    try {
      const actual = await this.runtime.execute(testCase.input);
      const duration = performance.now() - start;

      let passed: boolean;
      let error: string | undefined;

      if (testCase.shouldFail) {
        passed = !actual.success;
        if (!passed) {
          error = 'Expected failure but execution succeeded';
        }
      } else if (testCase.expectedOutput) {
        const mismatches = this._compareOutput(actual, testCase.expectedOutput);
        passed = mismatches.length === 0;
        if (!passed) {
          error = mismatches.join('; ');
        }
      } else {
        passed = actual.success;
        if (!passed) {
          error = actual.errors.join('; ');
        }
      }

      return { testCase: testCase.name, passed, actual, duration, error };
    } catch (err) {
      const duration = performance.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        testCase: testCase.name,
        passed: !!testCase.shouldFail,
        actual: {
          success: false,
          data: {},
          metrics: { executionTime: duration },
          errors: [errorMsg],
        },
        duration,
        error: errorMsg,
      };
    }
  }

  async runSuite(
    testCases: SkillTestCase[],
  ): Promise<{ results: SkillTestResult[]; passed: number; failed: number }> {
    const results: SkillTestResult[] = [];
    for (const tc of testCases) {
      results.push(await this.runTest(tc));
    }
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    return { results, passed, failed };
  }

  getMockProviders(): MockProvider[] {
    return [...this.mockProviders];
  }

  private _compareOutput(actual: SkillOutput, expected: Partial<SkillOutput>): string[] {
    const mismatches: string[] = [];

    if (expected.success !== undefined && actual.success !== expected.success) {
      mismatches.push(`success: expected ${expected.success}, got ${actual.success}`);
    }

    if (expected.data) {
      for (const [key, val] of Object.entries(expected.data)) {
        if (JSON.stringify(actual.data[key]) !== JSON.stringify(val)) {
          mismatches.push(
            `data.${key}: expected ${JSON.stringify(val)}, got ${JSON.stringify(actual.data[key])}`,
          );
        }
      }
    }

    if (expected.errors && expected.errors.length > 0) {
      for (const expectedErr of expected.errors) {
        if (!actual.errors.includes(expectedErr)) {
          mismatches.push(`missing expected error: "${expectedErr}"`);
        }
      }
    }

    return mismatches;
  }
}
