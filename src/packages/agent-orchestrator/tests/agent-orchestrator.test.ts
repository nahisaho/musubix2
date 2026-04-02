import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubagentDispatcher,
  createSubagentDispatcher,
  type SubagentSpec,
  type AgentRole,
} from '../src/index.js';

describe('DES-AGT-001: SubagentDispatcher', () => {
  let dispatcher: SubagentDispatcher;

  const analyzerSpec: SubagentSpec = {
    id: 'agent-analyzer-1',
    role: 'analyzer',
    name: 'Code Analyzer',
    capabilities: ['static-analysis', 'linting'],
    maxConcurrency: 3,
  };

  const generatorSpec: SubagentSpec = {
    id: 'agent-generator-1',
    role: 'generator',
    name: 'Code Generator',
    capabilities: ['scaffolding', 'boilerplate'],
  };

  const reviewerSpec: SubagentSpec = {
    id: 'agent-reviewer-1',
    role: 'reviewer',
    name: 'Code Reviewer',
    capabilities: ['review', 'suggestions'],
  };

  beforeEach(() => {
    dispatcher = createSubagentDispatcher();
  });

  it('should register an agent and retrieve it', () => {
    dispatcher.registerAgent(analyzerSpec);
    const agent = dispatcher.getAgent('agent-analyzer-1');
    expect(agent).toBeDefined();
    expect(agent?.name).toBe('Code Analyzer');
    expect(agent?.role).toBe('analyzer');
  });

  it('should return undefined for unknown agent', () => {
    expect(dispatcher.getAgent('nonexistent')).toBeUndefined();
  });

  it('should list all registered agents', () => {
    dispatcher.registerAgent(analyzerSpec);
    dispatcher.registerAgent(generatorSpec);
    dispatcher.registerAgent(reviewerSpec);
    expect(dispatcher.listAgents()).toHaveLength(3);
  });

  it('should filter agents by role', () => {
    dispatcher.registerAgent(analyzerSpec);
    dispatcher.registerAgent(generatorSpec);
    dispatcher.registerAgent(reviewerSpec);
    const analyzers = dispatcher.listAgents('analyzer');
    expect(analyzers).toHaveLength(1);
    expect(analyzers[0].id).toBe('agent-analyzer-1');
  });

  it('should return empty list when filtering by unused role', () => {
    dispatcher.registerAgent(analyzerSpec);
    expect(dispatcher.listAgents('tester')).toHaveLength(0);
  });

  it('should dispatch a task with running status', () => {
    dispatcher.registerAgent(analyzerSpec);
    const task = dispatcher.dispatch('agent-analyzer-1', 'Analyze code', { file: 'main.ts' });
    expect(task.status).toBe('running');
    expect(task.agentId).toBe('agent-analyzer-1');
    expect(task.description).toBe('Analyze code');
    expect(task.startedAt).toBeInstanceOf(Date);
    expect(task.id).toBeTruthy();
  });

  it('should throw when dispatching to unknown agent', () => {
    expect(() => dispatcher.dispatch('nonexistent', 'task', {})).toThrow('Agent not found');
  });

  it('should complete a task with result', () => {
    dispatcher.registerAgent(analyzerSpec);
    const task = dispatcher.dispatch('agent-analyzer-1', 'Analyze', {});
    dispatcher.completeTask(task.id, { issues: 0 });

    const updated = dispatcher.getTask(task.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.result).toEqual({ issues: 0 });
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });

  it('should fail a task with error', () => {
    dispatcher.registerAgent(analyzerSpec);
    const task = dispatcher.dispatch('agent-analyzer-1', 'Analyze', {});
    dispatcher.failTask(task.id, 'Timeout exceeded');

    const updated = dispatcher.getTask(task.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toBe('Timeout exceeded');
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });

  it('should throw when completing unknown task', () => {
    expect(() => dispatcher.completeTask('bad-id', {})).toThrow('Task not found');
  });

  it('should throw when failing unknown task', () => {
    expect(() => dispatcher.failTask('bad-id', 'error')).toThrow('Task not found');
  });

  it('should get active tasks (running only)', () => {
    dispatcher.registerAgent(analyzerSpec);
    dispatcher.registerAgent(generatorSpec);

    const t1 = dispatcher.dispatch('agent-analyzer-1', 'Task 1', {});
    const t2 = dispatcher.dispatch('agent-generator-1', 'Task 2', {});
    dispatcher.completeTask(t1.id, {});

    const active = dispatcher.getActiveTasks();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(t2.id);
  });

  it('should get tasks by agent id', () => {
    dispatcher.registerAgent(analyzerSpec);
    dispatcher.registerAgent(generatorSpec);

    dispatcher.dispatch('agent-analyzer-1', 'Task A', {});
    dispatcher.dispatch('agent-analyzer-1', 'Task B', {});
    dispatcher.dispatch('agent-generator-1', 'Task C', {});

    const analyzerTasks = dispatcher.getTasksByAgent('agent-analyzer-1');
    expect(analyzerTasks).toHaveLength(2);
  });

  it('should unregister an agent', () => {
    dispatcher.registerAgent(analyzerSpec);
    expect(dispatcher.unregisterAgent('agent-analyzer-1')).toBe(true);
    expect(dispatcher.getAgent('agent-analyzer-1')).toBeUndefined();
  });

  it('should return false when unregistering unknown agent', () => {
    expect(dispatcher.unregisterAgent('nonexistent')).toBe(false);
  });

  it('should return undefined for unknown task', () => {
    expect(dispatcher.getTask('nonexistent')).toBeUndefined();
  });
});
