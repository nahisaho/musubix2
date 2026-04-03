import { describe, it, expect, beforeEach } from 'vitest';
import {
  createResearchEngine,
  createKnowledgeAccumulator,
  createSecurityFilter,
  SecurityFilter,
  KnowledgeAccumulator,
  ResearchEngine,
  DepthFirstStrategy,
  BreadthFirstStrategy,
  DEFAULT_SECURITY_FILTER_CONFIG,
} from '../src/index.js';
import type {
  ResearchQuery,
  ResearchSource,
  ResearchResult,
  SecurityFilterConfig,
  ResearchStrategy,
  EvidenceChainLink,
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

// ========== NEW TESTS ==========

describe('DES-RSC-001: DepthFirstStrategy', () => {
  let strategy: DepthFirstStrategy;

  it('should have name "depth-first"', () => {
    strategy = new DepthFirstStrategy();
    expect(strategy.name).toBe('depth-first');
  });

  it('should suggest initial queries when no results exist', () => {
    strategy = new DepthFirstStrategy();
    const suggestions = strategy.suggestNextSteps([], { topic: 'typescript', depth: 'deep' });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('typescript'))).toBe(true);
  });

  it('should suggest deeper queries based on existing results', () => {
    strategy = new DepthFirstStrategy();
    const results: ResearchResult[] = [
      {
        query: { topic: 'typescript', depth: 'deep' },
        sources: [
          {
            title: 'TS Types',
            type: 'documentation',
            relevance: 0.9,
            content: 'TypeScript provides static typing and interfaces for JavaScript development',
          },
        ],
        summary: 'Summary',
        confidence: 0.4,
        timestamp: new Date(),
      },
    ];
    const suggestions = strategy.suggestNextSteps(results, { topic: 'typescript', depth: 'deep' });
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('DES-RSC-001: BreadthFirstStrategy', () => {
  let strategy: BreadthFirstStrategy;

  it('should have name "breadth-first"', () => {
    strategy = new BreadthFirstStrategy();
    expect(strategy.name).toBe('breadth-first');
  });

  it('should suggest overview queries when no results exist', () => {
    strategy = new BreadthFirstStrategy();
    const suggestions = strategy.suggestNextSteps([], { topic: 'react', depth: 'medium' });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('react'))).toBe(true);
  });

  it('should suggest related topic queries from existing results', () => {
    strategy = new BreadthFirstStrategy();
    const results: ResearchResult[] = [
      {
        query: { topic: 'react', depth: 'medium' },
        sources: [
          { title: 'React Docs', type: 'documentation', relevance: 0.9, content: 'React documentation' },
        ],
        summary: 'Summary',
        confidence: 0.8,
        timestamp: new Date(),
      },
    ];
    const suggestions = strategy.suggestNextSteps(results, { topic: 'react', depth: 'medium' });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should suggest missing source types', () => {
    strategy = new BreadthFirstStrategy();
    const results: ResearchResult[] = [
      {
        query: { topic: 'node', depth: 'medium' },
        sources: [
          { title: 'Node Docs', type: 'documentation', relevance: 0.9, content: 'Node.js docs' },
        ],
        summary: '',
        confidence: 0.8,
        timestamp: new Date(),
      },
    ];
    const suggestions = strategy.suggestNextSteps(results, { topic: 'node', depth: 'medium' });
    // Should suggest exploring code, article, or api-reference since only documentation was seen
    expect(suggestions.some(s => s.includes('code') || s.includes('article') || s.includes('api-reference'))).toBe(true);
  });
});

describe('DES-RSC-001: ResearchEngine Extended', () => {
  let engine: ResearchEngine;

  beforeEach(() => {
    engine = createResearchEngine();
  });

  it('should accept strategies via addStrategy', () => {
    engine.addStrategy(new DepthFirstStrategy());
    engine.addStrategy(new BreadthFirstStrategy());
    const stats = engine.getStats();
    expect(stats.strategies).toEqual(['depth-first', 'breadth-first']);
  });

  it('should include TF-IDF enhanced ranking', () => {
    const query: ResearchQuery = { topic: 'typescript generics', depth: 'medium' };
    const sources: ResearchSource[] = [
      {
        title: 'Generics Guide',
        type: 'documentation',
        relevance: 0.7,
        content: 'TypeScript generics allow you to create reusable components with typescript generic types',
      },
      {
        title: 'Random Article',
        type: 'article',
        relevance: 0.75,
        content: 'JavaScript has many features and patterns for web development',
      },
    ];
    const result = engine.research(query, sources);
    // The generics guide should rank higher due to TF-IDF boost despite slightly lower base relevance
    expect(result.sources[0].title).toBe('Generics Guide');
  });

  it('should produce keyFindings in results', () => {
    const result = engine.research(
      { topic: 'testing', depth: 'medium' },
      [
        {
          title: 'Testing Guide',
          type: 'documentation',
          relevance: 0.9,
          content: 'Unit testing is essential for software quality. Integration testing validates component interaction.',
        },
      ],
    );
    expect(result.keyFindings).toBeDefined();
    expect(result.keyFindings!.length).toBeGreaterThan(0);
  });

  it('should compute confidence with diversity bonus', () => {
    const query: ResearchQuery = { topic: 'api design', depth: 'medium' };

    // Single type
    const result1 = engine.research(query, [
      { title: 'A', type: 'documentation', relevance: 0.8, content: 'API design documentation' },
      { title: 'B', type: 'documentation', relevance: 0.8, content: 'More API design docs' },
    ]);

    const engine2 = createResearchEngine();
    // Multiple types
    const result2 = engine2.research(query, [
      { title: 'A', type: 'documentation', relevance: 0.8, content: 'API design documentation' },
      { title: 'B', type: 'code', relevance: 0.8, content: 'API design code examples' },
    ]);

    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });

  it('should build cross-reference index during research', () => {
    engine.research(
      { topic: 'react hooks', depth: 'medium' },
      [
        {
          title: 'Hooks Guide',
          type: 'documentation',
          relevance: 0.9,
          content: 'React hooks provide state management and lifecycle functionality',
        },
        {
          title: 'State Article',
          type: 'article',
          relevance: 0.8,
          content: 'State management in react using hooks and context',
        },
      ],
    );
    const crossRefs = engine.getCrossReferences('react hooks');
    expect(crossRefs.size).toBeGreaterThan(0);
  });

  it('should return empty map for getCrossReferences on unknown topic', () => {
    const refs = engine.getCrossReferences('nonexistent unknown topic');
    expect(refs.size).toBe(0);
  });

  it('should report crossReferenceTerms in stats', () => {
    engine.research(
      { topic: 'testing', depth: 'shallow' },
      [{ title: 'A', type: 'code', relevance: 0.8, content: 'Unit testing with vitest framework' }],
    );
    const stats = engine.getStats();
    expect(stats.crossReferenceTerms).toBeGreaterThan(0);
  });

  it('should perform iterative research with source provider', () => {
    engine.addStrategy(new DepthFirstStrategy());

    const sourceProvider = (subQuery: string): ResearchSource[] => {
      if (subQuery.includes('typescript')) {
        return [
          {
            title: `TS: ${subQuery}`,
            type: 'documentation',
            relevance: 0.8,
            content: `Content about ${subQuery} in typescript with types and interfaces`,
          },
        ];
      }
      return [
        {
          title: `General: ${subQuery}`,
          type: 'article',
          relevance: 0.6,
          content: `General article about ${subQuery}`,
        },
      ];
    };

    const result = engine.researchIterative(
      { topic: 'typescript', depth: 'deep' },
      sourceProvider,
    );

    expect(result).toBeDefined();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.summary).toContain('typescript');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should handle iterative research with shallow depth (single round)', () => {
    const sourceProvider = (q: string): ResearchSource[] => [
      { title: q, type: 'code', relevance: 0.7, content: `Code about ${q}` },
    ];

    const result = engine.researchIterative(
      { topic: 'simple', depth: 'shallow' },
      sourceProvider,
    );

    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.summary).toContain('simple');
  });

  it('should handle iterative research with empty source provider', () => {
    engine.addStrategy(new BreadthFirstStrategy());

    const result = engine.researchIterative(
      { topic: 'empty-topic', depth: 'medium' },
      () => [],
    );

    expect(result.sources).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('should produce iterative summary with round count', () => {
    engine.addStrategy(new DepthFirstStrategy());

    const result = engine.researchIterative(
      { topic: 'python', depth: 'medium' },
      (q) => [
        { title: `Python: ${q}`, type: 'article', relevance: 0.7, content: `Python ${q} guide with features` },
      ],
    );

    expect(result.summary).toContain('Iterative research');
    expect(result.summary).toContain('round(s)');
  });

  it('should generate evidence chains', () => {
    // First accumulate some knowledge
    engine.research(
      { topic: 'vitest', depth: 'deep' },
      [
        { title: 'Vitest Docs', type: 'documentation', relevance: 0.9, content: 'Vitest is a fast testing framework' },
        { title: 'Vitest Code', type: 'code', relevance: 0.85, content: 'Example vitest test code' },
        { title: 'Vitest Article', type: 'article', relevance: 0.7, content: 'Why vitest is great for testing' },
      ],
    );

    const chain = engine.generateEvidenceChain('vitest');
    expect(chain.length).toBeGreaterThan(0);
    for (const link of chain) {
      expect(link.claim).toBeDefined();
      expect(link.sources.length).toBeGreaterThan(0);
      expect(link.confidence).toBeGreaterThanOrEqual(0);
      expect(link.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('should return empty evidence chain for unknown topic', () => {
    const chain = engine.generateEvidenceChain('nonexistent');
    expect(chain).toEqual([]);
  });

  it('should generate evidence chain with high-relevance cluster', () => {
    engine.research(
      { topic: 'quality', depth: 'medium' },
      [
        { title: 'High Q', type: 'documentation', relevance: 0.95, content: 'Quality assurance guide' },
        { title: 'Also High', type: 'article', relevance: 0.85, content: 'Quality metrics article' },
      ],
    );

    const chain = engine.generateEvidenceChain('quality');
    const highRelevanceLink = chain.find(c => c.claim.includes('strong evidence'));
    expect(highRelevanceLink).toBeDefined();
    expect(highRelevanceLink!.sources.length).toBeGreaterThan(0);
  });

  it('should merge key findings from iterative research without duplicates', () => {
    engine.addStrategy(new DepthFirstStrategy());

    let callCount = 0;
    const sourceProvider = (q: string): ResearchSource[] => {
      callCount++;
      return [
        {
          title: `Source ${callCount}`,
          type: 'documentation',
          relevance: 0.8,
          content: `Detailed information about ${q} covering important aspects of the topic`,
        },
      ];
    };

    const result = engine.researchIterative(
      { topic: 'typescript', depth: 'deep' },
      sourceProvider,
    );

    expect(result.keyFindings).toBeDefined();
    // No duplicates
    const normalized = result.keyFindings!.map(f => f.toLowerCase().trim());
    const unique = new Set(normalized);
    expect(unique.size).toBe(normalized.length);
  });
});
