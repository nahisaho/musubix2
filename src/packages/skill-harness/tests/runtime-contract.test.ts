import { describe, it, expect } from 'vitest';
import {
  BaseSkillRuntime,
  type SkillInput,
  type SkillOutput,
  type SkillRuntimeContract,
} from '../src/runtime-contract.js';

class TestSkillRuntime extends BaseSkillRuntime {
  protected async doExecute(input: SkillInput): Promise<Record<string, unknown>> {
    return { processed: input.skillId };
  }
}

class FailingSkillRuntime extends BaseSkillRuntime {
  private callCount = 0;
  constructor(private failUntil: number = Infinity) {
    super();
  }
  protected async doExecute(_input: SkillInput): Promise<Record<string, unknown>> {
    this.callCount++;
    if (this.callCount <= this.failUntil) {
      throw new Error('Execution failed');
    }
    return { recovered: true };
  }
}

function makeInput(overrides?: Partial<SkillInput>): SkillInput {
  return {
    skillId: 'test-skill',
    parameters: {},
    context: { workingDir: '/test' },
    ...overrides,
  };
}

describe('DES-SKL-001: SkillRuntimeContract', () => {
  it('should validate a valid input', () => {
    const runtime = new TestSkillRuntime();
    const result = runtime.validate(makeInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject input missing skillId', () => {
    const runtime = new TestSkillRuntime();
    const result = runtime.validate(makeInput({ skillId: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('skillId is required');
  });

  it('should reject input missing workingDir', () => {
    const runtime = new TestSkillRuntime();
    const result = runtime.validate(makeInput({ context: { workingDir: '' } }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('context.workingDir is required');
  });

  it('should execute successfully and return output', async () => {
    const runtime = new TestSkillRuntime();
    const output = await runtime.execute(makeInput());
    expect(output.success).toBe(true);
    expect(output.data).toEqual({ processed: 'test-skill' });
    expect(output.errors).toHaveLength(0);
    expect(output.metrics.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should return validation errors without executing', async () => {
    const runtime = new TestSkillRuntime();
    const output = await runtime.execute(makeInput({ skillId: '' }));
    expect(output.success).toBe(false);
    expect(output.errors).toContain('skillId is required');
  });

  it('should support dry run mode', async () => {
    const runtime = new TestSkillRuntime();
    const output = await runtime.execute(makeInput(), { dryRun: true });
    expect(output.success).toBe(true);
    expect(output.data).toEqual({ dryRun: true });
  });

  it('should handle execution failure', async () => {
    const runtime = new FailingSkillRuntime();
    const output = await runtime.execute(makeInput());
    expect(output.success).toBe(false);
    expect(output.errors[0]).toBe('Execution failed');
  });

  it('should retry on failure', async () => {
    const runtime = new FailingSkillRuntime(1);
    const output = await runtime.execute(makeInput(), { retries: 1 });
    expect(output.success).toBe(true);
    expect(output.data).toEqual({ recovered: true });
  });

  it('should collect metrics after execution', async () => {
    const runtime = new TestSkillRuntime();
    await runtime.execute(makeInput());
    const metrics = runtime.getMetrics();
    expect(metrics.executionTime).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryUsed).toBeDefined();
  });

  it('should satisfy SkillRuntimeContract interface', () => {
    const runtime: SkillRuntimeContract = new TestSkillRuntime();
    expect(runtime.validate).toBeDefined();
    expect(runtime.execute).toBeDefined();
    expect(runtime.getMetrics).toBeDefined();
  });
});
