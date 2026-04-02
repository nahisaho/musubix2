/**
 * Static Analyzer — DES-COD-002
 *
 * コード品質メトリクスの算出と静的解析。
 */

export interface QualityMetric {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
}

export interface AnalysisIssue {
  type: 'complexity' | 'duplication' | 'naming' | 'length';
  message: string;
  line?: number;
  severity: 'warning' | 'error';
}

export interface AnalysisResult {
  metrics: QualityMetric[];
  score: number;
  issues: AnalysisIssue[];
}

const COMPLEXITY_THRESHOLD = 10;
const FUNCTION_LENGTH_THRESHOLD = 30;

export class StaticAnalyzer {
  analyze(code: string): AnalysisResult {
    const issues: AnalysisIssue[] = [];

    const complexity = this.calculateComplexity(code);
    this.detectLengthIssues(code, issues);
    this.detectNamingIssues(code, issues);
    this.detectDuplication(code, issues);

    const complexityMetric: QualityMetric = {
      name: 'cyclomatic_complexity',
      value: complexity,
      threshold: COMPLEXITY_THRESHOLD,
      passed: complexity <= COMPLEXITY_THRESHOLD,
    };

    if (!complexityMetric.passed) {
      issues.push({
        type: 'complexity',
        message: `Cyclomatic complexity ${complexity} exceeds threshold ${COMPLEXITY_THRESHOLD}`,
        severity: complexity > COMPLEXITY_THRESHOLD * 2 ? 'error' : 'warning',
      });
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

    const lengthMetric: QualityMetric = {
      name: 'function_length',
      value: this.maxFunctionLength(code),
      threshold: FUNCTION_LENGTH_THRESHOLD,
      passed: !issues.some(i => i.type === 'length'),
    };

    const namingMetric: QualityMetric = {
      name: 'naming_conventions',
      value: issues.filter(i => i.type === 'naming').length,
      threshold: 0,
      passed: !issues.some(i => i.type === 'naming'),
    };

    const duplicationMetric: QualityMetric = {
      name: 'duplication',
      value: issues.filter(i => i.type === 'duplication').length,
      threshold: 0,
      passed: !issues.some(i => i.type === 'duplication'),
    };

    return {
      metrics: [complexityMetric, lengthMetric, namingMetric, duplicationMetric],
      score,
      issues,
    };
  }

  calculateComplexity(code: string): number {
    let complexity = 1; // Base complexity

    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private detectLengthIssues(code: string, issues: AnalysisIssue[]): void {
    const lines = code.split('\n');
    let funcStartLine = -1;
    let braceDepth = 0;
    let inFunction = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inFunction && /^\s*(export\s+)?(async\s+)?function\s+|^\s*(public|private|protected)?\s*(async\s+)?\w+\s*\(/.test(line)) {
        funcStartLine = i + 1;
        inFunction = true;
        braceDepth = 0;
      }

      if (inFunction) {
        for (const ch of line) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }

        if (braceDepth <= 0 && funcStartLine > 0) {
          const funcLength = i + 1 - funcStartLine;
          if (funcLength > FUNCTION_LENGTH_THRESHOLD) {
            issues.push({
              type: 'length',
              message: `Function starting at line ${funcStartLine} is ${funcLength} lines long (>${FUNCTION_LENGTH_THRESHOLD})`,
              line: funcStartLine,
              severity: 'warning',
            });
          }
          inFunction = false;
          funcStartLine = -1;
        }
      }
    }
  }

  private detectNamingIssues(code: string, issues: AnalysisIssue[]): void {
    const lines = code.split('\n');
    const varPattern = /\b(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      varPattern.lastIndex = 0;

      while ((match = varPattern.exec(line)) !== null) {
        const varName = match[1];
        // Skip UPPER_SNAKE_CASE constants and single-char vars
        if (/^[A-Z_]+$/.test(varName) || varName.length <= 1) continue;
        // Skip if starts with underscore (private convention)
        if (varName.startsWith('_')) continue;

        // Detect snake_case (contains underscore but not ALL_CAPS)
        if (varName.includes('_') && !/^[A-Z_]+$/.test(varName)) {
          issues.push({
            type: 'naming',
            message: `Variable '${varName}' uses snake_case instead of camelCase`,
            line: i + 1,
            severity: 'warning',
          });
        }
      }
    }
  }

  private detectDuplication(code: string, issues: AnalysisIssue[]): void {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('*'));
    const seen = new Map<string, number>();

    // Check for consecutive duplicate blocks (3+ lines)
    for (let i = 0; i <= lines.length - 3; i++) {
      const block = lines.slice(i, i + 3).join('\n');
      const prev = seen.get(block);
      if (prev !== undefined) {
        issues.push({
          type: 'duplication',
          message: `Duplicate code block detected (first seen near line ${prev + 1}, repeated near line ${i + 1})`,
          line: i + 1,
          severity: 'warning',
        });
      } else {
        seen.set(block, i);
      }
    }
  }

  private maxFunctionLength(code: string): number {
    const lines = code.split('\n');
    let maxLen = 0;
    let funcStartLine = -1;
    let braceDepth = 0;
    let inFunction = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inFunction && /^\s*(export\s+)?(async\s+)?function\s+|^\s*(public|private|protected)?\s*(async\s+)?\w+\s*\(/.test(line)) {
        funcStartLine = i;
        inFunction = true;
        braceDepth = 0;
      }

      if (inFunction) {
        for (const ch of line) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }

        if (braceDepth <= 0 && funcStartLine >= 0) {
          maxLen = Math.max(maxLen, i - funcStartLine + 1);
          inFunction = false;
          funcStartLine = -1;
        }
      }
    }

    return maxLen;
  }
}

export class QualityMetricsCalculator {
  calculate(analysisResults: AnalysisResult[]): { averageScore: number; worstFile: string; totalIssues: number } {
    if (analysisResults.length === 0) {
      return { averageScore: 100, worstFile: 'none', totalIssues: 0 };
    }

    const totalScore = analysisResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = Math.round(totalScore / analysisResults.length);

    let worstIdx = 0;
    let worstScore = analysisResults[0].score;
    for (let i = 1; i < analysisResults.length; i++) {
      if (analysisResults[i].score < worstScore) {
        worstScore = analysisResults[i].score;
        worstIdx = i;
      }
    }

    const totalIssues = analysisResults.reduce((sum, r) => sum + r.issues.length, 0);

    return {
      averageScore,
      worstFile: `file_${worstIdx}`,
      totalIssues,
    };
  }
}

export function createStaticAnalyzer(): StaticAnalyzer {
  return new StaticAnalyzer();
}

export function createQualityMetricsCalculator(): QualityMetricsCalculator {
  return new QualityMetricsCalculator();
}
