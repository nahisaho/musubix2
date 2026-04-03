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
  keyFindings?: string[];
  crossReferences?: Map<string, number>;
}

export interface SecurityFilterConfig {
  maxContentLength: number;
  blockedPatterns: string[];
  requireRelevanceAbove: number;
}

export interface EvidenceChainLink {
  claim: string;
  sources: ResearchSource[];
  confidence: number;
}

export const DEFAULT_SECURITY_FILTER_CONFIG: SecurityFilterConfig = {
  maxContentLength: 50000,
  blockedPatterns: ['<script', 'javascript:', 'eval(', 'Function('],
  requireRelevanceAbove: 0.1,
};

// --- ResearchStrategy ---

export interface ResearchStrategy {
  name: string;
  suggestNextSteps(currentResults: ResearchResult[], query: ResearchQuery): string[];
}

export class DepthFirstStrategy implements ResearchStrategy {
  name = 'depth-first';

  suggestNextSteps(currentResults: ResearchResult[], query: ResearchQuery): string[] {
    const suggestions: string[] = [];
    if (currentResults.length === 0) {
      suggestions.push(`${query.topic} fundamentals`);
      suggestions.push(`${query.topic} advanced concepts`);
      return suggestions;
    }

    // Find underexplored subtopics from existing results
    const coveredTopics = new Set<string>();
    const allWords = new Map<string, number>();

    for (const result of currentResults) {
      coveredTopics.add(result.query.topic);
      for (const source of result.sources) {
        const words = this.extractKeyTerms(source.content);
        for (const word of words) {
          allWords.set(word, (allWords.get(word) ?? 0) + 1);
        }
      }
    }

    // Suggest deeper dives on high-frequency terms not yet researched
    const sorted = [...allWords.entries()]
      .filter(([word]) => !coveredTopics.has(word) && word.length > 3)
      .sort((a, b) => b[1] - a[1]);

    for (const [word] of sorted.slice(0, 3)) {
      suggestions.push(`${query.topic} ${word} in depth`);
    }

    // If low confidence in any result, suggest reinforcement
    for (const result of currentResults) {
      if (result.confidence < 0.5) {
        suggestions.push(`${result.query.topic} detailed analysis`);
      }
    }

    return suggestions.slice(0, 5);
  }

  private extractKeyTerms(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
  }
}

export class BreadthFirstStrategy implements ResearchStrategy {
  name = 'breadth-first';

  suggestNextSteps(currentResults: ResearchResult[], query: ResearchQuery): string[] {
    const suggestions: string[] = [];
    if (currentResults.length === 0) {
      suggestions.push(`${query.topic} overview`);
      suggestions.push(`${query.topic} alternatives`);
      suggestions.push(`${query.topic} comparison`);
      return suggestions;
    }

    const coveredTopics = new Set(currentResults.map((r) => r.query.topic));

    // Suggest related but different topic areas
    const relatedPrefixes = ['benefits of', 'drawbacks of', 'alternatives to', 'comparison of'];
    for (const prefix of relatedPrefixes) {
      const suggestion = `${prefix} ${query.topic}`;
      if (!coveredTopics.has(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    // Cross-reference with source types not yet seen
    const seenTypes = new Set<string>();
    for (const result of currentResults) {
      for (const source of result.sources) {
        seenTypes.add(source.type);
      }
    }
    const allTypes: Array<ResearchSource['type']> = [
      'code',
      'documentation',
      'article',
      'api-reference',
    ];
    for (const type of allTypes) {
      if (!seenTypes.has(type)) {
        suggestions.push(`${query.topic} ${type} examples`);
      }
    }

    return suggestions.slice(0, 5);
  }
}

// --- TF-IDF Helper ---

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function computeTF(terms: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) ?? 0) + 1);
  }
  const total = terms.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / total);
  }
  return tf;
}

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = documents.length || 1;
  const allTerms = new Set<string>();
  for (const doc of documents) {
    for (const term of new Set(doc)) {
      allTerms.add(term);
    }
  }
  for (const term of allTerms) {
    const df = documents.filter((doc) => doc.includes(term)).length;
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
  }
  return idf;
}

function tfidfScore(queryTerms: string[], docTerms: string[], idf: Map<string, number>): number {
  const tf = computeTF(docTerms);
  let score = 0;
  for (const term of queryTerms) {
    const termTF = tf.get(term) ?? 0;
    const termIDF = idf.get(term) ?? 0;
    score += termTF * termIDF;
  }
  return score;
}

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
  private strategies: ResearchStrategy[] = [];
  private crossReferenceIndex: Map<string, Set<string>> = new Map();

  constructor(accumulator: KnowledgeAccumulator, securityFilter?: SecurityFilter) {
    this.accumulator = accumulator;
    this.securityFilter = securityFilter ?? new SecurityFilter();
  }

  addStrategy(strategy: ResearchStrategy): void {
    this.strategies.push(strategy);
  }

  research(query: ResearchQuery, sources: ResearchSource[]): ResearchResult {
    const { passed } = this.securityFilter.filter(sources);

    // TF-IDF scoring for relevance ranking
    const queryTerms = tokenize(query.topic);
    const docTermsList = passed.map((s) => tokenize(s.content + ' ' + s.title));
    const idf = computeIDF(docTermsList);

    const scored = passed.map((source, idx) => ({
      source,
      tfidfScore: tfidfScore(queryTerms, docTermsList[idx], idf),
    }));

    // Combine TF-IDF with original relevance (weighted blend)
    const maxTfidf = Math.max(...scored.map((s) => s.tfidfScore), 0.001);
    const ranked = scored
      .map((s) => ({
        source: s.source,
        combinedScore: s.source.relevance * 0.6 + (s.tfidfScore / maxTfidf) * 0.4,
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore);

    // Limit sources based on query
    const maxSources = query.maxSources ?? this.getDefaultMaxSources(query.depth);
    const selected = ranked.slice(0, maxSources).map((r) => r.source);

    // Build cross-reference index
    this.buildCrossReferenceIndex(selected);

    // Compute confidence based on source agreement + coverage
    const confidence = this.computeConfidence(selected, query);

    // Extract key findings
    const keyFindings = this.extractKeyFindings(selected, query);

    // Get cross-references for this topic
    const crossRefs = this.getCrossReferences(query.topic);

    // Build summary
    const summary = this.buildSummary(query, selected);

    const result: ResearchResult = {
      query,
      sources: selected,
      summary,
      confidence,
      timestamp: new Date(),
      keyFindings,
      crossReferences: crossRefs.size > 0 ? crossRefs : undefined,
    };

    this.accumulator.accumulate(result);
    return result;
  }

  researchIterative(
    query: ResearchQuery,
    sourceProvider: (subQuery: string) => ResearchSource[],
  ): ResearchResult {
    const maxRounds = this.getMaxRoundsForDepth(query.depth);
    const allResults: ResearchResult[] = [];
    const allSources: ResearchSource[] = [];
    const seenTitles = new Set<string>();

    // Round 1: initial research
    const initialSources = sourceProvider(query.topic);
    const initialResult = this.research(query, initialSources);
    allResults.push(initialResult);
    for (const s of initialResult.sources) {
      if (!seenTitles.has(s.title)) {
        allSources.push(s);
        seenTitles.add(s.title);
      }
    }

    // Subsequent rounds: use strategies to guide sub-queries
    for (let round = 1; round < maxRounds; round++) {
      const subQueries = this.getNextSubQueries(allResults, query);
      if (subQueries.length === 0) break;

      let foundNew = false;
      for (const subQuery of subQueries.slice(0, 3)) {
        const subSources = sourceProvider(subQuery);
        if (subSources.length === 0) continue;

        const subResult = this.research(
          { topic: subQuery, depth: query.depth, maxSources: query.maxSources },
          subSources,
        );
        allResults.push(subResult);

        for (const s of subResult.sources) {
          if (!seenTitles.has(s.title)) {
            allSources.push(s);
            seenTitles.add(s.title);
            foundNew = true;
          }
        }
      }

      if (!foundNew) break;

      // Check confidence threshold
      const avgConfidence =
        allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length;
      if (avgConfidence >= 0.8) break;
    }

    // Merge all results into a final comprehensive result
    return this.mergeResults(query, allSources, allResults);
  }

  getCrossReferences(topic: string): Map<string, number> {
    const result = new Map<string, number>();
    const topicTerms = tokenize(topic);

    for (const term of topicTerms) {
      const related = this.crossReferenceIndex.get(term);
      if (!related) continue;
      for (const relatedTerm of related) {
        if (!topicTerms.includes(relatedTerm)) {
          result.set(relatedTerm, (result.get(relatedTerm) ?? 0) + 1);
        }
      }
    }

    return result;
  }

  generateEvidenceChain(topic: string): EvidenceChainLink[] {
    const results = this.accumulator.query(topic);
    if (results.length === 0) return [];

    // Group sources by content similarity to form claims
    const allSources: ResearchSource[] = [];
    for (const result of results) {
      for (const source of result.sources) {
        allSources.push(source);
      }
    }

    if (allSources.length === 0) return [];

    // Cluster sources into claim groups by extracting key phrases
    const claimGroups = this.clusterSourcesByClaim(allSources, topic);

    return claimGroups.map((group) => ({
      claim: group.claim,
      sources: group.sources,
      confidence:
        group.sources.length > 0
          ? group.sources.reduce((sum, s) => sum + s.relevance, 0) / group.sources.length
          : 0,
    }));
  }

  getAccumulatedKnowledge(topic: string): ResearchResult[] {
    return this.accumulator.query(topic);
  }

  getStats(): Record<string, unknown> {
    const stats = this.accumulator.getStats();
    return {
      ...stats,
      topicList: this.accumulator.getTopics(),
      strategies: this.strategies.map((s) => s.name),
      crossReferenceTerms: this.crossReferenceIndex.size,
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

  private getMaxRoundsForDepth(depth: 'shallow' | 'medium' | 'deep'): number {
    switch (depth) {
      case 'shallow':
        return 1;
      case 'medium':
        return 2;
      case 'deep':
        return 3;
    }
  }

  private computeConfidence(sources: ResearchSource[], query: ResearchQuery): number {
    if (sources.length === 0) return 0;

    // Base confidence from average relevance
    const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;

    // Source diversity bonus (multiple types = more trustworthy)
    const types = new Set(sources.map((s) => s.type));
    const diversityBonus = Math.min(0.15, (types.size - 1) * 0.05);

    // Coverage factor (more sources relative to max = better coverage)
    const maxSources = query.maxSources ?? this.getDefaultMaxSources(query.depth);
    const coverageFactor = Math.min(1, sources.length / maxSources);
    const coverageBonus = coverageFactor * 0.1;

    return Math.min(1, avgRelevance + diversityBonus + coverageBonus);
  }

  private extractKeyFindings(sources: ResearchSource[], query: ResearchQuery): string[] {
    if (sources.length === 0) return [];

    const findings: string[] = [];
    const queryTerms = new Set(tokenize(query.topic));

    for (const source of sources.slice(0, 5)) {
      // Extract the most relevant sentence from each top source
      const sentences = source.content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
      let bestSentence = '';
      let bestScore = -1;

      for (const sentence of sentences) {
        const sentenceTerms = tokenize(sentence);
        const overlap = sentenceTerms.filter((t) => queryTerms.has(t)).length;
        if (overlap > bestScore) {
          bestScore = overlap;
          bestSentence = sentence.trim();
        }
      }

      if (bestSentence) {
        findings.push(bestSentence);
      }
    }

    return findings;
  }

  private buildCrossReferenceIndex(sources: ResearchSource[]): void {
    for (const source of sources) {
      const terms = [...new Set(tokenize(source.content + ' ' + source.title))];
      for (let i = 0; i < terms.length; i++) {
        if (!this.crossReferenceIndex.has(terms[i])) {
          this.crossReferenceIndex.set(terms[i], new Set());
        }
        const termSet = this.crossReferenceIndex.get(terms[i])!;
        for (let j = 0; j < terms.length; j++) {
          if (i !== j) {
            termSet.add(terms[j]);
          }
        }
      }
    }
  }

  private getNextSubQueries(results: ResearchResult[], query: ResearchQuery): string[] {
    if (this.strategies.length === 0) return [];

    const allSuggestions: string[] = [];
    for (const strategy of this.strategies) {
      const suggestions = strategy.suggestNextSteps(results, query);
      allSuggestions.push(...suggestions);
    }

    // Deduplicate
    return [...new Set(allSuggestions)];
  }

  private mergeResults(
    query: ResearchQuery,
    allSources: ResearchSource[],
    allResults: ResearchResult[],
  ): ResearchResult {
    // Deduplicate and re-rank sources
    const ranked = [...allSources].sort((a, b) => b.relevance - a.relevance);
    const maxSources = query.maxSources ?? this.getDefaultMaxSources(query.depth);
    const finalSources = ranked.slice(0, maxSources);

    const confidence = this.computeConfidence(finalSources, query);
    const keyFindings = this.mergeKeyFindings(allResults);
    const crossRefs = this.getCrossReferences(query.topic);

    const summary = this.buildIterativeSummary(query, finalSources, allResults.length);

    return {
      query,
      sources: finalSources,
      summary,
      confidence,
      timestamp: new Date(),
      keyFindings,
      crossReferences: crossRefs.size > 0 ? crossRefs : undefined,
    };
  }

  private mergeKeyFindings(results: ResearchResult[]): string[] {
    const findings: string[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      for (const finding of result.keyFindings ?? []) {
        const normalized = finding.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          findings.push(finding);
        }
      }
    }
    return findings.slice(0, 10);
  }

  private clusterSourcesByClaim(
    sources: ResearchSource[],
    topic: string,
  ): Array<{ claim: string; sources: ResearchSource[] }> {
    if (sources.length === 0) return [];

    // Group sources by their primary type for claim generation
    const byType = new Map<string, ResearchSource[]>();
    for (const source of sources) {
      const existing = byType.get(source.type) ?? [];
      existing.push(source);
      byType.set(source.type, existing);
    }

    const clusters: Array<{ claim: string; sources: ResearchSource[] }> = [];
    for (const [type, typeSources] of byType) {
      if (typeSources.length > 0) {
        clusters.push({
          claim: `${topic} is supported by ${typeSources.length} ${type} source(s)`,
          sources: typeSources,
        });
      }
    }

    // Also create a cluster for high-relevance sources
    const highRelevance = sources.filter((s) => s.relevance >= 0.8);
    if (highRelevance.length > 0) {
      clusters.push({
        claim: `${topic} has strong evidence from ${highRelevance.length} highly relevant source(s)`,
        sources: highRelevance,
      });
    }

    return clusters;
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

  private buildIterativeSummary(
    query: ResearchQuery,
    sources: ResearchSource[],
    rounds: number,
  ): string {
    if (sources.length === 0) {
      return `No relevant sources found for "${query.topic}" after ${rounds} research round(s).`;
    }
    const typeGroups = new Map<string, number>();
    for (const source of sources) {
      typeGroups.set(source.type, (typeGroups.get(source.type) ?? 0) + 1);
    }
    const typeSummary = [...typeGroups.entries()]
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    return `Iterative research on "${query.topic}" (${query.depth}): ${rounds} round(s), ${sources.length} sources (${typeSummary}).`;
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
