import { describe, it, expect } from 'vitest';
import {
  StaticAnalyzer,
  QualityMetricsCalculator,
  createStaticAnalyzer,
  createQualityMetricsCalculator,
  type AnalysisResult,
} from '../../src/codegen/static-analyzer.js';

describe('DES-COD-002: StaticAnalyzer', () => {
  it('should calculate cyclomatic complexity', () => {
    const analyzer = new StaticAnalyzer();
    const code = `
function test(x: number) {
  if (x > 0) {
    for (let i = 0; i < x; i++) {
      if (i % 2 === 0 && x > 10) {
        console.log(i);
      }
    }
  } else {
    while (x < 0) { x++; }
  }
}`;
    const complexity = analyzer.calculateComplexity(code);

    // Base 1 + if + for + if + && + while = 6
    expect(complexity).toBeGreaterThanOrEqual(6);
  });

  it('should return a passing score for simple code', () => {
    const analyzer = new StaticAnalyzer();
    const code = `const x = 1;\nconst y = 2;\nconsole.log(x + y);`;
    const result = analyzer.analyze(code);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it('should detect naming issues (snake_case)', () => {
    const analyzer = new StaticAnalyzer();
    const code = `const my_var = 1;\nconst another_one = 2;`;
    const result = analyzer.analyze(code);

    const namingIssues = result.issues.filter(i => i.type === 'naming');
    expect(namingIssues.length).toBeGreaterThanOrEqual(1);
    expect(namingIssues[0].message).toContain('snake_case');
  });

  it('should detect high complexity and add issue', () => {
    const analyzer = new StaticAnalyzer();
    // Generate code with complexity > 10
    const conditions = Array.from({ length: 12 }, (_, i) => `  if (x === ${i}) return ${i};`).join('\n');
    const code = `function complex(x: number) {\n${conditions}\n}`;
    const result = analyzer.analyze(code);

    const complexityIssue = result.issues.find(i => i.type === 'complexity');
    expect(complexityIssue).toBeDefined();
    expect(complexityIssue!.message).toContain('exceeds threshold');
  });

  it('should return metrics array with standard names', () => {
    const analyzer = new StaticAnalyzer();
    const result = analyzer.analyze('const x = 1;');

    const names = result.metrics.map(m => m.name);
    expect(names).toContain('cyclomatic_complexity');
    expect(names).toContain('function_length');
    expect(names).toContain('naming_conventions');
    expect(names).toContain('duplication');
  });

  it('should not flag UPPER_CASE constants as naming issues', () => {
    const analyzer = new StaticAnalyzer();
    const code = `const MAX_SIZE = 100;\nconst API_KEY = 'abc';`;
    const result = analyzer.analyze(code);

    const namingIssues = result.issues.filter(i => i.type === 'naming');
    expect(namingIssues).toHaveLength(0);
  });

  it('should be created by factory function', () => {
    const analyzer = createStaticAnalyzer();
    expect(analyzer).toBeInstanceOf(StaticAnalyzer);
  });
});

describe('DES-COD-002: QualityMetricsCalculator', () => {
  it('should calculate aggregate metrics', () => {
    const calc = new QualityMetricsCalculator();
    const results: AnalysisResult[] = [
      { metrics: [], score: 90, issues: [{ type: 'naming', message: 'bad', severity: 'warning' }] },
      { metrics: [], score: 60, issues: [{ type: 'complexity', message: 'high', severity: 'error' }, { type: 'naming', message: 'bad2', severity: 'warning' }] },
    ];

    const agg = calc.calculate(results);

    expect(agg.averageScore).toBe(75);
    expect(agg.totalIssues).toBe(3);
    expect(agg.worstFile).toBe('file_1');
  });

  it('should handle empty input', () => {
    const calc = new QualityMetricsCalculator();
    const agg = calc.calculate([]);

    expect(agg.averageScore).toBe(100);
    expect(agg.totalIssues).toBe(0);
  });

  it('should be created by factory function', () => {
    const calc = createQualityMetricsCalculator();
    expect(calc).toBeInstanceOf(QualityMetricsCalculator);
  });
});
