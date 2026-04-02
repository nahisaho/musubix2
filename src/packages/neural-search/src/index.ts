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
  if (magA === 0 || magB === 0) return 0;
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
    if (idx === -1) return false;
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
