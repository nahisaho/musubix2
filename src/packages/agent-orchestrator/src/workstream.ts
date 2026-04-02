// DES-AGT-001: Workstream Management
// REQ-AGT-001 traceability

import { randomUUID } from 'node:crypto';

// ── Types ──

export type WorkstreamStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Workstream {
  id: string;
  name: string;
  tasks: string[];
  status: WorkstreamStatus;
  progress: number;
}

// ── ParallelExecutor ──

export class ParallelExecutor {
  async execute(
    tasks: Array<{ id: string; run: () => Promise<unknown> }>,
  ): Promise<Array<{ id: string; result?: unknown; error?: string }>> {
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        const result = await task.run();
        return { id: task.id, result };
      }),
    );

    return results.map((settled, idx) => {
      if (settled.status === 'fulfilled') {
        return settled.value;
      }
      return {
        id: tasks[idx].id,
        error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
      };
    });
  }
}

// ── ResultAggregator ──

export class ResultAggregator {
  aggregate(
    results: Array<{ id: string; result?: unknown; error?: string }>,
  ): { totalTasks: number; succeeded: number; failed: number; results: Map<string, unknown> } {
    const resultMap = new Map<string, unknown>();
    let succeeded = 0;
    let failed = 0;

    for (const r of results) {
      if (r.error !== undefined) {
        failed++;
      } else {
        succeeded++;
        resultMap.set(r.id, r.result);
      }
    }

    return {
      totalTasks: results.length,
      succeeded,
      failed,
      results: resultMap,
    };
  }
}

// ── WorkstreamManager ──

export class WorkstreamManager {
  private workstreams: Map<string, Workstream> = new Map();

  createWorkstream(name: string, taskIds: string[]): Workstream {
    const ws: Workstream = {
      id: randomUUID(),
      name,
      tasks: [...taskIds],
      status: 'pending',
      progress: 0,
    };
    this.workstreams.set(ws.id, ws);
    return ws;
  }

  getWorkstream(id: string): Workstream | undefined {
    return this.workstreams.get(id);
  }

  updateProgress(id: string, progress: number): void {
    const ws = this.workstreams.get(id);
    if (!ws) throw new Error(`Workstream not found: ${id}`);
    ws.progress = Math.max(0, Math.min(100, progress));
    if (ws.status === 'pending') ws.status = 'running';
  }

  complete(id: string): void {
    const ws = this.workstreams.get(id);
    if (!ws) throw new Error(`Workstream not found: ${id}`);
    ws.status = 'completed';
    ws.progress = 100;
  }

  listWorkstreams(): Workstream[] {
    return Array.from(this.workstreams.values());
  }
}

// ── Factories ──

export function createWorkstreamManager(): WorkstreamManager {
  return new WorkstreamManager();
}

export function createParallelExecutor(): ParallelExecutor {
  return new ParallelExecutor();
}

export function createResultAggregator(): ResultAggregator {
  return new ResultAggregator();
}
