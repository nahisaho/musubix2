import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkstreamManager,
  ParallelExecutor,
  ResultAggregator,
  createWorkstreamManager,
  createParallelExecutor,
  createResultAggregator,
  type Workstream,
} from '../src/workstream.js';

describe('DES-AGT-001: WorkstreamManager', () => {
  let manager: WorkstreamManager;

  beforeEach(() => {
    manager = createWorkstreamManager();
  });

  it('should create a workstream', () => {
    const ws = manager.createWorkstream('test-ws', ['t1', 't2']);
    expect(ws.name).toBe('test-ws');
    expect(ws.tasks).toEqual(['t1', 't2']);
    expect(ws.status).toBe('pending');
    expect(ws.progress).toBe(0);
  });

  it('should get a workstream by id', () => {
    const ws = manager.createWorkstream('ws-1', ['t1']);
    expect(manager.getWorkstream(ws.id)).toEqual(ws);
  });

  it('should return undefined for unknown workstream', () => {
    expect(manager.getWorkstream('nonexistent')).toBeUndefined();
  });

  it('should update progress and set running', () => {
    const ws = manager.createWorkstream('ws-1', ['t1']);
    manager.updateProgress(ws.id, 50);
    const updated = manager.getWorkstream(ws.id)!;
    expect(updated.progress).toBe(50);
    expect(updated.status).toBe('running');
  });

  it('should clamp progress to 0–100', () => {
    const ws = manager.createWorkstream('ws-1', ['t1']);
    manager.updateProgress(ws.id, 150);
    expect(manager.getWorkstream(ws.id)!.progress).toBe(100);
    manager.updateProgress(ws.id, -10);
    expect(manager.getWorkstream(ws.id)!.progress).toBe(0);
  });

  it('should complete a workstream', () => {
    const ws = manager.createWorkstream('ws-1', ['t1']);
    manager.complete(ws.id);
    const completed = manager.getWorkstream(ws.id)!;
    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
  });

  it('should list all workstreams', () => {
    manager.createWorkstream('ws-1', ['t1']);
    manager.createWorkstream('ws-2', ['t2']);
    expect(manager.listWorkstreams().length).toBe(2);
  });

  it('should throw on updateProgress for unknown id', () => {
    expect(() => manager.updateProgress('bad', 50)).toThrow('Workstream not found');
  });
});

describe('DES-AGT-001: ParallelExecutor', () => {
  let executor: ParallelExecutor;

  beforeEach(() => {
    executor = createParallelExecutor();
  });

  it('should execute tasks in parallel', async () => {
    const results = await executor.execute([
      { id: 'a', run: async () => 'result-a' },
      { id: 'b', run: async () => 42 },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].result).toBe('result-a');
    expect(results[1].result).toBe(42);
  });

  it('should capture errors from failing tasks', async () => {
    const results = await executor.execute([
      { id: 'ok', run: async () => 'fine' },
      { id: 'fail', run: async () => { throw new Error('boom'); } },
    ]);
    expect(results[0].result).toBe('fine');
    expect(results[1].error).toBe('boom');
  });
});

describe('DES-AGT-001: ResultAggregator', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = createResultAggregator();
  });

  it('should aggregate results', () => {
    const agg = aggregator.aggregate([
      { id: 'a', result: 'ok' },
      { id: 'b', error: 'fail' },
      { id: 'c', result: 42 },
    ]);
    expect(agg.totalTasks).toBe(3);
    expect(agg.succeeded).toBe(2);
    expect(agg.failed).toBe(1);
    expect(agg.results.get('a')).toBe('ok');
  });

  it('should handle empty results', () => {
    const agg = aggregator.aggregate([]);
    expect(agg.totalTasks).toBe(0);
    expect(agg.succeeded).toBe(0);
    expect(agg.failed).toBe(0);
  });
});
