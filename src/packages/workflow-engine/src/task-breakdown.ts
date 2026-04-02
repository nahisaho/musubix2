// DES-SDD-004: Task Breakdown Manager — task decomposition, dependency tracking, and reporting

// ── Types ──────────────────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  assignee?: string;
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

export interface TaskBreakdown {
  tasks: TaskInfo[];
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
}

// ── TaskBreakdownManager ───────────────────────────────────────────────────

export class TaskBreakdownManager {
  private tasks: Map<string, TaskInfo> = new Map();

  addTask(task: TaskInfo): void {
    this.tasks.set(task.id, { ...task });
  }

  getTask(id: string): TaskInfo | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }

  updateStatus(id: string, status: TaskStatus): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task '${id}' not found`);
    }
    task.status = status;
  }

  getReadyTasks(): TaskInfo[] {
    const ready: TaskInfo[] = [];
    for (const task of this.tasks.values()) {
      if (task.status !== 'pending') continue;
      const allDepsDone = task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep !== undefined && dep.status === 'done';
      });
      if (allDepsDone) {
        ready.push({ ...task });
      }
    }
    return ready;
  }

  getBreakdown(): TaskBreakdown {
    const all = [...this.tasks.values()];
    return {
      tasks: all.map((t) => ({ ...t })),
      totalTasks: all.length,
      completedTasks: all.filter((t) => t.status === 'done').length,
      blockedTasks: all.filter((t) => t.status === 'blocked').length,
    };
  }

  getDependencyChain(id: string): TaskInfo[] {
    const visited = new Set<string>();
    const chain: TaskInfo[] = [];

    const collect = (taskId: string): void => {
      const task = this.tasks.get(taskId);
      if (!task) return;
      for (const depId of task.dependencies) {
        if (visited.has(depId)) continue;
        visited.add(depId);
        collect(depId);
        const dep = this.tasks.get(depId);
        if (dep) chain.push({ ...dep });
      }
    };

    collect(id);
    return chain;
  }

  toMarkdown(): string {
    const rows = [...this.tasks.values()];
    if (rows.length === 0) return '| ID | Title | Priority | Status | Complexity |\n| -- | ----- | -------- | ------ | ---------- |\n';

    const lines = [
      '| ID | Title | Priority | Status | Complexity |',
      '| -- | ----- | -------- | ------ | ---------- |',
      ...rows.map(
        (t) => `| ${t.id} | ${t.title} | ${t.priority} | ${t.status} | ${t.estimatedComplexity} |`,
      ),
    ];
    return lines.join('\n') + '\n';
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createTaskBreakdownManager(): TaskBreakdownManager {
  return new TaskBreakdownManager();
}
