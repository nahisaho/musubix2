/**
 * @module deep-research
 * @description Research engine with security filtering and knowledge accumulation
 * @see DES-RSC-001
 */

// --- Types ---

export interface ResearchQuery {
  topic: string;
  depth: 'shallow' | 'medium' | 'deep';
  maxSources?: number;
}

export interface ResearchSource {
  title: string;
  type: 'code' | 'documentation' | 'article' | 'api-reference';
  relevance: number;
  content: string;
}

export interface ResearchResult {
  query: ResearchQuery;
  sources: ResearchSource[];
  summary: string;
  confidence: number;
  timestamp: Date;
}

export interface SecurityFilterConfig {
  maxContentLength: number;
  blockedPatterns: string[];
  requireRelevanceAbove: number;
}

export const DEFAULT_SECURITY_FILTER_CONFIG: SecurityFilterConfig = {
  maxContentLength: 50000,
  blockedPatterns: ['<script', 'javascript:', 'eval(', 'Function('],
  requireRelevanceAbove: 0.1,
};

// --- SecurityFilter ---

export class SecurityFilter {
  filter(
    sources: ResearchSource[],
    config: SecurityFilterConfig = DEFAULT_SECURITY_FILTER_CONFIG,
  ): { passed: ResearchSource[]; blocked: ResearchSource[]; reasons: string[] } {
    const passed: ResearchSource[] = [];
    const blocked: ResearchSource[] = [];
    const reasons: string[] = [];

    for (const source of sources) {
      const blockReasons: string[] = [];

      if (source.content.length > config.maxContentLength) {
        blockReasons.push(
          `Content too long (${source.content.length} > ${config.maxContentLength})`,
        );
      }

      for (const pattern of config.blockedPatterns) {
        if (source.content.toLowerCase().includes(pattern.toLowerCase())) {
          blockReasons.push(`Blocked pattern found: "${pattern}"`);
        }
      }

      if (source.relevance < config.requireRelevanceAbove) {
        blockReasons.push(
          `Relevance too low (${source.relevance} < ${config.requireRelevanceAbove})`,
        );
      }

      if (blockReasons.length > 0) {
        blocked.push(source);
        reasons.push(`[${source.title}] ${blockReasons.join('; ')}`);
      } else {
        passed.push(source);
      }
    }

    return { passed, blocked, reasons };
  }
}

// --- KnowledgeAccumulator ---

export class KnowledgeAccumulator {
  private knowledge: Map<string, ResearchResult[]> = new Map();

  accumulate(result: ResearchResult): void {
    const topic = result.query.topic;
    const existing = this.knowledge.get(topic) ?? [];
    existing.push(result);
    this.knowledge.set(topic, existing);
  }

  query(topic: string): ResearchResult[] {
    return this.knowledge.get(topic) ?? [];
  }

  getTopics(): string[] {
    return [...this.knowledge.keys()];
  }

  getStats(): { totalResults: number; totalSources: number; topics: number } {
    let totalResults = 0;
    let totalSources = 0;
    for (const results of this.knowledge.values()) {
      totalResults += results.length;
      for (const result of results) {
        totalSources += result.sources.length;
      }
    }
    return {
      totalResults,
      totalSources,
      topics: this.knowledge.size,
    };
  }
}

// --- ResearchEngine ---

export class ResearchEngine {
  private accumulator: KnowledgeAccumulator;
  private securityFilter: SecurityFilter;

  constructor(accumulator: KnowledgeAccumulator, securityFilter?: SecurityFilter) {
    this.accumulator = accumulator;
    this.securityFilter = securityFilter ?? new SecurityFilter();
  }

  research(query: ResearchQuery, sources: ResearchSource[]): ResearchResult {
    const { passed } = this.securityFilter.filter(sources);

    // Rank by relevance
    const ranked = [...passed].sort((a, b) => b.relevance - a.relevance);

    // Limit sources based on query
    const maxSources = query.maxSources ?? this.getDefaultMaxSources(query.depth);
    const selected = ranked.slice(0, maxSources);

    // Compute confidence from source relevance
    const confidence =
      selected.length > 0
        ? selected.reduce((sum, s) => sum + s.relevance, 0) / selected.length
        : 0;

    // Build summary
    const summary = this.buildSummary(query, selected);

    const result: ResearchResult = {
      query,
      sources: selected,
      summary,
      confidence,
      timestamp: new Date(),
    };

    this.accumulator.accumulate(result);
    return result;
  }

  getAccumulatedKnowledge(topic: string): ResearchResult[] {
    return this.accumulator.query(topic);
  }

  getStats(): Record<string, unknown> {
    const stats = this.accumulator.getStats();
    return {
      ...stats,
      topicList: this.accumulator.getTopics(),
    };
  }

  private getDefaultMaxSources(depth: 'shallow' | 'medium' | 'deep'): number {
    switch (depth) {
      case 'shallow':
        return 3;
      case 'medium':
        return 5;
      case 'deep':
        return 10;
    }
  }

  private buildSummary(query: ResearchQuery, sources: ResearchSource[]): string {
    if (sources.length === 0) {
      return `No relevant sources found for "${query.topic}".`;
    }
    const typeGroups = new Map<string, number>();
    for (const source of sources) {
      typeGroups.set(source.type, (typeGroups.get(source.type) ?? 0) + 1);
    }
    const typeSummary = [...typeGroups.entries()]
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    return `Research on "${query.topic}" (${query.depth}): found ${sources.length} sources (${typeSummary}).`;
  }
}

// --- Factories ---

export function createSecurityFilter(): SecurityFilter {
  return new SecurityFilter();
}

export function createKnowledgeAccumulator(): KnowledgeAccumulator {
  return new KnowledgeAccumulator();
}

export function createResearchEngine(): ResearchEngine {
  const accumulator = createKnowledgeAccumulator();
  const securityFilter = createSecurityFilter();
  return new ResearchEngine(accumulator, securityFilter);
}
