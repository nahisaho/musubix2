import { describe, it, expect } from 'vitest';
import { SkillTestHarness, type MockProvider, type SkillTestCase } from '../src/test-harness.js';
import { BaseSkillRuntime, type SkillInput } from '../src/runtime-contract.js';

class EchoRuntime extends BaseSkillRuntime {
  protected async doExecute(input: SkillInput): Promise<Record<string, unknown>> {
    return { echo: input.parameters['message'] ?? 'none' };
  }
}

class FailRuntime extends BaseSkillRuntime {
  protected async doExecute(_input: SkillInput): Promise<Record<string, unknown>> {
    throw new Error('intentional failure');
  }
}

function makeInput(params?: Record<string, unknown>): SkillInput {
  return {
    skillId: 'echo',
    parameters: params ?? {},
    context: { workingDir: '/test' },
  };
}

describe('DES-SKL-003: SkillTestHarness', () => {
  it('should run a passing test case', async () => {
    const harness = new SkillTestHarness(new EchoRuntime());
    const tc: SkillTestCase = {
      name: 'echo test',
      input: makeInput({ message: 'hi' }),
      expectedOutput: { success: true, data: { echo: 'hi' } },
    };
    const result = await harness.runTest(tc);
    expect(result.passed).toBe(true);
    expect(result.testCase).toBe('echo test');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should detect a failing test case', async () => {
    const harness = new SkillTestHarness(new EchoRuntime());
    const tc: SkillTestCase = {
      name: 'mismatch test',
      input: makeInput({ message: 'hi' }),
      expectedOutput: { data: { echo: 'wrong' } },
    };
    const result = await harness.runTest(tc);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle shouldFail correctly', async () => {
    const harness = new SkillTestHarness(new FailRuntime());
    const tc: SkillTestCase = {
      name: 'expected failure',
      input: makeInput(),
      shouldFail: true,
    };
    const result = await harness.runTest(tc);
    expect(result.passed).toBe(true);
  });

  it('should fail when shouldFail is true but execution succeeds', async () => {
    const harness = new SkillTestHarness(new EchoRuntime());
    const tc: SkillTestCase = {
      name: 'unexpected success',
      input: makeInput(),
      shouldFail: true,
    };
    const result = await harness.runTest(tc);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('Expected failure');
  });

  it('should run a suite and return summary', async () => {
    const harness = new SkillTestHarness(new EchoRuntime());
    const suite: SkillTestCase[] = [
      { name: 'pass', input: makeInput({ message: 'a' }) },
      { name: 'fail', input: makeInput(), expectedOutput: { data: { echo: 'wrong' } } },
    ];
    const { results, passed, failed } = await harness.runSuite(suite);
    expect(results).toHaveLength(2);
    expect(passed).toBe(1);
    expect(failed).toBe(1);
  });

  it('should manage mock providers', () => {
    const harness = new SkillTestHarness(new EchoRuntime());
    const mock: MockProvider = {
      name: 'fs',
      responses: new Map([['read', 'data']]),
      get(key: string) { return this.responses.get(key); },
    };
    harness.addMockProvider(mock);
    const providers = harness.getMockProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('fs');
    expect(providers[0].get('read')).toBe('data');
  });

  it('should include duration in test results', async () => {
    const harness = new SkillTestHarness(new EchoRuntime());
    const tc: SkillTestCase = { name: 'timed', input: makeInput() };
    const result = await harness.runTest(tc);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.actual.metrics.executionTime).toBeGreaterThanOrEqual(0);
  });
});
