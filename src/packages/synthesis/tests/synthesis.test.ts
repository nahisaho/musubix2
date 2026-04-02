import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDSLBuilder,
  createVersionSpaceManager,
  createSynthesisEngine,
  DSLBuilder,
  VersionSpaceManager,
  SynthesisEngine,
} from '../src/index.js';
import type { DSLToken, DSLExpression, VersionSpace } from '../src/index.js';

describe('DES-LRN-005: DSLBuilder', () => {
  let builder: DSLBuilder;

  beforeEach(() => {
    builder = createDSLBuilder();
  });

  it('should create a DSLBuilder via factory', () => {
    expect(builder).toBeInstanceOf(DSLBuilder);
  });

  it('should tokenize keywords', () => {
    const tokens = builder.tokenize('if else return');
    expect(tokens).toHaveLength(3);
    expect(tokens.every(t => t.type === 'keyword')).toBe(true);
    expect(tokens.map(t => t.value)).toEqual(['if', 'else', 'return']);
  });

  it('should tokenize identifiers', () => {
    const tokens = builder.tokenize('foo bar baz');
    expect(tokens).toHaveLength(3);
    expect(tokens.every(t => t.type === 'identifier')).toBe(true);
  });

  it('should tokenize operators', () => {
    const tokens = builder.tokenize('+ - === !=');
    expect(tokens).toHaveLength(4);
    expect(tokens.every(t => t.type === 'operator')).toBe(true);
    expect(tokens[2].value).toBe('===');
    expect(tokens[3].value).toBe('!=');
  });

  it('should tokenize string literals', () => {
    const tokens = builder.tokenize('"hello" \'world\'');
    expect(tokens).toHaveLength(2);
    expect(tokens.every(t => t.type === 'literal')).toBe(true);
    expect(tokens[0].value).toBe('"hello"');
    expect(tokens[1].value).toBe("'world'");
  });

  it('should tokenize number literals', () => {
    const tokens = builder.tokenize('42 3.14');
    expect(tokens).toHaveLength(2);
    expect(tokens.every(t => t.type === 'literal')).toBe(true);
    expect(tokens[0].value).toBe('42');
    expect(tokens[1].value).toBe('3.14');
  });

  it('should tokenize delimiters', () => {
    const tokens = builder.tokenize('( ) { } ;');
    expect(tokens).toHaveLength(5);
    expect(tokens.every(t => t.type === 'delimiter')).toBe(true);
  });

  it('should tokenize a mixed expression', () => {
    const tokens = builder.tokenize('let x = 42;');
    expect(tokens).toHaveLength(5);
    expect(tokens[0]).toEqual({ type: 'keyword', value: 'let' });
    expect(tokens[1]).toEqual({ type: 'identifier', value: 'x' });
    expect(tokens[2]).toEqual({ type: 'operator', value: '=' });
    expect(tokens[3]).toEqual({ type: 'literal', value: '42' });
    expect(tokens[4]).toEqual({ type: 'delimiter', value: ';' });
  });

  it('should parse tokens into a DSLExpression', () => {
    const tokens: DSLToken[] = [
      { type: 'keyword', value: 'let' },
      { type: 'identifier', value: 'x' },
    ];
    const expr = builder.parse(tokens);
    expect(expr.tokens).toHaveLength(2);
    expect(expr.source).toBe('let x');
  });

  it('should build an expression back to a string', () => {
    const tokens = builder.tokenize('let x = 10');
    const expr = builder.parse(tokens);
    const result = builder.build(expr);
    expect(result).toBe('let x = 10');
  });

  it('should handle empty input', () => {
    const tokens = builder.tokenize('');
    expect(tokens).toHaveLength(0);
  });
});

describe('DES-LRN-005: VersionSpaceManager', () => {
  let manager: VersionSpaceManager;

  beforeEach(() => {
    manager = createVersionSpaceManager();
  });

  it('should create a VersionSpaceManager via factory', () => {
    expect(manager).toBeInstanceOf(VersionSpaceManager);
  });

  it('should create a version space', () => {
    const space = manager.create('test');
    expect(space.hypotheses).toEqual([]);
    expect(space.positiveExamples).toEqual([]);
    expect(space.negativeExamples).toEqual([]);
  });

  it('should add positive examples and generate hypotheses', () => {
    manager.create('colors');
    manager.addPositive('colors', 'red apple');
    const hypotheses = manager.getConsistentHypotheses('colors');
    expect(hypotheses.length).toBeGreaterThan(0);
  });

  it('should filter hypotheses inconsistent with negative examples', () => {
    manager.create('fruit');
    manager.addPositive('fruit', 'red apple');
    manager.addNegative('fruit', 'red car');
    const hypotheses = manager.getConsistentHypotheses('fruit');
    // "contains:red" should be removed since negative also contains "red"
    expect(hypotheses.every(h => !h.includes('contains:red'))).toBe(true);
  });

  it('should throw when accessing non-existent space', () => {
    expect(() => manager.addPositive('nonexistent', 'test')).toThrow();
    expect(() => manager.addNegative('nonexistent', 'test')).toThrow();
    expect(() => manager.getConsistentHypotheses('nonexistent')).toThrow();
  });

  it('should return all spaces', () => {
    manager.create('a');
    manager.create('b');
    const spaces = manager.getSpaces();
    expect(spaces.size).toBe(2);
    expect(spaces.has('a')).toBe(true);
    expect(spaces.has('b')).toBe(true);
  });
});

describe('DES-LRN-005: SynthesisEngine', () => {
  let engine: SynthesisEngine;

  beforeEach(() => {
    engine = createSynthesisEngine();
  });

  it('should create a SynthesisEngine via factory', () => {
    expect(engine).toBeInstanceOf(SynthesisEngine);
  });

  it('should synthesize an uppercase rule', () => {
    const rule = engine.synthesize([
      { input: 'hello', output: 'HELLO' },
      { input: 'world', output: 'WORLD' },
    ]);
    expect(rule).toBe('uppercase');
  });

  it('should synthesize a lowercase rule', () => {
    const rule = engine.synthesize([
      { input: 'HELLO', output: 'hello' },
      { input: 'WORLD', output: 'world' },
    ]);
    expect(rule).toBe('lowercase');
  });

  it('should synthesize a reverse rule', () => {
    const rule = engine.synthesize([
      { input: 'abc', output: 'cba' },
      { input: 'xyz', output: 'zyx' },
    ]);
    expect(rule).toBe('reverse');
  });

  it('should synthesize a suffix append rule', () => {
    const rule = engine.synthesize([
      { input: 'file', output: 'file.txt' },
      { input: 'data', output: 'data.txt' },
    ]);
    expect(rule).toBe('addSuffix:.txt');
  });

  it('should verify a correct rule', () => {
    const result = engine.verify('uppercase', [
      { input: 'abc', output: 'ABC' },
      { input: 'def', output: 'DEF' },
    ]);
    expect(result).toBe(true);
  });

  it('should reject an incorrect rule', () => {
    const result = engine.verify('uppercase', [
      { input: 'abc', output: 'xyz' },
    ]);
    expect(result).toBe(false);
  });

  it('should return null when no rule can be synthesized', () => {
    const rule = engine.synthesize([
      { input: 'abc', output: 'xyz' },
      { input: 'def', output: '123' },
    ]);
    expect(rule).toBeNull();
  });

  it('should return null for empty examples', () => {
    expect(engine.synthesize([])).toBeNull();
  });
});
