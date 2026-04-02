// DES-AGT-001: Subagent Orchestration
// REQ-AGT-001 traceability

import { randomUUID } from 'node:crypto';

// ── Types ──

export type AgentRole = 'analyzer' | 'generator' | 'reviewer' | 'tester' | 'documenter';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SubagentSpec {
  id: string;
  role: AgentRole;
  name: string;
  capabilities: string[];
  maxConcurrency?: number;
}

export interface AgentTask {
  id: string;
  agentId: string;
  description: string;
  input: Record<string, unknown>;
  status: AgentStatus;
  result?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// ── SubagentDispatcher ──

export class SubagentDispatcher {
  private agents: Map<string, SubagentSpec> = new Map();
  private tasks: Map<string, AgentTask> = new Map();

  registerAgent(spec: SubagentSpec): void {
    this.agents.set(spec.id, spec);
  }

  unregisterAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  getAgent(id: string): SubagentSpec | undefined {
    return this.agents.get(id);
  }

  listAgents(role?: AgentRole): SubagentSpec[] {
    const all = Array.from(this.agents.values());
    if (role === undefined) {
      return all;
    }
    return all.filter((a) => a.role === role);
  }

  dispatch(agentId: string, description: string, input: Record<string, unknown>): AgentTask {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const task: AgentTask = {
      id: randomUUID(),
      agentId,
      description,
      input,
      status: 'running',
      startedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  completeTask(taskId: string, result: Record<string, unknown>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date();
  }

  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getActiveTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running');
  }

  getTasksByAgent(agentId: string): AgentTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.agentId === agentId);
  }
}

// ── Factory ──

export function createSubagentDispatcher(): SubagentDispatcher {
  return new SubagentDispatcher();
}

export {
  WorkstreamManager,
  ParallelExecutor,
  ResultAggregator,
  createWorkstreamManager,
  createParallelExecutor,
  createResultAggregator,
  type WorkstreamStatus,
  type Workstream,
} from './workstream.js';

export {
  ReviewOrchestrator,
  createReviewOrchestrator,
  type ReviewConfig,
  type ReviewModelId,
  type SDDArtifactType,
  type ReviewIssue,
  type ReviewResult,
  type ReviewRound,
  type ReviewOrchestrationResult,
  type ReviewFunction,
} from './review-orchestrator.js';
