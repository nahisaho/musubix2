/**
 * @musubix2/wake-sleep — Wake-Sleep Cycle management
 *
 * DES-LRN-002 (P7-02): Wake-Sleepサイクル
 * Wakeフェーズでパターン抽出、Sleepフェーズで統合・プルーニング。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CyclePhase = 'wake' | 'sleep';

export interface WakePhaseResult {
  processedItems: number;
  newPatterns: string[];
  duration: number;
}

export interface SleepPhaseResult {
  consolidatedPatterns: number;
  prunedPatterns: number;
  duration: number;
}

export interface CycleConfig {
  wakeIntervalMs: number;
  sleepIntervalMs: number;
  maxPatternsPerCycle: number;
}

export const DEFAULT_CYCLE_CONFIG: CycleConfig = {
  wakeIntervalMs: 60000,
  sleepIntervalMs: 300000,
  maxPatternsPerCycle: 100,
};

// ---------------------------------------------------------------------------
// Tokenization helpers
// ---------------------------------------------------------------------------

const WAKE_TOKEN_RE = /[a-z0-9]+/g;

function wakeTokenize(text: string): string[] {
  return (text.toLowerCase().match(WAKE_TOKEN_RE) ?? []).filter((w) => w.length > 2);
}

/** Extract n-grams of a given size from a token list. */
function extractNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Compute Pointwise Mutual Information for bigrams.
 * PMI(x,y) = log2(P(x,y) / (P(x) * P(y)))
 */
function computePMI(
  ngramFreq: Map<string, number>,
  unigramFreq: Map<string, number>,
  totalUnigrams: number,
  totalBigrams: number,
): Map<string, number> {
  const pmi = new Map<string, number>();
  for (const [ngram, count] of ngramFreq) {
    const parts = ngram.split(' ');
    if (parts.length < 2) continue;

    const pXY = count / totalBigrams;
    let pIndep = 1;
    for (const part of parts) {
      pIndep *= (unigramFreq.get(part) ?? 1) / totalUnigrams;
    }
    if (pIndep > 0 && pXY > 0) {
      pmi.set(ngram, Math.log2(pXY / pIndep));
    }
  }
  return pmi;
}

// ---------------------------------------------------------------------------
// WakePhase — Statistical pattern extraction with TF-IDF + N-grams + PMI
// ---------------------------------------------------------------------------

export class WakePhase {
  process(items: string[]): WakePhaseResult {
    const start = Date.now();

    // Tokenize all items
    const allTokensByItem: string[][] = items.map(wakeTokenize);
    const totalItems = items.length;

    // 1. Compute TF-IDF for unigrams
    const docFreq = new Map<string, number>();
    const globalFreq = new Map<string, number>();
    let totalUnigrams = 0;

    for (const tokens of allTokensByItem) {
      const seen = new Set<string>();
      for (const t of tokens) {
        globalFreq.set(t, (globalFreq.get(t) ?? 0) + 1);
        totalUnigrams++;
        if (!seen.has(t)) {
          seen.add(t);
          docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
        }
      }
    }

    // Score unigrams by TF-IDF (averaged across documents)
    const unigramScores = new Map<string, number>();
    for (const [term, df] of docFreq) {
      const idf = Math.log((totalItems + 1) / (df + 1));
      const tf = (globalFreq.get(term) ?? 0) / totalUnigrams;
      unigramScores.set(term, tf * idf);
    }

    // 2. Extract n-grams (bigrams, trigrams) and compute frequencies
    const bigramFreq = new Map<string, number>();
    const trigramFreq = new Map<string, number>();
    let totalBigrams = 0;

    for (const tokens of allTokensByItem) {
      for (const bg of extractNgrams(tokens, 2)) {
        bigramFreq.set(bg, (bigramFreq.get(bg) ?? 0) + 1);
        totalBigrams++;
      }
      for (const tg of extractNgrams(tokens, 3)) {
        trigramFreq.set(tg, (trigramFreq.get(tg) ?? 0) + 1);
      }
    }

    // 3. Rank multi-word patterns by PMI
    const bigramPMI = totalBigrams > 0
      ? computePMI(bigramFreq, globalFreq, totalUnigrams, totalBigrams)
      : new Map<string, number>();

    // 4. Collect all candidate patterns with scores
    const patternScores = new Map<string, number>();

    // Add unigrams that appear more than once (preserving old contract)
    for (const [term, score] of unigramScores) {
      if ((globalFreq.get(term) ?? 0) > 1) {
        patternScores.set(term, score);
      }
    }

    // Add significant bigrams (PMI > 0 means co-occurrence above chance)
    for (const [bg, pmi] of bigramPMI) {
      if (pmi > 0 && (bigramFreq.get(bg) ?? 0) > 1) {
        patternScores.set(bg, pmi);
      }
    }

    // Add frequent trigrams
    for (const [tg, count] of trigramFreq) {
      if (count > 1) {
        patternScores.set(tg, count);
      }
    }

    // 5. Sort by score descending
    const newPatterns = [...patternScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern);

    return {
      processedItems: items.length,
      newPatterns,
      duration: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// SleepPhase — Jaccard clustering + probabilistic pruning
// ---------------------------------------------------------------------------

/** Compute Jaccard similarity between two sets of characters/tokens. */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class SleepPhase {
  consolidate(patterns: string[]): SleepPhaseResult {
    const start = Date.now();
    const freq = new Map<string, number>();

    for (const p of patterns) {
      const normalized = p.trim().toLowerCase();
      if (normalized.length === 0) {
        continue;
      }
      freq.set(normalized, (freq.get(normalized) ?? 0) + 1);
    }

    // 1. Prune patterns that appear only once (low-frequency)
    let prunedCount = 0;
    const surviving: string[] = [];
    for (const [pattern, count] of freq) {
      if (count <= 1) {
        prunedCount++;
      } else {
        surviving.push(pattern);
      }
    }

    // 2. Cluster similar patterns using Jaccard similarity (threshold 0.5)
    const SIMILARITY_THRESHOLD = 0.5;
    const clusters: string[][] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < surviving.length; i++) {
      if (assigned.has(i)) continue;
      const cluster = [surviving[i]];
      assigned.add(i);

      for (let j = i + 1; j < surviving.length; j++) {
        if (assigned.has(j)) continue;
        if (jaccardSimilarity(surviving[i], surviving[j]) >= SIMILARITY_THRESHOLD) {
          cluster.push(surviving[j]);
          assigned.add(j);
        }
      }
      clusters.push(cluster);
    }

    // 3. Merge clusters: keep the representative with highest frequency
    const consolidated = new Set<string>();
    for (const cluster of clusters) {
      // Pick the pattern with the highest frequency as representative
      let bestPattern = cluster[0];
      let bestFreq = freq.get(cluster[0]) ?? 0;
      for (let i = 1; i < cluster.length; i++) {
        const f = freq.get(cluster[i]) ?? 0;
        if (f > bestFreq) {
          bestFreq = f;
          bestPattern = cluster[i];
        }
      }
      consolidated.add(bestPattern);
    }

    return {
      consolidatedPatterns: consolidated.size,
      prunedPatterns: prunedCount,
      duration: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// CycleManager
// ---------------------------------------------------------------------------

export class CycleManager {
  private phase: CyclePhase = 'wake';
  private config: CycleConfig;
  private wakePhase: WakePhase;
  private sleepPhase: SleepPhase;
  private cycleCount = 0;

  constructor(config: CycleConfig = DEFAULT_CYCLE_CONFIG) {
    this.config = { ...config };
    this.wakePhase = new WakePhase();
    this.sleepPhase = new SleepPhase();
  }

  getCurrentPhase(): CyclePhase {
    return this.phase;
  }

  runWake(items: string[]): WakePhaseResult {
    this.phase = 'wake';
    const limited = items.slice(0, this.config.maxPatternsPerCycle);
    const result = this.wakePhase.process(limited);
    this.phase = 'sleep';
    this.cycleCount++;
    return result;
  }

  runSleep(patterns: string[]): SleepPhaseResult {
    this.phase = 'sleep';
    const result = this.sleepPhase.consolidate(patterns);
    this.phase = 'wake';
    return result;
  }

  getConfig(): CycleConfig {
    return { ...this.config };
  }

  getCycleCount(): number {
    return this.cycleCount;
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createCycleManager(config?: Partial<CycleConfig>): CycleManager {
  return new CycleManager(config ? { ...DEFAULT_CYCLE_CONFIG, ...config } : undefined);
}

export function createWakePhase(): WakePhase {
  return new WakePhase();
}

export function createSleepPhase(): SleepPhase {
  return new SleepPhase();
}
