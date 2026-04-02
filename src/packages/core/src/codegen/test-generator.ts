/**
 * Unit Test Generator — DES-COD-005
 *
 * ソースコードからVitest形式のテストファイルを自動生成。
 */

export type TestStyle = 'unit' | 'integration' | 'e2e';

export interface TestCase {
  name: string;
  description: string;
  arrange: string;
  act: string;
  assert: string;
}

export interface GeneratedTestSuite {
  filePath: string;
  code: string;
  testCount: number;
  style: TestStyle;
}

const EXPORT_FUNCTION_RE = /export\s+(?:async\s+)?function\s+(\w+)/g;
const EXPORT_CLASS_RE = /export\s+class\s+(\w+)/g;

export class UnitTestGenerator {
  generate(sourceCode: string, style: TestStyle): GeneratedTestSuite {
    const functions = this.extractNames(sourceCode, EXPORT_FUNCTION_RE);
    const classes = this.extractNames(sourceCode, EXPORT_CLASS_RE);

    const describeBlocks: string[] = [];

    for (const cls of classes) {
      describeBlocks.push(
        `describe('${cls}', () => {\n  it('should be instantiable', () => {\n    // TODO: implement\n    expect(true).toBe(true);\n  });\n});`,
      );
    }

    for (const fn of functions) {
      describeBlocks.push(
        `describe('${fn}', () => {\n  it('should work correctly', () => {\n    // TODO: implement\n    expect(true).toBe(true);\n  });\n});`,
      );
    }

    if (describeBlocks.length === 0) {
      describeBlocks.push(
        `describe('module', () => {\n  it('should be defined', () => {\n    expect(true).toBe(true);\n  });\n});`,
      );
    }

    const testCount = classes.length + functions.length || 1;

    const code = [
      `import { describe, it, expect } from 'vitest';`,
      ``,
      ...describeBlocks,
      ``,
    ].join('\n');

    return {
      filePath: `tests/${style}.test.ts`,
      code,
      testCount,
      style,
    };
  }

  generateForFunction(funcName: string, params: string[], returnType: string): TestCase[] {
    const cases: TestCase[] = [];

    cases.push({
      name: `${funcName} returns expected value`,
      description: `Test that ${funcName} returns a valid ${returnType}`,
      arrange: params.map(p => `const ${p} = /* TODO */;`).join('\n    '),
      act: `const result = ${funcName}(${params.join(', ')});`,
      assert: `expect(result).toBeDefined();`,
    });

    cases.push({
      name: `${funcName} handles edge cases`,
      description: `Test ${funcName} edge case behavior`,
      arrange: params.map(p => `const ${p} = /* edge case */;`).join('\n    '),
      act: `const result = ${funcName}(${params.join(', ')});`,
      assert: `expect(result).toBeDefined();`,
    });

    return cases;
  }

  private extractNames(code: string, regex: RegExp): string[] {
    const names: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(regex.source, regex.flags);
    while ((match = re.exec(code)) !== null) {
      names.push(match[1]);
    }
    return names;
  }
}

export class CoverageReporter {
  formatReport(covered: number, total: number, uncoveredLines?: number[]): string {
    const percent = total === 0 ? 100 : Math.round((covered / total) * 100);
    const lines: string[] = [
      '## Coverage Report',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Covered | ${covered} |`,
      `| Total | ${total} |`,
      `| Coverage | ${percent}% |`,
    ];

    if (uncoveredLines && uncoveredLines.length > 0) {
      lines.push('', '### Uncovered Lines', '', uncoveredLines.join(', '));
    }

    return lines.join('\n');
  }
}

export function createUnitTestGenerator(): UnitTestGenerator {
  return new UnitTestGenerator();
}

export function createCoverageReporter(): CoverageReporter {
  return new CoverageReporter();
}
