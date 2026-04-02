import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPatternExtractor,
  createLearningEngine,
  PatternExtractor,
  LearningEngine,
} from '../../src/learning/index.js';
import type { LearnedPattern, LearningEvent } from '../../src/learning/index.js';

describe('DES-LRN-001: PatternExtractor', () => {
  let extractor: PatternExtractor;

  beforeEach(() => {
    extractor = createPatternExtractor();
  });

  it('should create a PatternExtractor via factory', () => {
    expect(extractor).toBeInstanceOf(PatternExtractor);
  });

  it('should extract camelCase naming patterns from code', () => {
    const code = 'const userName = "test"; function getData() { return value; }';
    const patterns = extractor.extract(code);
    const naming = patterns.filter(p => p.category === 'naming' && p.pattern.includes('camelCase'));
    expect(naming).toHaveLength(1);
    expect(naming[0].frequency).toBeGreaterThan(0);
    expect(naming[0].examples.length).toBeGreaterThan(0);
  });

  it('should extract PascalCase naming patterns from code', () => {
    const code = 'class UserService { } interface DataModel { }';
    const patterns = extractor.extract(code);
    const naming = patterns.filter(p => p.category === 'naming' && p.pattern.includes('PascalCase'));
    expect(naming).toHaveLength(1);
    expect(naming[0].frequency).toBeGreaterThan(0);
  });

  it('should extract UPPER_CASE constant naming patterns', () => {
    const code = 'const MAX_RETRIES = 3; const API_URL = "http://example.com";';
    const patterns = extractor.extract(code);
    const naming = patterns.filter(p => p.category === 'naming' && p.pattern.includes('UPPER_CASE'));
    expect(naming).toHaveLength(1);
    expect(naming[0].examples).toContain('MAX_RETRIES');
  });

  it('should extract error handling patterns', () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
        handleError(e);
      }
      try {
        another();
      } catch (err) {
        log(err);
      }
    `;
    const patterns = extractor.extract(code);
    const errorHandling = patterns.filter(p => p.category === 'error-handling');
    expect(errorHandling.length).toBeGreaterThan(0);
    expect(errorHandling.some(p => p.pattern === 'try-catch error handling')).toBe(true);
  });

  it('should extract testing patterns', () => {
    const code = `
      describe("module", () => {
        it("should work", () => {});
        it("should fail", () => {});
      });
    `;
    const patterns = extractor.extract(code);
    const testing = patterns.filter(p => p.category === 'testing');
    expect(testing).toHaveLength(1);
    expect(testing[0].pattern).toBe('describe/it test structure');
  });

  it('should return all categories', () => {
    const categories = extractor.getCategories();
    expect(categories).toContain('naming');
    expect(categories).toContain('error-handling');
    expect(categories).toContain('testing');
    expect(categories).toContain('code-style');
    expect(categories).toContain('architecture');
    expect(categories).toContain('api-design');
  });

  it('should assign auto-incremented IDs to extracted patterns', () => {
    const code = 'const userName = "test"; class UserService { } const MAX_RETRIES = 3;';
    const patterns = extractor.extract(code);
    const ids = patterns.map(p => p.id);
    expect(ids[0]).toBe('PAT-001');
    if (ids.length > 1) {
      expect(ids[1]).toBe('PAT-002');
    }
  });
});

describe('DES-LRN-001: LearningEngine', () => {
  let engine: LearningEngine;

  beforeEach(() => {
    engine = createLearningEngine();
  });

  it('should create a LearningEngine via factory', () => {
    expect(engine).toBeInstanceOf(LearningEngine);
  });

  it('should record and retrieve patterns', () => {
    const pattern: LearnedPattern = {
      id: 'PAT-001',
      category: 'naming',
      pattern: 'camelCase naming convention',
      frequency: 10,
      confidence: 0.9,
      examples: ['userName', 'getData'],
      learnedAt: new Date(),
    };
    engine.recordPattern(pattern);

    const all = engine.getPatterns();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('PAT-001');
  });

  it('should filter patterns by category', () => {
    engine.recordPattern({
      id: 'PAT-001', category: 'naming', pattern: 'camelCase',
      frequency: 5, confidence: 0.8, examples: [], learnedAt: new Date(),
    });
    engine.recordPattern({
      id: 'PAT-002', category: 'error-handling', pattern: 'try-catch',
      frequency: 3, confidence: 0.7, examples: [], learnedAt: new Date(),
    });

    const naming = engine.getPatterns('naming');
    expect(naming).toHaveLength(1);
    expect(naming[0].category).toBe('naming');
  });

  it('should return top patterns by frequency', () => {
    engine.recordPattern({
      id: 'PAT-001', category: 'naming', pattern: 'camelCase',
      frequency: 5, confidence: 0.8, examples: [], learnedAt: new Date(),
    });
    engine.recordPattern({
      id: 'PAT-002', category: 'naming', pattern: 'PascalCase',
      frequency: 20, confidence: 0.6, examples: [], learnedAt: new Date(),
    });
    engine.recordPattern({
      id: 'PAT-003', category: 'testing', pattern: 'describe/it',
      frequency: 15, confidence: 0.9, examples: [], learnedAt: new Date(),
    });

    const top = engine.getTopPatterns(2);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe('PAT-002');
    expect(top[1].id).toBe('PAT-003');
  });

  it('should return most confident patterns', () => {
    engine.recordPattern({
      id: 'PAT-001', category: 'naming', pattern: 'camelCase',
      frequency: 5, confidence: 0.5, examples: [], learnedAt: new Date(),
    });
    engine.recordPattern({
      id: 'PAT-002', category: 'naming', pattern: 'PascalCase',
      frequency: 20, confidence: 0.95, examples: [], learnedAt: new Date(),
    });
    engine.recordPattern({
      id: 'PAT-003', category: 'testing', pattern: 'describe/it',
      frequency: 15, confidence: 0.8, examples: [], learnedAt: new Date(),
    });

    const confident = engine.getMostConfident(2);
    expect(confident).toHaveLength(2);
    expect(confident[0].id).toBe('PAT-002');
    expect(confident[1].id).toBe('PAT-003');
  });

  it('should record and retrieve events', () => {
    const event: LearningEvent = {
      type: 'pattern-detected',
      data: { patternId: 'PAT-001' },
      timestamp: new Date(),
    };
    engine.recordEvent(event);

    const events = engine.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pattern-detected');
  });

  it('should record multiple events', () => {
    engine.recordEvent({
      type: 'pattern-detected', data: {}, timestamp: new Date(),
    });
    engine.recordEvent({
      type: 'feedback-received', data: { rating: 5 }, timestamp: new Date(),
    });
    engine.recordEvent({
      type: 'correction-applied', data: { fix: 'rename' }, timestamp: new Date(),
    });

    expect(engine.getEvents()).toHaveLength(3);
  });

  it('should suggest patterns matching known patterns from code', () => {
    const extractor = createPatternExtractor();

    // Record a known pattern for camelCase naming
    engine.recordPattern({
      id: 'KNOWN-001',
      category: 'naming',
      pattern: 'camelCase naming convention',
      frequency: 50,
      confidence: 0.95,
      examples: ['userName', 'getData'],
      learnedAt: new Date(),
    });

    // Code that contains camelCase identifiers
    const code = 'const firstName = "test"; function getValue() { return x; }';
    const suggestions = engine.suggest(code, extractor);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.id === 'KNOWN-001')).toBe(true);
  });

  it('should return empty suggestions when no patterns match', () => {
    const extractor = createPatternExtractor();

    engine.recordPattern({
      id: 'KNOWN-001',
      category: 'api-design',
      pattern: 'REST endpoint pattern',
      frequency: 10,
      confidence: 0.9,
      examples: [],
      learnedAt: new Date(),
    });

    // Code with naming patterns only - no api-design patterns
    const code = 'const x = 1;';
    const suggestions = engine.suggest(code, extractor);
    expect(suggestions.every(s => s.category !== 'api-design' || s.pattern !== 'REST endpoint pattern')).toBe(true);
  });
});
