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

  it('should extract exported classes and generate describe blocks', () => {
    const gen = new UnitTestGenerator();
    const source = `export class MyService {\n  run() {}\n}`;
    const suite = gen.generate(source, 'unit');
    expect(suite.testCount).toBe(1);
    expect(suite.code).toContain("describe('MyService'");
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
