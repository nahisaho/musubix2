/**
 * DES-SKL-001: SkillRuntimeContract
 * Unified runtime contract for all Agent Skills execution lifecycle.
 */

// --- Types ---

export interface SkillExecutionContext {
  workingDir: string;
  phase?: string;
  projectConfig?: Record<string, unknown>;
  timeout?: number;
}

export interface SkillInput {
  skillId: string;
  parameters: Record<string, unknown>;
  context: SkillExecutionContext;
}

export interface SkillExecutionOptions {
  retries?: number;
  timeout?: number;
  dryRun?: boolean;
}

export interface SkillMetrics {
  executionTime: number;
  memoryUsed?: number;
  tokensUsed?: number;
}

export interface SkillOutput {
  success: boolean;
  data: Record<string, unknown>;
  metrics: SkillMetrics;
  errors: string[];
}

// --- Contract ---

export interface SkillRuntimeContract {
  validate(input: SkillInput): { valid: boolean; errors: string[] };
  execute(input: SkillInput, options?: SkillExecutionOptions): Promise<SkillOutput>;
  getMetrics(): SkillMetrics;
}

// --- Base Abstract Implementation ---

export abstract class BaseSkillRuntime implements SkillRuntimeContract {
  private _metrics: SkillMetrics = { executionTime: 0 };

  validate(input: SkillInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!input.skillId) {
      errors.push('skillId is required');
    }
    if (!input.context?.workingDir) {
      errors.push('context.workingDir is required');
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(input: SkillInput, options?: SkillExecutionOptions): Promise<SkillOutput> {
    const validation = this.validate(input);
    if (!validation.valid) {
      return {
        success: false,
        data: {},
        metrics: this._metrics,
        errors: validation.errors,
      };
    }

    if (options?.dryRun) {
      return {
        success: true,
        data: { dryRun: true },
        metrics: { executionTime: 0 },
        errors: [],
      };
    }

    const startTime = performance.now();
    const memBefore = process.memoryUsage().heapUsed;

    let retries = options?.retries ?? 0;
    let lastError: unknown;

    while (retries >= 0) {
      try {
        const data = await this.doExecute(input);
        const endTime = performance.now();
        this._metrics = {
          executionTime: endTime - startTime,
          memoryUsed: process.memoryUsage().heapUsed - memBefore,
        };
        return {
          success: true,
          data,
          metrics: this._metrics,
          errors: [],
        };
      } catch (err) {
        lastError = err;
        retries--;
      }
    }

    const endTime = performance.now();
    this._metrics = {
      executionTime: endTime - startTime,
      memoryUsed: process.memoryUsage().heapUsed - memBefore,
    };
    return {
      success: false,
      data: {},
      metrics: this._metrics,
      errors: [lastError instanceof Error ? lastError.message : String(lastError)],
    };
  }

  getMetrics(): SkillMetrics {
    return { ...this._metrics };
  }

  protected abstract doExecute(input: SkillInput): Promise<Record<string, unknown>>;
}
