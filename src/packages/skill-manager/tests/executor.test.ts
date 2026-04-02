import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SkillRegistry,
  createSkillRegistry,
  type Skill,
} from '../src/index.js';
import {
  SkillExecutor,
  createSkillExecutor,
  type SkillExecutionOptions,
  type SkillContext,
} from '../src/executor.js';

function createTestSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: overrides.id ?? 'skill-exec-1',
    metadata: overrides.metadata ?? {
      name: 'Exec Test Skill',
      version: '1.0.0',
      description: 'A test skill for executor',
      triggers: ['exec'],
    },
    status: overrides.status ?? 'available',
    execute: overrides.execute ?? (async (input) => ({ result: 'ok', ...input })),
  };
}

const defaultContext: SkillContext = { workingDir: '/test' };
const defaultOptions: SkillExecutionOptions = { context: defaultContext };

describe('DES-AGT-004: SkillExecutor', () => {
  let registry: SkillRegistry;
  let executor: SkillExecutor;

  beforeEach(() => {
    registry = createSkillRegistry();
    executor = createSkillExecutor(registry);
  });

  it('should execute a registered skill successfully', async () => {
    registry.register(createTestSkill());
    const result = await executor.execute('skill-exec-1', { data: 'hello' }, defaultOptions);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should return error for unknown skill', async () => {
    const result = await executor.execute('unknown', {}, defaultOptions);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Skill not found');
  });

  it('should handle skill execution errors', async () => {
    const failingSkill = createTestSkill({
      id: 'fail-skill',
      execute: async () => { throw new Error('skill exploded'); },
    });
    registry.register(failingSkill);
    const result = await executor.execute('fail-skill', {}, defaultOptions);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBe('skill exploded');
  });

  it('should retry on failure', async () => {
    let attempt = 0;
    const retrySkill = createTestSkill({
      id: 'retry-skill',
      execute: async () => {
        attempt++;
        if (attempt < 3) throw new Error('not yet');
        return { ok: true };
      },
    });
    registry.register(retrySkill);
    const result = await executor.execute('retry-skill', {}, { context: defaultContext, retries: 2 });
    expect(result.success).toBe(true);
  });

  it('should fail after exhausting retries', async () => {
    const alwaysFail = createTestSkill({
      id: 'always-fail',
      execute: async () => { throw new Error('always fails'); },
    });
    registry.register(alwaysFail);
    const result = await executor.execute('always-fail', {}, { context: defaultContext, retries: 1 });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toBe('always fails');
  });

  it('should execute batch of tasks', async () => {
    registry.register(createTestSkill({ id: 's1' }));
    registry.register(createTestSkill({ id: 's2' }));
    const results = await executor.executeBatch(
      [
        { skillId: 's1', input: { a: 1 } },
        { skillId: 's2', input: { b: 2 } },
      ],
      defaultOptions,
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should handle timeout', async () => {
    const slowSkill = createTestSkill({
      id: 'slow-skill',
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { done: true };
      },
    });
    registry.register(slowSkill);
    const result = await executor.execute('slow-skill', {}, { context: defaultContext, timeout: 50 });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('timed out');
  });

  it('should create executor via factory', () => {
    const exec = createSkillExecutor(registry);
    expect(exec).toBeInstanceOf(SkillExecutor);
  });
});
