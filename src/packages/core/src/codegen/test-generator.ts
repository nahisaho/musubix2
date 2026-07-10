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
    let testCount = 0;

    for (const cls of classes) {
      const methods = this.extractMethods(sourceCode, cls);
      const its: string[] = [
        `  it('should be instantiable', () => {\n    // TODO: implement\n    expect(true).toBe(true);\n  });`,
      ];
      for (const m of methods) {
        its.push(
          `  it('${m}() should work', () => {\n    // TODO: implement ${cls}.${m}\n    expect(true).toBe(true);\n  });`,
        );
      }
      testCount += its.length;
      describeBlocks.push(`describe('${cls}', () => {\n${its.join('\n')}\n});`);
    }

    for (const fn of functions) {
      describeBlocks.push(
        `describe('${fn}', () => {\n  it('should work correctly', () => {\n    // TODO: implement\n    expect(true).toBe(true);\n  });\n});`,
      );
      testCount += 1;
    }

    if (describeBlocks.length === 0) {
      describeBlocks.push(
        "describe('module', () => {\n  it('should be defined', () => {\n    expect(true).toBe(true);\n  });\n});",
      );
      testCount = 1;
    }

    const code = ["import { describe, it, expect } from 'vitest';", '', ...describeBlocks, ''].join(
      '\n',
    );

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
      arrange: params.map((p) => `const ${p} = /* TODO */;`).join('\n    '),
      act: `const result = ${funcName}(${params.join(', ')});`,
      assert: 'expect(result).toBeDefined();',
    });

    cases.push({
      name: `${funcName} handles edge cases`,
      description: `Test ${funcName} edge case behavior`,
      arrange: params.map((p) => `const ${p} = /* edge case */;`).join('\n    '),
      act: `const result = ${funcName}(${params.join(', ')});`,
      assert: 'expect(result).toBeDefined();',
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

  /**
   * Extract public method names of a class from source, so each gets its own
   * test. Skips the constructor, private/protected members and control-flow
   * keywords; getters/setters are included.
   */
  private extractMethods(code: string, className: string): string[] {
    const start = code.search(new RegExp(`\\bclass\\s+${className}\\b`));
    if (start < 0) return [];
    const open = code.indexOf('{', start);
    if (open < 0) return [];
    // Balance braces to isolate the class body.
    let depth = 0;
    let end = open;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const body = code.slice(open + 1, end);
    const methodRe =
      /(?:^|\n)[ \t]*((?:public\s+|static\s+|async\s+|get\s+|set\s+)*)([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^{;]+)?\{/g;
    const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'constructor']);
    const seen = new Set<string>();
    const methods: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = methodRe.exec(body)) !== null) {
      const prefix = m[1];
      const name = m[2];
      if (/\b(private|protected)\b/.test(prefix)) continue; // only public
      if (KEYWORDS.has(name) || seen.has(name)) continue;
      seen.add(name);
      methods.push(name);
    }
    return methods;
  }
}

export class CoverageReporter {
  formatReport(covered: number, total: number, uncoveredLines?: number[]): string {
    const percent = total === 0 ? 100 : Math.round((covered / total) * 100);
    const lines: string[] = [
      '## Coverage Report',
      '',
      '| Metric | Value |',
      '|--------|-------|',
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
