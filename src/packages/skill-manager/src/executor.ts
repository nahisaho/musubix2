// DES-AGT-004: Skill Executor
// REQ-AGT-004 traceability

import { SkillRegistry } from './index.js';

// ── Types ──

export interface SkillContext {
  workingDir: string;
  phase?: string;
  config?: Record<string, unknown>;
}

export interface SkillResult {
  success: boolean;
  output: Record<string, unknown>;
  duration: number;
  errors: string[];
}

export interface SkillExecutionOptions {
  timeout?: number;
  retries?: number;
  context: SkillContext;
}

// ── SkillExecutor ──

export class SkillExecutor {
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
    this.registry = registry;
  }

  async execute(
    skillId: string,
    input: Record<string, unknown>,
    options: SkillExecutionOptions,
  ): Promise<SkillResult> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      return {
        success: false,
        output: {},
        duration: 0,
        errors: [`Skill not found: ${skillId}`],
      };
    }

    const retries = options.retries ?? 0;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const start = Date.now();
      try {
        const enrichedInput = { ...input, __context: options.context };
        const output = await this.executeWithTimeout(
          () => skill.execute(enrichedInput),
          options.timeout,
        );
        return {
          success: true,
          output,
          duration: Date.now() - start,
          errors: [],
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      success: false,
      output: {},
      duration: 0,
      errors: [lastError ?? 'Unknown error'],
    };
  }

  async executeBatch(
    tasks: Array<{ skillId: string; input: Record<string, unknown> }>,
    options: SkillExecutionOptions,
  ): Promise<SkillResult[]> {
    const results: SkillResult[] = [];
    for (const task of tasks) {
      const result = await this.execute(task.skillId, task.input, options);
      results.push(result);
    }
    return results;
  }

  private async executeWithTimeout(
    fn: () => Promise<Record<string, unknown>>,
    timeout?: number,
  ): Promise<Record<string, unknown>> {
    if (!timeout) return fn();

    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Skill execution timed out')), timeout),
      ),
    ]);
  }
}

// ── Factory ──

export function createSkillExecutor(registry: SkillRegistry): SkillExecutor {
  return new SkillExecutor(registry);
}
