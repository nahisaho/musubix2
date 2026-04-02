import { describe, it, expect } from 'vitest';
import {
  TestPlacementValidator,
  createTestPlacementValidator,
} from '../src/index.js';
import type { TestPlacementRule } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_RULE: TestPlacementRule = {
  sourcePattern: 'src/**/*.ts',
  testPattern: 'tests/{name}.test.ts',
  required: true,
};

// ---------------------------------------------------------------------------
// DES-CG-003: TestPlacementValidator
// ---------------------------------------------------------------------------

describe('DES-CG-003: TestPlacementValidator', () => {
  it('should report full coverage when all sources have tests', () => {
    const validator = new TestPlacementValidator();
    const sources = ['src/foo.ts', 'src/bar.ts'];
    const tests = ['tests/foo.test.ts', 'tests/bar.test.ts'];

    const report = validator.validate(sources, tests, [DEFAULT_RULE]);

    expect(report.totalSources).toBe(2);
    expect(report.coveredSources).toBe(2);
    expect(report.missingTests).toHaveLength(0);
    expect(report.coveragePercent).toBe(100);
  });

  it('should detect missing tests for required rules', () => {
    const validator = new TestPlacementValidator();
    const sources = ['src/foo.ts', 'src/bar.ts'];
    const tests = ['tests/foo.test.ts'];

    const report = validator.validate(sources, tests, [DEFAULT_RULE]);

    expect(report.missingTests).toHaveLength(1);
    expect(report.missingTests[0].sourcePath).toBe('src/bar.ts');
    expect(report.missingTests[0].expectedTestPath).toBe('tests/bar.test.ts');
    expect(report.coveredSources).toBe(1);
  });

  it('should identify orphaned test files', () => {
    const validator = new TestPlacementValidator();
    const sources = ['src/foo.ts'];
    const tests = ['tests/foo.test.ts', 'tests/old-stuff.test.ts'];

    const report = validator.validate(sources, tests, [DEFAULT_RULE]);

    expect(report.orphanedTests).toHaveLength(1);
    expect(report.orphanedTests[0]).toBe('tests/old-stuff.test.ts');
  });

  it('should calculate correct coverage percentage', () => {
    const validator = new TestPlacementValidator();
    const sources = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'];
    const tests = ['tests/a.test.ts', 'tests/c.test.ts', 'tests/d.test.ts'];

    const report = validator.validate(sources, tests, [DEFAULT_RULE]);

    expect(report.totalSources).toBe(4);
    expect(report.coveredSources).toBe(3);
    expect(report.coveragePercent).toBe(75);
  });

  it('should handle empty source list with 100% coverage', () => {
    const validator = new TestPlacementValidator();

    const report = validator.validate([], ['tests/orphan.test.ts'], [DEFAULT_RULE]);

    expect(report.totalSources).toBe(0);
    expect(report.coveredSources).toBe(0);
    expect(report.missingTests).toHaveLength(0);
    expect(report.coveragePercent).toBe(100);
    expect(report.orphanedTests).toHaveLength(1);
  });

  it('should only enforce required rules', () => {
    const validator = new TestPlacementValidator();
    const optionalRule: TestPlacementRule = {
      sourcePattern: 'src/**/*.ts',
      testPattern: 'tests/{name}.test.ts',
      required: false,
    };
    const sources = ['src/foo.ts', 'src/bar.ts'];
    const tests: string[] = [];

    const report = validator.validate(sources, tests, [optionalRule]);

    // Non-required rules should not generate missing test entries
    expect(report.missingTests).toHaveLength(0);
    expect(report.coveredSources).toBe(2);
    expect(report.coveragePercent).toBe(100);
  });

  it('should match glob patterns correctly (** and *)', () => {
    const validator = new TestPlacementValidator();
    const deepRule: TestPlacementRule = {
      sourcePattern: 'src/**/*.ts',
      testPattern: 'tests/{name}.test.ts',
      required: true,
    };
    const shallowRule: TestPlacementRule = {
      sourcePattern: 'lib/*.ts',
      testPattern: 'tests/{name}.test.ts',
      required: true,
    };

    // ** should match nested paths
    const deepSources = ['src/deep/nested/util.ts'];
    const deepTests = ['tests/util.test.ts'];
    const deepReport = validator.validate(deepSources, deepTests, [deepRule]);
    expect(deepReport.missingTests).toHaveLength(0);

    // * should NOT match nested paths
    const shallowSources = ['lib/deep/nested/util.ts'];
    const shallowTests = ['tests/util.test.ts'];
    const shallowReport = validator.validate(shallowSources, shallowTests, [shallowRule]);
    // The source doesn't match the shallow pattern, so no rule applies and no missing test
    expect(shallowReport.missingTests).toHaveLength(0);
    // But the test is orphaned since no source matched
    expect(shallowReport.orphanedTests).toHaveLength(1);
  });

  it('should create an instance via factory function', () => {
    const validator = createTestPlacementValidator();
    expect(validator).toBeInstanceOf(TestPlacementValidator);
  });
});
