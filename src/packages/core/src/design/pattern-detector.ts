/**
 * Pattern Detector — DES-DES-004
 *
 * コード中のデザインパターンを正規表現ベースで検出する。
 */

export type DesignPatternType =
  | 'singleton'
  | 'factory'
  | 'observer'
  | 'strategy'
  | 'decorator'
  | 'adapter'
  | 'facade'
  | 'repository'
  | 'command'
  | 'builder';

export interface PatternDetection {
  pattern: DesignPatternType;
  confidence: number;
  location: string;
  evidence: string[];
}

interface PatternRule {
  pattern: DesignPatternType;
  matchers: Array<{ regex: RegExp; weight: number; label: string }>;
}

const PATTERN_RULES: PatternRule[] = [
  {
    pattern: 'singleton',
    matchers: [
      { regex: /private\s+static\s+instance/g, weight: 0.5, label: 'private static instance' },
      { regex: /getInstance\s*\(/g, weight: 0.5, label: 'getInstance()' },
    ],
  },
  {
    pattern: 'factory',
    matchers: [
      { regex: /create[A-Z]\w*/g, weight: 0.5, label: 'create[Name] method' },
      { regex: /static\s+create\b/g, weight: 0.5, label: 'static create' },
    ],
  },
  {
    pattern: 'observer',
    matchers: [
      { regex: /addEventListener\s*\(/g, weight: 0.35, label: 'addEventListener()' },
      { regex: /\.on\s*\(/g, weight: 0.35, label: 'on()' },
      { regex: /\.emit\s*\(/g, weight: 0.3, label: 'emit()' },
    ],
  },
  {
    pattern: 'strategy',
    matchers: [
      { regex: /interface\s+\w*Strategy/g, weight: 0.5, label: 'Strategy interface' },
      { regex: /setStrategy\s*\(/g, weight: 0.5, label: 'setStrategy()' },
    ],
  },
  {
    pattern: 'repository',
    matchers: [
      { regex: /interface\s+\w*Repository/g, weight: 0.34, label: 'Repository interface' },
      { regex: /\.find\s*\(/g, weight: 0.33, label: 'find()' },
      { regex: /\.save\s*\(/g, weight: 0.33, label: 'save()' },
    ],
  },
  {
    pattern: 'builder',
    matchers: [
      { regex: /\.build\s*\(\s*\)/g, weight: 0.5, label: '.build()' },
      { regex: /class\s+\w*Builder/g, weight: 0.5, label: 'Builder class' },
    ],
  },
  {
    pattern: 'decorator',
    matchers: [
      { regex: /class\s+\w*Decorator/g, weight: 0.5, label: 'Decorator class' },
      { regex: /@\w+\s*(\(|$)/gm, weight: 0.5, label: '@decorator usage' },
    ],
  },
  {
    pattern: 'adapter',
    matchers: [
      { regex: /class\s+\w*Adapter/g, weight: 0.5, label: 'Adapter class' },
      { regex: /implements\s+\w+.*\{[^}]*adaptee/gs, weight: 0.5, label: 'adaptee field' },
    ],
  },
  {
    pattern: 'facade',
    matchers: [
      { regex: /class\s+\w*Facade/g, weight: 0.5, label: 'Facade class' },
      { regex: /class\s+\w*Gateway/g, weight: 0.5, label: 'Gateway class' },
    ],
  },
  {
    pattern: 'command',
    matchers: [
      { regex: /class\s+\w*Command/g, weight: 0.5, label: 'Command class' },
      { regex: /\.execute\s*\(/g, weight: 0.5, label: 'execute()' },
    ],
  },
];

export class PatternDetector {
  detect(code: string): PatternDetection[] {
    const detections: PatternDetection[] = [];

    for (const rule of PATTERN_RULES) {
      let totalConfidence = 0;
      const evidence: string[] = [];
      let firstMatchLine = -1;

      for (const matcher of rule.matchers) {
        // Reset lastIndex for global regex
        matcher.regex.lastIndex = 0;
        const match = matcher.regex.exec(code);
        if (match) {
          totalConfidence += matcher.weight;
          evidence.push(matcher.label);
          if (firstMatchLine === -1) {
            const lineIndex = code.substring(0, match.index).split('\n').length;
            firstMatchLine = lineIndex;
          }
        }
      }

      if (totalConfidence > 0 && evidence.length > 0) {
        const location = firstMatchLine > 0 ? `line ${firstMatchLine}` : 'unknown';
        detections.push({
          pattern: rule.pattern,
          confidence: Math.min(totalConfidence, 1),
          location,
          evidence,
        });
      }
    }

    return detections.sort((a, b) => b.confidence - a.confidence);
  }

  getSupportedPatterns(): DesignPatternType[] {
    return PATTERN_RULES.map(r => r.pattern);
  }
}

export function createPatternDetector(): PatternDetector {
  return new PatternDetector();
}
