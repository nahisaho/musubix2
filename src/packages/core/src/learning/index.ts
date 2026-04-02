/**
 * @module learning
 * @description Self-Learning System - pattern extraction, accumulation, and recommendation
 * @see DES-LRN-001
 */

export type PatternCategory =
  | 'code-style'
  | 'architecture'
  | 'testing'
  | 'error-handling'
  | 'naming'
  | 'api-design';

export interface LearnedPattern {
  id: string;
  category: PatternCategory;
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  learnedAt: Date;
}

export interface LearningEvent {
  type: 'pattern-detected' | 'feedback-received' | 'correction-applied';
  data: Record<string, unknown>;
  timestamp: Date;
}

export class PatternExtractor {
  extract(code: string): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];
    const now = new Date();
    let counter = 0;

    // Naming patterns: camelCase
    const camelCaseMatches = code.match(/\b[a-z][a-zA-Z0-9]*(?=[(\s:=])/g) || [];
    if (camelCaseMatches.length > 0) {
      counter++;
      patterns.push({
        id: `PAT-${String(counter).padStart(3, '0')}`,
        category: 'naming',
        pattern: 'camelCase naming convention',
        frequency: camelCaseMatches.length,
        confidence: Math.min(camelCaseMatches.length / 10, 1.0),
        examples: [...new Set(camelCaseMatches)].slice(0, 5),
        learnedAt: now,
      });
    }

    // Naming patterns: PascalCase
    const pascalCaseMatches = code.match(/\b[A-Z][a-zA-Z0-9]*(?=[\s{(<])/g) || [];
    if (pascalCaseMatches.length > 0) {
      counter++;
      patterns.push({
        id: `PAT-${String(counter).padStart(3, '0')}`,
        category: 'naming',
        pattern: 'PascalCase naming convention',
        frequency: pascalCaseMatches.length,
        confidence: Math.min(pascalCaseMatches.length / 10, 1.0),
        examples: [...new Set(pascalCaseMatches)].slice(0, 5),
        learnedAt: now,
      });
    }

    // Naming patterns: UPPER_CASE constants
    const upperCaseMatches = code.match(/\b[A-Z][A-Z_0-9]{2,}\b/g) || [];
    if (upperCaseMatches.length > 0) {
      counter++;
      patterns.push({
        id: `PAT-${String(counter).padStart(3, '0')}`,
        category: 'naming',
        pattern: 'UPPER_CASE constant naming convention',
        frequency: upperCaseMatches.length,
        confidence: Math.min(upperCaseMatches.length / 5, 1.0),
        examples: [...new Set(upperCaseMatches)].slice(0, 5),
        learnedAt: now,
      });
    }

    // Error handling: try-catch
    const tryCatchMatches = code.match(/try\s*\{/g) || [];
    if (tryCatchMatches.length > 0) {
      counter++;
      patterns.push({
        id: `PAT-${String(counter).padStart(3, '0')}`,
        category: 'error-handling',
        pattern: 'try-catch error handling',
        frequency: tryCatchMatches.length,
        confidence: Math.min(tryCatchMatches.length / 5, 1.0),
        examples: ['try { ... } catch (e) { ... }'],
        learnedAt: now,
      });
    }

    // Error handling: custom error classes
    const errorClassMatches = code.match(/class\s+\w+Error\s+extends/g) || [];
    if (errorClassMatches.length > 0) {
      counter++;
      patterns.push({
        id: `PAT-${String(counter).padStart(3, '0')}`,
        category: 'error-handling',
        pattern: 'custom error class pattern',
        frequency: errorClassMatches.length,
        confidence: Math.min(errorClassMatches.length / 3, 1.0),
        examples: errorClassMatches.slice(0, 3),
        learnedAt: now,
      });
    }

    // Testing patterns: describe/it structure
    const describeMatches = code.match(/describe\s*\(/g) || [];
    const itMatches = code.match(/\bit\s*\(/g) || [];
    if (describeMatches.length > 0 || itMatches.length > 0) {
      counter++;
      patterns.push({
        id: `PAT-${String(counter).padStart(3, '0')}`,
        category: 'testing',
        pattern: 'describe/it test structure',
        frequency: describeMatches.length + itMatches.length,
        confidence: Math.min((describeMatches.length + itMatches.length) / 10, 1.0),
        examples: ['describe("module", () => { it("should ...", () => { ... }) })'],
        learnedAt: now,
      });
    }

    return patterns;
  }

  getCategories(): PatternCategory[] {
    return ['code-style', 'architecture', 'testing', 'error-handling', 'naming', 'api-design'];
  }
}

export class LearningEngine {
  private patterns: Map<string, LearnedPattern> = new Map();
  private events: LearningEvent[] = [];

  recordPattern(pattern: LearnedPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  recordEvent(event: LearningEvent): void {
    this.events.push(event);
  }

  getPatterns(category?: PatternCategory): LearnedPattern[] {
    const all = [...this.patterns.values()];
    if (category) {
      return all.filter((p) => p.category === category);
    }
    return all;
  }

  getTopPatterns(limit: number): LearnedPattern[] {
    return [...this.patterns.values()].sort((a, b) => b.frequency - a.frequency).slice(0, limit);
  }

  getMostConfident(limit: number): LearnedPattern[] {
    return [...this.patterns.values()].sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  getEvents(): LearningEvent[] {
    return [...this.events];
  }

  suggest(code: string, extractor: PatternExtractor): LearnedPattern[] {
    const extracted = extractor.extract(code);
    const suggestions: LearnedPattern[] = [];
    const knownPatterns = [...this.patterns.values()];

    for (const extractedPattern of extracted) {
      const matching = knownPatterns.filter(
        (known) =>
          known.category === extractedPattern.category &&
          known.pattern === extractedPattern.pattern,
      );
      suggestions.push(...matching);
    }

    return suggestions;
  }
}

export function createPatternExtractor(): PatternExtractor {
  return new PatternExtractor();
}

export function createLearningEngine(): LearningEngine {
  return new LearningEngine();
}
