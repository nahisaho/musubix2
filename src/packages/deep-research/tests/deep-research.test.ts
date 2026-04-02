import { describe, it, expect, beforeEach } from 'vitest';
import {
  createResearchEngine,
  createKnowledgeAccumulator,
  createSecurityFilter,
  SecurityFilter,
  KnowledgeAccumulator,
  ResearchEngine,
  DEFAULT_SECURITY_FILTER_CONFIG,
} from '../src/index.js';
import type {
  ResearchQuery,
  ResearchSource,
  ResearchResult,
  SecurityFilterConfig,
} from '../src/index.js';

describe('DES-RSC-001: SecurityFilter', () => {
  let filter: SecurityFilter;

  beforeEach(() => {
    filter = createSecurityFilter();
  });

  it('should create a SecurityFilter via factory', () => {
    expect(filter).toBeInstanceOf(SecurityFilter);
  });

  it('should pass clean sources', () => {
    const sources: ResearchSource[] = [
      { title: 'Doc A', type: 'documentation', relevance: 0.8, content: 'Safe content here.' },
    ];
    const result = filter.filter(sources);
    expect(result.passed).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
    expect(result.reasons).toHaveLength(0);
  });

  it('should block sources with blocked patterns', () => {
    const sources: ResearchSource[] = [
      { title: 'Bad Source', type: 'article', relevance: 0.9, content: 'Contains <script>alert(1)</script>' },
    ];
    const result = filter.filter(sources);
    expect(result.blocked).toHaveLength(1);
    expect(result.passed).toHaveLength(0);
    expect(result.reasons[0]).toContain('Blocked pattern');
  });

  it('should block sources exceeding max content length', () => {
    const sources: ResearchSource[] = [
      { title: 'Huge', type: 'code', relevance: 0.8, content: 'x'.repeat(60000) },
    ];
    const result = filter.filter(sources);
    expect(result.blocked).toHaveLength(1);
    expect(result.reasons[0]).toContain('Content too long');
  });

  it('should block sources with low relevance', () => {
    const sources: ResearchSource[] = [
      { title: 'Low Rel', type: 'article', relevance: 0.05, content: 'Some content' },
    ];
    const result = filter.filter(sources);
    expect(result.blocked).toHaveLength(1);
    expect(result.reasons[0]).toContain('Relevance too low');
  });

  it('should use custom config', () => {
    const config: SecurityFilterConfig = {
      maxContentLength: 10,
      blockedPatterns: ['forbidden'],
      requireRelevanceAbove: 0.5,
    };
    const sources: ResearchSource[] = [
      { title: 'Short', type: 'code', relevance: 0.8, content: 'ok' },
      { title: 'Long', type: 'code', relevance: 0.8, content: 'this is too long for the limit' },
    ];
    const result = filter.filter(sources, config);
    expect(result.passed).toHaveLength(1);
    expect(result.blocked).toHaveLength(1);
  });

  it('should have sensible default config', () => {
    expect(DEFAULT_SECURITY_FILTER_CONFIG.maxContentLength).toBeGreaterThan(0);
    expect(DEFAULT_SECURITY_FILTER_CONFIG.blockedPatterns.length).toBeGreaterThan(0);
    expect(DEFAULT_SECURITY_FILTER_CONFIG.requireRelevanceAbove).toBeGreaterThan(0);
  });
});

describe('DES-RSC-001: KnowledgeAccumulator', () => {
  let accumulator: KnowledgeAccumulator;

  beforeEach(() => {
    accumulator = createKnowledgeAccumulator();
  });

  it('should create a KnowledgeAccumulator via factory', () => {
    expect(accumulator).toBeInstanceOf(KnowledgeAccumulator);
  });

  it('should accumulate and query results by topic', () => {
    const result: ResearchResult = {
      query: { topic: 'typescript', depth: 'medium' },
      sources: [{ title: 'TS Docs', type: 'documentation', relevance: 0.9, content: 'TypeScript info' }],
      summary: 'Summary',
      confidence: 0.9,
      timestamp: new Date(),
    };
    accumulator.accumulate(result);
    const results = accumulator.query('typescript');
    expect(results).toHaveLength(1);
    expect(results[0].summary).toBe('Summary');
  });

  it('should return empty array for unknown topic', () => {
    expect(accumulator.query('unknown')).toEqual([]);
  });

  it('should list all topics', () => {
    accumulator.accumulate({
      query: { topic: 'rust', depth: 'shallow' },
      sources: [],
      summary: '',
      confidence: 0,
      timestamp: new Date(),
    });
    accumulator.accumulate({
      query: { topic: 'go', depth: 'deep' },
      sources: [],
      summary: '',
      confidence: 0,
      timestamp: new Date(),
    });
    const topics = accumulator.getTopics();
    expect(topics).toContain('rust');
    expect(topics).toContain('go');
  });

  it('should return accurate stats', () => {
    accumulator.accumulate({
      query: { topic: 'a', depth: 'shallow' },
      sources: [
        { title: 's1', type: 'code', relevance: 0.5, content: '' },
        { title: 's2', type: 'article', relevance: 0.6, content: '' },
      ],
      summary: '',
      confidence: 0.5,
      timestamp: new Date(),
    });
    const stats = accumulator.getStats();
    expect(stats.totalResults).toBe(1);
    expect(stats.totalSources).toBe(2);
    expect(stats.topics).toBe(1);
  });
});

describe('DES-RSC-001: ResearchEngine', () => {
  let engine: ResearchEngine;

  beforeEach(() => {
    engine = createResearchEngine();
  });

  it('should create a ResearchEngine via factory', () => {
    expect(engine).toBeInstanceOf(ResearchEngine);
  });

  it('should research and return a result', () => {
    const query: ResearchQuery = { topic: 'testing', depth: 'medium' };
    const sources: ResearchSource[] = [
      { title: 'Vitest Docs', type: 'documentation', relevance: 0.9, content: 'Testing framework' },
      { title: 'Jest Article', type: 'article', relevance: 0.7, content: 'Comparison article' },
    ];
    const result = engine.research(query, sources);
    expect(result.query.topic).toBe('testing');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.summary).toContain('testing');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should rank sources by relevance', () => {
    const query: ResearchQuery = { topic: 'api', depth: 'shallow' };
    const sources: ResearchSource[] = [
      { title: 'Low', type: 'article', relevance: 0.3, content: 'Low relevance' },
      { title: 'High', type: 'api-reference', relevance: 0.95, content: 'High relevance' },
      { title: 'Mid', type: 'documentation', relevance: 0.6, content: 'Mid relevance' },
    ];
    const result = engine.research(query, sources);
    expect(result.sources[0].title).toBe('High');
  });

  it('should limit sources based on depth', () => {
    const query: ResearchQuery = { topic: 'big', depth: 'shallow' };
    const sources: ResearchSource[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Source ${i}`,
      type: 'article' as const,
      relevance: 0.5 + i * 0.01,
      content: `Content ${i}`,
    }));
    const result = engine.research(query, sources);
    expect(result.sources.length).toBeLessThanOrEqual(3);
  });

  it('should respect maxSources in query', () => {
    const query: ResearchQuery = { topic: 'limited', depth: 'deep', maxSources: 2 };
    const sources: ResearchSource[] = Array.from({ length: 10 }, (_, i) => ({
      title: `S${i}`,
      type: 'code' as const,
      relevance: 0.5,
      content: `C${i}`,
    }));
    const result = engine.research(query, sources);
    expect(result.sources).toHaveLength(2);
  });

  it('should filter out insecure sources before researching', () => {
    const query: ResearchQuery = { topic: 'security', depth: 'medium' };
    const sources: ResearchSource[] = [
      { title: 'Good', type: 'documentation', relevance: 0.8, content: 'Safe content' },
      { title: 'Bad', type: 'article', relevance: 0.9, content: '<script>alert("xss")</script>' },
    ];
    const result = engine.research(query, sources);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].title).toBe('Good');
  });

  it('should accumulate knowledge across multiple research calls', () => {
    const query: ResearchQuery = { topic: 'typescript', depth: 'shallow' };
    engine.research(query, [
      { title: 'A', type: 'documentation', relevance: 0.8, content: 'Content A' },
    ]);
    engine.research(query, [
      { title: 'B', type: 'article', relevance: 0.7, content: 'Content B' },
    ]);
    const knowledge = engine.getAccumulatedKnowledge('typescript');
    expect(knowledge).toHaveLength(2);
  });

  it('should return stats', () => {
    engine.research(
      { topic: 'stats-test', depth: 'shallow' },
      [{ title: 'S1', type: 'code', relevance: 0.8, content: 'code' }],
    );
    const stats = engine.getStats();
    expect(stats.totalResults).toBe(1);
    expect(stats.topics).toBe(1);
  });

  it('should handle empty sources gracefully', () => {
    const result = engine.research({ topic: 'empty', depth: 'deep' }, []);
    expect(result.sources).toHaveLength(0);
    expect(result.confidence).toBe(0);
    expect(result.summary).toContain('No relevant sources');
  });
});
