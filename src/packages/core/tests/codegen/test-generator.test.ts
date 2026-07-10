import { describe, it, expect } from 'vitest';
import {
  UnitTestGenerator,
  CoverageReporter,
  createUnitTestGenerator,
  createCoverageReporter,
} from '../../src/codegen/test-generator.js';

describe('DES-COD-005: UnitTestGenerator', () => {
  it('should create UnitTestGenerator via factory', () => {
    const gen = createUnitTestGenerator();
    expect(gen).toBeInstanceOf(UnitTestGenerator);
  });

  it('should create CoverageReporter via factory', () => {
    const reporter = createCoverageReporter();
    expect(reporter).toBeInstanceOf(CoverageReporter);
  });

  it('should extract exported functions and generate describe blocks', () => {
    const gen = new UnitTestGenerator();
    const source = `
export function parseConfig(path: string): Config {
  return {};
}
export function validateInput(input: unknown): boolean {
  return true;
}`;

    const suite = gen.generate(source, 'unit');
    expect(suite.style).toBe('unit');
    expect(suite.testCount).toBe(2);
    expect(suite.code).toContain("describe('parseConfig'");
    expect(suite.code).toContain("describe('validateInput'");
  });

  it('should extract exported classes and generate a test per public method', () => {
    const gen = new UnitTestGenerator();
    const source = `export class MyService {\n  run() {}\n  private helper() {}\n}`;
    const suite = gen.generate(source, 'unit');
    // instantiable + run(); private helper() is excluded (v0.5.44).
    expect(suite.testCount).toBe(2);
    expect(suite.code).toContain("describe('MyService'");
    expect(suite.code).toContain("it('run() should work'");
    expect(suite.code).not.toContain('helper()');
  });

  it('should exclude protected methods and dedupe getter/setter pairs', () => {
    const gen = new UnitTestGenerator();
    const source = [
      'export class Repo {',
      '  get size() { return 0; }',
      '  set size(v) {}', // same name as the getter → deduped
      '  protected reset() {}', // protected → excluded
      '  save() {}',
      '}',
    ].join('\n');
    const suite = gen.generate(source, 'unit');
    // instantiable + size + save; the setter is deduped and protected excluded.
    expect(suite.code).toContain("it('size() should work'");
    expect(suite.code).toContain("it('save() should work'");
    expect(suite.code).not.toContain('reset()');
    expect(suite.testCount).toBe(3);
  });

  it('should report 100% coverage when the total is zero', () => {
    const reporter = new CoverageReporter();
    const report = reporter.formatReport(0, 0);
    expect(report).toContain('100%');
  });

  it('should generate fallback test for empty source', () => {
    const gen = new UnitTestGenerator();
    const suite = gen.generate('const x = 1;', 'integration');
    expect(suite.testCount).toBe(1);
    expect(suite.code).toContain("describe('module'");
    expect(suite.style).toBe('integration');
  });

  it('should generate test cases for a function', () => {
    const gen = new UnitTestGenerator();
    const cases = gen.generateForFunction('add', ['a', 'b'], 'number');
    expect(cases.length).toBeGreaterThanOrEqual(2);
    expect(cases[0].name).toContain('add');
    expect(cases[0].act).toContain('add(a, b)');
    expect(cases[0].assert).toContain('expect');
  });

  it('should format a coverage report as markdown', () => {
    const reporter = new CoverageReporter();
    const report = reporter.formatReport(80, 100, [10, 20, 30]);
    expect(report).toContain('## Coverage Report');
    expect(report).toContain('80%');
    expect(report).toContain('Uncovered Lines');
    expect(report).toContain('10, 20, 30');
  });
});
