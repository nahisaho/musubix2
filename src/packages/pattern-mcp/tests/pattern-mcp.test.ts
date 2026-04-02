import { describe, it, expect, beforeEach } from 'vitest';
import {
  PatternLibrary,
  ASTPatternExtractor,
  PatternMCPServer,
  createPatternLibrary,
  createASTPatternExtractor,
  createPatternMCPServer,
} from '../src/index.js';
import type { ExtractedPattern, ASTPatternType } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePattern(overrides: Partial<ExtractedPattern> = {}): ExtractedPattern {
  return {
    type: 'function-call',
    name: 'test',
    location: { line: 1, column: 1 },
    frequency: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DES-LRN-006: PatternLibrary
// ---------------------------------------------------------------------------

describe('DES-LRN-006: PatternLibrary', () => {
  let lib: PatternLibrary;

  beforeEach(() => {
    lib = createPatternLibrary();
  });

  it('should start empty', () => {
    expect(lib.size()).toBe(0);
  });

  it('should add patterns and report size', () => {
    lib.add(makePattern({ name: 'foo' }));
    lib.add(makePattern({ name: 'bar' }));
    expect(lib.size()).toBe(2);
  });

  it('should filter by type', () => {
    lib.add(makePattern({ type: 'function-call', name: 'fn1' }));
    lib.add(makePattern({ type: 'class-definition', name: 'Cls1' }));
    lib.add(makePattern({ type: 'function-call', name: 'fn2' }));
    expect(lib.getByType('function-call')).toHaveLength(2);
    expect(lib.getByType('class-definition')).toHaveLength(1);
  });

  it('should return most frequent patterns', () => {
    lib.add(makePattern({ name: 'low', frequency: 1 }));
    lib.add(makePattern({ name: 'high', frequency: 10 }));
    lib.add(makePattern({ name: 'mid', frequency: 5 }));
    const top = lib.getMostFrequent(2);
    expect(top).toHaveLength(2);
    expect(top[0].name).toBe('high');
    expect(top[1].name).toBe('mid');
  });

  it('should search by name substring', () => {
    lib.add(makePattern({ name: 'fetchData' }));
    lib.add(makePattern({ name: 'processData' }));
    lib.add(makePattern({ name: 'sendMail' }));
    const results = lib.search('Data');
    expect(results).toHaveLength(2);
  });

  it('should search case-insensitively', () => {
    lib.add(makePattern({ name: 'MyFunction' }));
    expect(lib.search('myfunction')).toHaveLength(1);
  });

  it('should clear all patterns', () => {
    lib.add(makePattern());
    lib.add(makePattern());
    lib.clear();
    expect(lib.size()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-006: ASTPatternExtractor
// ---------------------------------------------------------------------------

describe('DES-LRN-006: ASTPatternExtractor', () => {
  let extractor: ASTPatternExtractor;

  beforeEach(() => {
    extractor = createASTPatternExtractor();
  });

  it('should extract function calls', () => {
    const patterns = extractor.extract('fetchData(url)');
    expect(patterns.some((p) => p.type === 'function-call' && p.name === 'fetchData')).toBe(true);
  });

  it('should extract class definitions', () => {
    const patterns = extractor.extract('class UserService extends Base {}');
    expect(patterns.some((p) => p.type === 'class-definition' && p.name === 'UserService')).toBe(true);
  });

  it('should extract import statements', () => {
    const patterns = extractor.extract("import { foo } from './bar.js'");
    expect(patterns.some((p) => p.type === 'import-statement')).toBe(true);
  });

  it('should extract error handling (try/catch)', () => {
    const code = `try {\n  doSomething();\n} catch (e) {\n  handleError(e);\n}`;
    const patterns = extractor.extract(code);
    expect(patterns.some((p) => p.type === 'error-handling')).toBe(true);
  });

  it('should extract loops', () => {
    const code = 'for (let i = 0; i < 10; i++) {}\nwhile (true) {}';
    const patterns = extractor.extract(code);
    const loops = patterns.filter((p) => p.type === 'loop');
    expect(loops).toHaveLength(2);
  });

  it('should extract conditionals', () => {
    const patterns = extractor.extract('if (x > 0) { return true; }');
    expect(patterns.some((p) => p.type === 'conditional')).toBe(true);
  });

  it('should include correct line/column locations', () => {
    const code = 'line1\nfetchData(x)';
    const patterns = extractor.extract(code);
    const fn = patterns.find((p) => p.name === 'fetchData');
    expect(fn).toBeDefined();
    expect(fn!.location.line).toBe(2);
  });

  it('should handle code with no patterns', () => {
    const patterns = extractor.extract('// just a comment');
    // May or may not extract anything, but should not throw
    expect(Array.isArray(patterns)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-006: PatternMCPServer
// ---------------------------------------------------------------------------

describe('DES-LRN-006: PatternMCPServer', () => {
  let server: PatternMCPServer;

  beforeEach(() => {
    server = createPatternMCPServer();
  });

  it('should register tools', () => {
    const tools = server.registerTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.some((t) => t.name === 'pattern_extract')).toBe(true);
    expect(tools.some((t) => t.name === 'pattern_search')).toBe(true);
  });

  it('should handle pattern_extract tool', () => {
    const result = server.handleTool('pattern_extract', { code: 'class Foo {}' });
    expect(Array.isArray(result)).toBe(true);
    expect((result as ExtractedPattern[]).some((p) => p.name === 'Foo')).toBe(true);
  });

  it('should handle pattern_search tool after extract', () => {
    server.handleTool('pattern_extract', { code: 'fetchData(url)\nprocessData(x)' });
    const result = server.handleTool('pattern_search', { query: 'fetch' });
    expect(Array.isArray(result)).toBe(true);
    expect((result as ExtractedPattern[]).length).toBeGreaterThan(0);
  });

  it('should handle pattern_clear tool', () => {
    server.handleTool('pattern_extract', { code: 'foo()' });
    server.handleTool('pattern_clear', {});
    const result = server.handleTool('pattern_search', { query: 'foo' });
    expect((result as ExtractedPattern[])).toHaveLength(0);
  });

  it('should throw on unknown tool', () => {
    expect(() => server.handleTool('nonexistent', {})).toThrow('Unknown tool');
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-006: Factory functions
// ---------------------------------------------------------------------------

describe('DES-LRN-006: Factory functions', () => {
  it('should create PatternLibrary via factory', () => {
    expect(createPatternLibrary()).toBeInstanceOf(PatternLibrary);
  });

  it('should create ASTPatternExtractor via factory', () => {
    expect(createASTPatternExtractor()).toBeInstanceOf(ASTPatternExtractor);
  });

  it('should create PatternMCPServer via factory', () => {
    expect(createPatternMCPServer()).toBeInstanceOf(PatternMCPServer);
  });
});
