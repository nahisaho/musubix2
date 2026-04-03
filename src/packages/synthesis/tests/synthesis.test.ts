import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDSLBuilder,
  createVersionSpaceManager,
  createSynthesisEngine,
  DSLBuilder,
  VersionSpaceManager,
  SynthesisEngine,
} from '../src/index.js';
import type { DSLToken, DSLExpression, VersionSpace, TransformStep } from '../src/index.js';

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

// ========== NEW TESTS ==========

describe('DES-LRN-005: DSLBuilder Transformation Pipeline', () => {
  let builder: DSLBuilder;

  beforeEach(() => {
    builder = createDSLBuilder();
  });

  it('should chain toUpperCase and execute', () => {
    const result = builder.toUpperCase().execute('hello');
    expect(result).toBe('HELLO');
  });

  it('should chain multiple transformations', () => {
    const result = builder.trim().toUpperCase().execute('  hello  ');
    expect(result).toBe('HELLO');
  });

  it('should execute substring transformation', () => {
    const result = builder.substring(0, 5).execute('hello world');
    expect(result).toBe('hello');
  });

  it('should execute substring without end', () => {
    const result = builder.substring(6).execute('hello world');
    expect(result).toBe('world');
  });

  it('should execute split transformation', () => {
    const result = builder.split(',', 1).execute('a,b,c');
    expect(result).toBe('b');
  });

  it('should return empty string for out-of-range split index', () => {
    const result = builder.split(',', 10).execute('a,b');
    expect(result).toBe('');
  });

  it('should execute join transformation', () => {
    const result = builder.join(['b', 'c'], '-').execute('a');
    expect(result).toBe('a-b-c');
  });

  it('should execute conditionalReplace when condition is true', () => {
    const result = builder
      .conditionalReplace('o', '0', (s) => s.includes('hello'))
      .execute('hello world');
    expect(result).toBe('hell0 w0rld');
  });

  it('should skip conditionalReplace when condition is false', () => {
    const result = builder
      .conditionalReplace('o', '0', (s) => s.includes('xyz'))
      .execute('hello world');
    expect(result).toBe('hello world');
  });

  it('should execute repeat transformation', () => {
    const result = builder.repeat(3).execute('ab');
    expect(result).toBe('ababab');
  });

  it('should execute pad left', () => {
    const result = builder.pad(5, '0', 'left').execute('42');
    expect(result).toBe('00042');
  });

  it('should execute pad right', () => {
    const result = builder.pad(5, '.', 'right').execute('hi');
    expect(result).toBe('hi...');
  });

  it('should not pad if already long enough', () => {
    const result = builder.pad(3, '0', 'left').execute('hello');
    expect(result).toBe('hello');
  });

  it('should execute trim transformation', () => {
    const result = builder.trim().execute('  spaced  ');
    expect(result).toBe('spaced');
  });

  it('should execute capitalize transformation', () => {
    const result = builder.capitalize().execute('hELLO');
    expect(result).toBe('Hello');
  });

  it('should handle capitalize on empty string', () => {
    const result = builder.capitalize().execute('');
    expect(result).toBe('');
  });

  it('should execute camelCase transformation', () => {
    const result = builder.camelCase().execute('hello world foo');
    expect(result).toBe('helloWorldFoo');
  });

  it('should execute camelCase with special chars', () => {
    const result = builder.camelCase().execute('get-user-name');
    expect(result).toBe('getUserName');
  });

  it('should execute snakeCase transformation', () => {
    const result = builder.snakeCase().execute('hello world');
    expect(result).toBe('hello_world');
  });

  it('should execute snakeCase from camelCase', () => {
    const result = builder.snakeCase().execute('getUserName');
    expect(result).toBe('get_user_name');
  });

  it('should execute regexReplace transformation', () => {
    const result = builder.regexReplace(/\d+/g, '#').execute('abc123def456');
    expect(result).toBe('abc#def#');
  });

  it('should execute prefixRemove transformation', () => {
    const result = builder.prefixRemove('pre_').execute('pre_data');
    expect(result).toBe('data');
  });

  it('should execute suffixAppend transformation', () => {
    const result = builder.suffixAppend('.txt').execute('file');
    expect(result).toBe('file.txt');
  });

  it('should execute replace transformation', () => {
    const result = builder.replace('a', 'o').execute('cat');
    expect(result).toBe('cot');
  });

  it('should execute reverse transformation', () => {
    const result = builder.reverse().execute('abc');
    expect(result).toBe('cba');
  });

  it('should execute toLowerCase transformation', () => {
    const result = builder.toLowerCase().execute('ABC');
    expect(result).toBe('abc');
  });

  it('should return pipeline steps', () => {
    builder.trim().toUpperCase();
    const pipeline = builder.getPipeline();
    expect(pipeline).toHaveLength(2);
    expect(pipeline[0].type).toBe('trim');
    expect(pipeline[1].type).toBe('toUpperCase');
  });

  it('should clear pipeline', () => {
    builder.trim().toUpperCase();
    builder.clearPipeline();
    expect(builder.getPipeline()).toHaveLength(0);
    expect(builder.execute('hello')).toBe('hello');
  });

  it('should chain 4+ transformations', () => {
    const result = builder
      .trim()
      .toLowerCase()
      .replace(' ', '-')
      .suffixAppend('.html')
      .execute('  Hello World  ');
    expect(result).toBe('hello-world.html');
  });
});

describe('DES-LRN-005: VersionSpaceManager Extended', () => {
  let manager: VersionSpaceManager;

  beforeEach(() => {
    manager = createVersionSpaceManager();
  });

  it('should report confidence of 0 for empty space', () => {
    manager.create('empty');
    expect(manager.getConfidence('empty')).toBe(0);
  });

  it('should increase confidence with more examples and pruning', () => {
    manager.create('test');
    manager.addPositive('test', 'Apple fruit');
    const conf1 = manager.getConfidence('test');

    manager.addPositive('test', 'Apple pie');
    manager.addNegative('test', 'Banana split');
    manager.addNegative('test', 'Cherry cake');
    const conf2 = manager.getConfidence('test');

    expect(conf2).toBeGreaterThan(conf1);
  });

  it('should prune inconsistent hypotheses', () => {
    manager.create('prune-test');
    manager.addPositive('prune-test', 'red apple');
    manager.addNegative('prune-test', 'red car');

    const before = manager.getVersionSpaceSize('prune-test');
    expect(before.inconsistent).toBeGreaterThan(0);

    const pruned = manager.prune('prune-test');
    expect(pruned.length).toBeGreaterThan(0);

    const after = manager.getVersionSpaceSize('prune-test');
    expect(after.inconsistent).toBe(0);
    expect(after.total).toBe(after.consistent);
  });

  it('should report version space size', () => {
    manager.create('size-test');
    manager.addPositive('size-test', 'hello world');
    const size = manager.getVersionSpaceSize('size-test');
    expect(size.total).toBeGreaterThan(0);
    expect(size.consistent).toBeGreaterThan(0);
  });

  it('should throw on getConfidence for non-existent space', () => {
    expect(() => manager.getConfidence('nope')).toThrow();
  });

  it('should throw on prune for non-existent space', () => {
    expect(() => manager.prune('nope')).toThrow();
  });

  it('should throw on getVersionSpaceSize for non-existent space', () => {
    expect(() => manager.getVersionSpaceSize('nope')).toThrow();
  });

  it('should generate pattern-based hypotheses', () => {
    manager.create('patterns');
    manager.addPositive('patterns', 'Hello');
    manager.addPositive('patterns', 'World');
    const hypotheses = manager.getConsistentHypotheses('patterns');
    expect(hypotheses.some(h => h.startsWith('pattern:'))).toBe(true);
  });

  it('should filter pattern hypotheses with negatives', () => {
    manager.create('pfilter');
    manager.addPositive('pfilter', 'Hello123');
    manager.addNegative('pfilter', 'Hello');
    const hypotheses = manager.getConsistentHypotheses('pfilter');
    // containsDigit should be consistent (positive has digit, negative doesn't)
    expect(hypotheses).toContain('pattern:containsDigit');
  });
});

describe('DES-LRN-005: SynthesisEngine Extended', () => {
  let engine: SynthesisEngine;

  beforeEach(() => {
    engine = createSynthesisEngine();
  });

  it('should synthesize trim rule', () => {
    const rule = engine.synthesize([
      { input: '  hello  ', output: 'hello' },
      { input: ' world ', output: 'world' },
    ]);
    expect(rule).toBe('trim');
  });

  it('should synthesize capitalize rule', () => {
    const rule = engine.synthesize([
      { input: 'hELLO', output: 'Hello' },
      { input: 'wORLD', output: 'World' },
    ]);
    expect(rule).toBe('capitalize');
  });

  it('should synthesize camelCase rule', () => {
    const rule = engine.synthesize([
      { input: 'hello world', output: 'helloWorld' },
      { input: 'foo bar baz', output: 'fooBarBaz' },
    ]);
    expect(rule).toBe('camelCase');
  });

  it('should synthesize snakeCase rule', () => {
    const rule = engine.synthesize([
      { input: 'helloWorld', output: 'hello_world' },
      { input: 'fooBar', output: 'foo_bar' },
    ]);
    expect(rule).toBe('snakeCase');
  });

  it('should synthesize substring rule', () => {
    const rule = engine.synthesize([
      { input: 'hello world', output: 'hello' },
      { input: 'great world', output: 'great' },
    ]);
    expect(rule).not.toBeNull();
    expect(engine.verify(rule!, [
      { input: 'hello world', output: 'hello' },
      { input: 'great world', output: 'great' },
    ])).toBe(true);
  });

  it('should synthesize repeat rule', () => {
    const rule = engine.synthesize([
      { input: 'ab', output: 'ababab' },
      { input: 'cd', output: 'cdcdcd' },
    ]);
    expect(rule).toBe('repeat:3');
  });

  it('should synthesize compositional rules (two-step)', () => {
    const rule = engine.synthesize([
      { input: '  HELLO  ', output: '  hello  ' },
      { input: '  WORLD  ', output: '  world  ' },
    ]);
    // Should find lowercase (which handles it directly)
    expect(rule).not.toBeNull();
    expect(engine.verify(rule!, [
      { input: '  HELLO  ', output: '  hello  ' },
    ])).toBe(true);
  });

  it('should verify composite pipe rules', () => {
    expect(engine.verify('trim |> uppercase', [
      { input: '  hello  ', output: 'HELLO' },
    ])).toBe(true);
  });

  it('should verify conditional rules', () => {
    const rule = 'conditional:isUpperCase=>lowercase;default=>uppercase';
    expect(engine.verify(rule, [
      { input: 'HELLO', output: 'hello' },
      { input: 'world', output: 'WORLD' },
    ])).toBe(true);
  });

  it('should apply pad rule', () => {
    expect(engine.applyRule('pad:5,0,left', '42')).toBe('00042');
    expect(engine.applyRule('pad:5,.,right', 'hi')).toBe('hi...');
  });

  it('should apply split rule', () => {
    expect(engine.applyRule('split:,,1', 'a,b,c')).toBe('b');
  });

  it('should apply substring rule', () => {
    expect(engine.applyRule('substring:0,5', 'hello world')).toBe('hello');
    expect(engine.applyRule('substring:6', 'hello world')).toBe('world');
  });

  it('should apply repeat rule', () => {
    expect(engine.applyRule('repeat:3', 'ab')).toBe('ababab');
  });

  it('should apply camelCase rule', () => {
    expect(engine.applyRule('camelCase', 'hello world')).toBe('helloWorld');
  });

  it('should apply snakeCase rule', () => {
    expect(engine.applyRule('snakeCase', 'helloWorld')).toBe('hello_world');
  });

  it('should apply trim rule', () => {
    expect(engine.applyRule('trim', '  hi  ')).toBe('hi');
  });

  it('should apply capitalize rule', () => {
    expect(engine.applyRule('capitalize', 'hELLO')).toBe('Hello');
  });

  it('should generalizePattern from multiple examples', () => {
    const rule = engine.generalizePattern([
      { input: 'hello', output: 'HELLO' },
      { input: 'world', output: 'WORLD' },
      { input: 'test', output: 'TEST' },
    ]);
    expect(rule).toBe('uppercase');
  });

  it('should generalizePattern returns null when no pattern found', () => {
    const rule = engine.generalizePattern([
      { input: 'abc', output: 'xyz' },
      { input: 'def', output: '123' },
      { input: 'ghi', output: '!@#' },
    ]);
    expect(rule).toBeNull();
  });

  it('should generalizePattern with single example falls back to synthesize', () => {
    const rule = engine.generalizePattern([
      { input: 'hello', output: 'HELLO' },
    ]);
    expect(rule).toBe('uppercase');
  });

  it('should synthesize conditional rule for mixed transforms', () => {
    const rule = engine.synthesize([
      { input: 'HELLO', output: 'hello' },
      { input: 'WORLD', output: 'world' },
      { input: 'test', output: 'TEST' },
      { input: 'foo', output: 'FOO' },
    ]);
    expect(rule).not.toBeNull();
    if (rule) {
      expect(engine.verify(rule, [
        { input: 'HELLO', output: 'hello' },
        { input: 'WORLD', output: 'world' },
        { input: 'test', output: 'TEST' },
        { input: 'foo', output: 'FOO' },
      ])).toBe(true);
    }
  });

  it('should handle conditional rules with startsWith condition', () => {
    const rule = 'conditional:startsWith:pre_=>uppercase;default=>lowercase';
    expect(engine.applyRule(rule, 'pre_data')).toBe('PRE_DATA');
    expect(engine.applyRule(rule, 'other')).toBe('other');
  });

  it('should handle conditional rules with contains condition', () => {
    const rule = 'conditional:contains:@=>lowercase;default=>uppercase';
    expect(engine.applyRule(rule, 'User@Email')).toBe('user@email');
    expect(engine.applyRule(rule, 'USERNAME')).toBe('USERNAME');
  });

  it('should handle conditional rules with lengthGreaterThan condition', () => {
    const rule = 'conditional:lengthGreaterThan:5=>uppercase;default=>lowercase';
    expect(engine.applyRule(rule, 'Hello World')).toBe('HELLO WORLD');
    expect(engine.applyRule(rule, 'Hi')).toBe('hi');
  });
});
