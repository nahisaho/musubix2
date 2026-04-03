/**
 * @musubix2/neural-search — Embedding-based similarity search
 *
 * DES-LRN-004 (P7-01): ニューラルサーチ
 * 埋め込みベースの類似度検索エンジン。コサイン類似度による近傍探索を提供する。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmbeddingVector = number[];

export interface IEmbeddingModel {
  embed(text: string): Promise<EmbeddingVector>;
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
  dimensions: number;
}

export interface SearchIndex {
  id: string;
  vector: EmbeddingVector;
  metadata: Record<string, unknown>;
}

export interface SearchHit {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// MockEmbeddingModel
// ---------------------------------------------------------------------------

/**
 * @deprecated Use {@link TfIdfEmbeddingModel} for real TF-IDF embeddings.
 * MockEmbeddingModel generates pseudo-random vectors unrelated to input text.
 */
export class MockEmbeddingModel implements IEmbeddingModel {
  readonly dimensions: number;
  private _seed: number;

  constructor(dimensions = 128) {
    this.dimensions = dimensions;
    this._seed = 42;
  }

  private _pseudoRandom(): number {
    this._seed = (this._seed * 16807 + 0) % 2147483647;
    return this._seed / 2147483647;
  }

  private _generateVector(): EmbeddingVector {
    const vec: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      vec.push(this._pseudoRandom() * 2 - 1);
    }
    return vec;
  }

  async embed(_text: string): Promise<EmbeddingVector> {
    return this._generateVector();
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map(() => this._generateVector());
  }
}

// ---------------------------------------------------------------------------
// TfIdfEmbeddingModel
// ---------------------------------------------------------------------------

const TOKEN_RE = /[a-z0-9]+/g;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []);
}

/**
 * Real TF-IDF vectorizer that produces semantically meaningful embeddings.
 * Similar texts produce similar vectors (high cosine similarity).
 * Uses the hashing trick to project TF-IDF scores to fixed dimensions.
 */
export class TfIdfEmbeddingModel implements IEmbeddingModel {
  readonly dimensions: number;
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private documentCount = 0;
  private documentFrequency: Map<string, number> = new Map();

  constructor(dimensions: number = 128) {
    this.dimensions = dimensions;
  }

  /** Build vocabulary and IDF scores from a corpus of documents. */
  fit(documents: string[]): void {
    this.documentCount = documents.length;
    this.documentFrequency.clear();
    this.vocabulary.clear();
    this.idfScores.clear();

    let vocabIndex = 0;

    for (const doc of documents) {
      const tokens = tokenize(doc);
      const seen = new Set<string>();
      for (const token of tokens) {
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, vocabIndex++);
        }
        if (!seen.has(token)) {
          seen.add(token);
          this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
        }
      }
    }

    for (const [term, df] of this.documentFrequency) {
      this.idfScores.set(term, Math.log(this.documentCount / df));
    }
  }

  /** Get current vocabulary size. */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    return this._computeVector(text);
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map((t) => this._computeVector(t));
  }

  private _computeVector(text: string): EmbeddingVector {
    const tokens = tokenize(text);
    const vec = new Array<number>(this.dimensions).fill(0);

    if (tokens.length === 0) return vec;

    // Compute term frequencies
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    // Compute TF-IDF and project via hashing trick
    for (const [term, count] of tf) {
      const termFreq = count / tokens.length;
      const idf = this.idfScores.get(term) ?? Math.log(this.documentCount + 1);
      const tfidf = termFreq * idf;

      // Hashing trick: deterministic bucket assignment
      const bucket = this._hash(term) % this.dimensions;
      // Sign hash for variance reduction
      const sign = this._signHash(term) ? 1 : -1;
      vec[bucket] += sign * tfidf;
    }

    return vec;
  }

  /** FNV-1a hash for deterministic bucket assignment. */
  private _hash(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0);
  }

  /** Separate hash for sign determination. */
  private _signHash(str: string): boolean {
    let h = 0x6c62272e;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x5bd1e995);
    }
    return (h >>> 0) % 2 === 0;
  }
}

// ---------------------------------------------------------------------------
// NeuralSearchEngine
// ---------------------------------------------------------------------------

function dotProduct(a: EmbeddingVector, b: EmbeddingVector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(v: EmbeddingVector): number {
  return Math.sqrt(dotProduct(v, v));
}

function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dotProduct(a, b) / (magA * magB);
}

export class NeuralSearchEngine {
  private index: SearchIndex[] = [];

  addDocument(id: string, vector: EmbeddingVector, metadata: Record<string, unknown> = {}): void {
    this.index.push({ id, vector, metadata });
  }

  search(queryVector: EmbeddingVector, topK: number): SearchHit[] {
    const scored = this.index.map((doc) => ({
      id: doc.id,
      score: cosineSimilarity(queryVector, doc.vector),
      metadata: doc.metadata,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  remove(id: string): boolean {
    const idx = this.index.findIndex((doc) => doc.id === id);
    if (idx === -1) {
      return false;
    }
    this.index.splice(idx, 1);
    return true;
  }

  size(): number {
    return this.index.length;
  }

  clear(): void {
    this.index = [];
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createNeuralSearchEngine(): NeuralSearchEngine {
  return new NeuralSearchEngine();
}

export function createMockEmbeddingModel(dimensions = 128): MockEmbeddingModel {
  return new MockEmbeddingModel(dimensions);
}

export function createTfIdfEmbeddingModel(dimensions = 128): TfIdfEmbeddingModel {
  return new TfIdfEmbeddingModel(dimensions);
}
