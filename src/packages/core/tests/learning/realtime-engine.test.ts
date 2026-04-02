import { describe, it, expect, beforeEach } from 'vitest';
import {
  RealtimeLearningEngine,
  createRealtimeLearningEngine,
} from '../../src/learning/realtime-engine.js';
import type { LearningDashboard } from '../../src/learning/realtime-engine.js';

describe('DES-LRN-001: RealtimeLearningEngine', () => {
  let engine: RealtimeLearningEngine;

  beforeEach(() => {
    engine = createRealtimeLearningEngine(5);
  });

  it('should create via factory with default buffer size', () => {
    const defaultEngine = createRealtimeLearningEngine();
    expect(defaultEngine).toBeInstanceOf(RealtimeLearningEngine);
    expect(defaultEngine.getBufferSize()).toBe(0);
  });

  it('should create via factory with custom buffer size', () => {
    expect(engine).toBeInstanceOf(RealtimeLearningEngine);
    expect(engine.getBufferSize()).toBe(0);
  });

  it('should ingest data into the buffer', () => {
    engine.ingest('hello world');
    expect(engine.getBufferSize()).toBe(1);
    engine.ingest('foo bar');
    expect(engine.getBufferSize()).toBe(2);
  });

  it('should auto-flush when buffer reaches max size', () => {
    for (let i = 0; i < 5; i++) {
      engine.ingest(`data item ${i}`);
    }
    // Buffer should have been auto-flushed
    expect(engine.getBufferSize()).toBe(0);
  });

  it('should flush manually and return extracted patterns', () => {
    engine.ingest('hello world');
    engine.ingest('foo bar baz');
    const patterns = engine.flush();
    expect(patterns.length).toBeGreaterThan(0);
    expect(engine.getBufferSize()).toBe(0);
  });

  it('should return an empty array when flushing empty buffer', () => {
    const patterns = engine.flush();
    expect(patterns).toEqual([]);
  });

  it('should return a valid dashboard', () => {
    engine.ingest('ErrorHandler catch');
    engine.ingest('describe test expect');
    engine.flush();

    const dashboard: LearningDashboard = engine.getDashboard();
    expect(dashboard.totalPatterns).toBeGreaterThan(0);
    expect(dashboard.recentPatterns).toBeGreaterThan(0);
    expect(dashboard.lastUpdated).toBeInstanceOf(Date);
    expect(Array.isArray(dashboard.topCategories)).toBe(true);
  });

  it('should update dashboard across multiple flushes', () => {
    engine.ingest('first batch');
    engine.flush();
    const first = engine.getDashboard().totalPatterns;

    engine.ingest('second batch');
    engine.flush();
    const second = engine.getDashboard().totalPatterns;

    expect(second).toBeGreaterThan(first);
  });

  it('should allow changing max buffer size', () => {
    engine.setMaxBufferSize(2);
    engine.ingest('one two');
    expect(engine.getBufferSize()).toBe(1);
    engine.ingest('three four');
    // Should auto-flush at size 2
    expect(engine.getBufferSize()).toBe(0);
  });

  it('should extract bigram patterns from multi-word data', () => {
    engine.ingest('alpha beta gamma');
    const patterns = engine.flush();
    expect(patterns).toContain('alpha beta');
    expect(patterns).toContain('beta gamma');
  });
});
