import { describe, it, expect, beforeEach } from 'vitest';
import {
  EGraphEngine,
  LibraryLearner,
  createEGraphEngine,
  createLibraryLearner,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// DES-LRN-003: EGraphEngine
// ---------------------------------------------------------------------------

describe('DES-LRN-003: EGraphEngine', () => {
  let engine: EGraphEngine;

  beforeEach(() => {
    engine = createEGraphEngine();
  });

  it('should add a node and report size', () => {
    engine.add('x');
    expect(engine.size()).toBe(1);
  });

  it('should add multiple nodes', () => {
    engine.add('a');
    engine.add('b');
    engine.add('c');
    expect(engine.size()).toBe(3);
  });

  it('should find returns the node itself when not merged', () => {
    const id = engine.add('x');
    expect(engine.find(id)).toBe(id);
  });

  it('should merge two classes into one', () => {
    const a = engine.add('x');
    const b = engine.add('y');
    expect(engine.size()).toBe(2);
    engine.merge(a, b);
    expect(engine.size()).toBe(1);
  });

  it('should have same representative after merge', () => {
    const a = engine.add('x');
    const b = engine.add('y');
    engine.merge(a, b);
    expect(engine.find(a)).toBe(engine.find(b));
  });

  it('should combine nodes in merged class', () => {
    const a = engine.add('x');
    const b = engine.add('y');
    engine.merge(a, b);
    const cls = engine.getClass(a);
    expect(cls).toHaveLength(2);
    expect(cls.map((n) => n.data).sort()).toEqual(['x', 'y']);
  });

  it('should handle transitive merges', () => {
    const a = engine.add('a');
    const b = engine.add('b');
    const c = engine.add('c');
    engine.merge(a, b);
    engine.merge(b, c);
    expect(engine.size()).toBe(1);
    expect(engine.find(a)).toBe(engine.find(c));
  });

  it('should merge idempotently', () => {
    const a = engine.add('x');
    const b = engine.add('y');
    engine.merge(a, b);
    engine.merge(a, b);
    expect(engine.size()).toBe(1);
  });

  it('should add nodes with children', () => {
    const child = engine.add('leaf');
    const parent = engine.add('+', [child]);
    const cls = engine.getClass(parent);
    expect(cls[0].children).toContain(child);
  });

  it('should return empty array for non-existent class', () => {
    expect(engine.getClass('nonexistent')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-003: LibraryLearner
// ---------------------------------------------------------------------------

describe('DES-LRN-003: LibraryLearner', () => {
  let learner: LibraryLearner;

  beforeEach(() => {
    learner = createLibraryLearner();
  });

  it('should start with no patterns', () => {
    expect(learner.getPatterns()).toHaveLength(0);
  });

  it('should extract function signatures from code', () => {
    const patterns = learner.learn([
      'function fetchData(url) { return fetch(url); }',
      'function processData(data) { return data; }',
    ]);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some((p) => p.name === 'fetchData')).toBe(true);
    expect(patterns.some((p) => p.name === 'processData')).toBe(true);
  });

  it('should count frequency of repeated patterns', () => {
    const patterns = learner.learn([
      'function handle(req) {}',
      'function handle(req, res) {}',
    ]);
    const handlePattern = patterns.find((p) => p.name === 'handle');
    expect(handlePattern).toBeDefined();
    expect(handlePattern!.frequency).toBe(2);
  });

  it('should accumulate patterns across learn calls', () => {
    learner.learn(['function a() {}']);
    learner.learn(['function b() {}']);
    expect(learner.getPatterns().length).toBeGreaterThanOrEqual(2);
  });

  it('should suggest patterns matching code', () => {
    learner.learn([
      'function validate(x) {}',
      'function transform(x) {}',
    ]);
    const suggestions = learner.suggest('validate input data');
    expect(suggestions.some((p) => p.name === 'validate')).toBe(true);
    expect(suggestions.some((p) => p.name === 'transform')).toBe(false);
  });

  it('should return empty suggestions for unrelated code', () => {
    learner.learn(['function foo() {}']);
    const suggestions = learner.suggest('bar baz qux');
    expect(suggestions).toHaveLength(0);
  });

  it('should extract arrow function patterns', () => {
    const patterns = learner.learn([
      'const doWork = async (x) => x * 2;',
    ]);
    expect(patterns.some((p) => p.name === 'doWork')).toBe(true);
  });

  it('should include examples in learned patterns', () => {
    const patterns = learner.learn([
      'function render(view) { return view; }',
    ]);
    const renderP = patterns.find((p) => p.name === 'render');
    expect(renderP).toBeDefined();
    expect(renderP!.examples.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-003: Factory functions
// ---------------------------------------------------------------------------

describe('DES-LRN-003: Factory functions', () => {
  it('should create EGraphEngine via factory', () => {
    expect(createEGraphEngine()).toBeInstanceOf(EGraphEngine);
  });

  it('should create LibraryLearner via factory', () => {
    expect(createLibraryLearner()).toBeInstanceOf(LibraryLearner);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-003: LibraryLearner — E-graph integration
// ---------------------------------------------------------------------------

describe('DES-LRN-003: LibraryLearner — E-graph integration', () => {
  let learner: LibraryLearner;

  beforeEach(() => {
    learner = createLibraryLearner();
  });

  it('should populate e-graph when learning code', () => {
    learner.learn([
      'function fetchData(url) { return fetch(url); }',
      'function processData(data) { return data; }',
    ]);
    const egraph = learner.getEGraph();
    expect(egraph.size()).toBeGreaterThan(0);
  });

  it('should merge structurally similar functions (same arity) into e-classes', () => {
    learner.learn([
      'function fetchData(url) { return fetch(url); }',
      'function loadData(url) { return load(url); }',
      'function processAll(items, config) { return items; }',
    ]);
    const egraph = learner.getEGraph();
    // fetchData/1 and loadData/1 share "Data" substring and arity 1
    // so they should be merged, reducing total classes
    expect(egraph.size()).toBeLessThan(3);
  });

  it('should not merge functions with different arities', () => {
    learner.learn([
      'function singleArg(x) { return x; }',
      'function doubleArg(x, y) { return x + y; }',
    ]);
    const egraph = learner.getEGraph();
    // Different arities → no merge
    expect(egraph.size()).toBe(2);
  });

  it('should suggest patterns using structural matching', () => {
    learner.learn([
      'function validate(input) { return input; }',
      'function transform(input) { return input; }',
    ]);
    const suggestions = learner.suggest('function validate(x) { check(x); }');
    expect(suggestions.some((p) => p.name === 'validate')).toBe(true);
  });

  it('should track frequency correctly when same function appears multiple times', () => {
    const patterns = learner.learn([
      'function handle(req) { process(req); }',
      'function handle(req, res) { respond(req, res); }',
      'function handle(req) { route(req); }',
    ]);
    const handlePattern = patterns.find((p) => p.name === 'handle');
    expect(handlePattern).toBeDefined();
    // handle appears in 3 snippets but with different arities,
    // the regex picks up 'handle' in each, so count >= 2
    expect(handlePattern!.frequency).toBeGreaterThanOrEqual(2);
  });

  it('should expose getEGraph method', () => {
    expect(typeof learner.getEGraph).toBe('function');
    expect(learner.getEGraph()).toBeInstanceOf(EGraphEngine);
  });
});
