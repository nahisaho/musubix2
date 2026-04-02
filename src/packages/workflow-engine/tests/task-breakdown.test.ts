import { describe, it, expect } from 'vitest';
import {
  TaskBreakdownManager,
  createTaskBreakdownManager,
  type TaskInfo,
} from '../src/index.js';

function makeTask(overrides: Partial<TaskInfo> = {}): TaskInfo {
  return {
    id: 'TSK-001',
    title: 'Setup project',
    description: 'Initialize the project structure',
    priority: 'high',
    status: 'pending',
    dependencies: [],
    estimatedComplexity: 'simple',
    ...overrides,
  };
}

describe('DES-SDD-004: TaskBreakdownManager', () => {
  it('addTask and getTask', () => {
    const mgr = new TaskBreakdownManager();
    const task = makeTask();
    mgr.addTask(task);
    const retrieved = mgr.getTask('TSK-001');
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Setup project');
  });

  it('getTask returns undefined for unknown id', () => {
    const mgr = new TaskBreakdownManager();
    expect(mgr.getTask('nonexistent')).toBeUndefined();
  });

  it('updateStatus changes task status', () => {
    const mgr = new TaskBreakdownManager();
    mgr.addTask(makeTask());
    mgr.updateStatus('TSK-001', 'in_progress');
    expect(mgr.getTask('TSK-001')!.status).toBe('in_progress');
  });

  it('updateStatus throws for unknown task', () => {
    const mgr = new TaskBreakdownManager();
    expect(() => mgr.updateStatus('nonexistent', 'done')).toThrow("Task 'nonexistent' not found");
  });

  it('getReadyTasks returns only tasks with satisfied dependencies', () => {
    const mgr = new TaskBreakdownManager();
    mgr.addTask(makeTask({ id: 'A', dependencies: [] }));
    mgr.addTask(makeTask({ id: 'B', dependencies: ['A'] }));
    mgr.addTask(makeTask({ id: 'C', dependencies: ['A', 'B'] }));

    // Only A is ready initially
    let ready = mgr.getReadyTasks();
    expect(ready.map((t) => t.id)).toEqual(['A']);

    // Complete A — now B is ready
    mgr.updateStatus('A', 'done');
    ready = mgr.getReadyTasks();
    expect(ready.map((t) => t.id)).toEqual(['B']);

    // Complete B — now C is ready
    mgr.updateStatus('B', 'done');
    ready = mgr.getReadyTasks();
    expect(ready.map((t) => t.id)).toEqual(['C']);
  });

  it('getBreakdown returns correct counts', () => {
    const mgr = new TaskBreakdownManager();
    mgr.addTask(makeTask({ id: 'A', status: 'done' }));
    mgr.addTask(makeTask({ id: 'B', status: 'blocked' }));
    mgr.addTask(makeTask({ id: 'C', status: 'pending' }));

    const breakdown = mgr.getBreakdown();
    expect(breakdown.totalTasks).toBe(3);
    expect(breakdown.completedTasks).toBe(1);
    expect(breakdown.blockedTasks).toBe(1);
    expect(breakdown.tasks).toHaveLength(3);
  });

  it('getDependencyChain returns transitive dependencies', () => {
    const mgr = new TaskBreakdownManager();
    mgr.addTask(makeTask({ id: 'A', dependencies: [] }));
    mgr.addTask(makeTask({ id: 'B', dependencies: ['A'] }));
    mgr.addTask(makeTask({ id: 'C', dependencies: ['B'] }));

    const chain = mgr.getDependencyChain('C');
    const ids = chain.map((t) => t.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).toHaveLength(2);
  });

  it('getDependencyChain handles no dependencies', () => {
    const mgr = new TaskBreakdownManager();
    mgr.addTask(makeTask({ id: 'A', dependencies: [] }));
    const chain = mgr.getDependencyChain('A');
    expect(chain).toHaveLength(0);
  });

  it('toMarkdown produces markdown table', () => {
    const mgr = new TaskBreakdownManager();
    mgr.addTask(makeTask({ id: 'TSK-001', title: 'Init', priority: 'high', status: 'pending', estimatedComplexity: 'simple' }));
    mgr.addTask(makeTask({ id: 'TSK-002', title: 'Build', priority: 'medium', status: 'done', estimatedComplexity: 'complex' }));

    const md = mgr.toMarkdown();
    expect(md).toContain('| ID | Title | Priority | Status | Complexity |');
    expect(md).toContain('| TSK-001 | Init | high | pending | simple |');
    expect(md).toContain('| TSK-002 | Build | medium | done | complex |');
  });

  it('toMarkdown returns header for empty manager', () => {
    const mgr = new TaskBreakdownManager();
    const md = mgr.toMarkdown();
    expect(md).toContain('| ID | Title |');
  });

  it('factory creates a manager', () => {
    const mgr = createTaskBreakdownManager();
    expect(mgr).toBeInstanceOf(TaskBreakdownManager);
    expect(mgr.getBreakdown().totalTasks).toBe(0);
  });
});
