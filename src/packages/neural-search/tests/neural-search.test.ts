import { describe, it, expect, beforeEach } from 'vitest';
import {
  NeuralSearchEngine,
  MockEmbeddingModel,
  TfIdfEmbeddingModel,
  createNeuralSearchEngine,
  createMockEmbeddingModel,
  createTfIdfEmbeddingModel,
} from '../src/index.js';
import type { EmbeddingVector } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(v: EmbeddingVector): EmbeddingVector {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return mag === 0 ? v : v.map((x) => x / mag);
}

// ---------------------------------------------------------------------------
// DES-LRN-004: NeuralSearchEngine
// ---------------------------------------------------------------------------

describe('DES-LRN-004: NeuralSearchEngine', () => {
  let engine: NeuralSearchEngine;

  beforeEach(() => {
    engine = createNeuralSearchEngine();
  });

  it('should start empty', () => {
    expect(engine.size()).toBe(0);
  });

  it('should add documents and report correct size', () => {
    engine.addDocument('a', [1, 0, 0]);
    engine.addDocument('b', [0, 1, 0]);
    expect(engine.size()).toBe(2);
  });

  it('should return identical vector with score ~1.0', () => {
    const v = normalize([1, 2, 3]);
    engine.addDocument('x', v);
    const hits = engine.search(v, 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('x');
    expect(hits[0].score).toBeCloseTo(1.0, 5);
  });

  it('should return orthogonal vectors with score ~0.0', () => {
    engine.addDocument('x', [1, 0, 0]);
    engine.addDocument('y', [0, 1, 0]);
    const hits = engine.search([1, 0, 0], 2);
    expect(hits[0].id).toBe('x');
    expect(hits[0].score).toBeCloseTo(1.0);
    expect(hits[1].id).toBe('y');
    expect(hits[1].score).toBeCloseTo(0.0);
  });

  it('should rank most similar document first', () => {
    engine.addDocument('close', normalize([1, 1, 0]));
    engine.addDocument('far', normalize([0, 0, 1]));
    const hits = engine.search(normalize([1, 0.9, 0]), 2);
    expect(hits[0].id).toBe('close');
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it('should respect topK limit', () => {
    engine.addDocument('a', [1, 0, 0]);
    engine.addDocument('b', [0, 1, 0]);
    engine.addDocument('c', [0, 0, 1]);
    const hits = engine.search([1, 0, 0], 1);
    expect(hits).toHaveLength(1);
  });

  it('should remove a document', () => {
    engine.addDocument('a', [1, 0, 0]);
    engine.addDocument('b', [0, 1, 0]);
    expect(engine.remove('a')).toBe(true);
    expect(engine.size()).toBe(1);
    const hits = engine.search([1, 0, 0], 10);
    expect(hits.every((h) => h.id !== 'a')).toBe(true);
  });

  it('should return false when removing non-existent document', () => {
    expect(engine.remove('nonexistent')).toBe(false);
  });

  it('should clear all documents', () => {
    engine.addDocument('a', [1, 0]);
    engine.addDocument('b', [0, 1]);
    engine.clear();
    expect(engine.size()).toBe(0);
  });

  it('should preserve metadata in search results', () => {
    engine.addDocument('doc1', [1, 0], { title: 'Hello' });
    const hits = engine.search([1, 0], 1);
    expect(hits[0].metadata).toEqual({ title: 'Hello' });
  });

  it('should handle zero vectors gracefully', () => {
    engine.addDocument('zero', [0, 0, 0]);
    const hits = engine.search([1, 0, 0], 1);
    expect(hits[0].score).toBe(0);
  });

  it('should handle search on empty index', () => {
    const hits = engine.search([1, 0, 0], 5);
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-004: MockEmbeddingModel
// ---------------------------------------------------------------------------

describe('DES-LRN-004: MockEmbeddingModel', () => {
  it('should produce vectors of the correct dimension', async () => {
    const model = createMockEmbeddingModel(64);
    const vec = await model.embed('hello');
    expect(vec).toHaveLength(64);
    expect(model.dimensions).toBe(64);
  });

  it('should produce batch embeddings', async () => {
    const model = createMockEmbeddingModel(32);
    const vecs = await model.embedBatch(['a', 'b', 'c']);
    expect(vecs).toHaveLength(3);
    vecs.forEach((v) => expect(v).toHaveLength(32));
  });

  it('should default to 128 dimensions', () => {
    const model = new MockEmbeddingModel();
    expect(model.dimensions).toBe(128);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-004: Factory functions
// ---------------------------------------------------------------------------

describe('DES-LRN-004: Factory functions', () => {
  it('should create NeuralSearchEngine via factory', () => {
    expect(createNeuralSearchEngine()).toBeInstanceOf(NeuralSearchEngine);
  });

  it('should create MockEmbeddingModel via factory', () => {
    expect(createMockEmbeddingModel()).toBeInstanceOf(MockEmbeddingModel);
  });

  it('should create MockEmbeddingModel with custom dimensions', () => {
    const model = createMockEmbeddingModel(256);
    expect(model.dimensions).toBe(256);
  });

  it('should create TfIdfEmbeddingModel via factory', () => {
    const model = createTfIdfEmbeddingModel(64);
    expect(model).toBeInstanceOf(TfIdfEmbeddingModel);
    expect(model.dimensions).toBe(64);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-004: TfIdfEmbeddingModel
// ---------------------------------------------------------------------------

function cosine(a: EmbeddingVector, b: EmbeddingVector): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

describe('DES-LRN-004: TfIdfEmbeddingModel', () => {
  let model: TfIdfEmbeddingModel;

  beforeEach(() => {
    model = new TfIdfEmbeddingModel(64);
    model.fit([
      'the cat sat on the mat',
      'the dog played in the park',
      'machine learning is a subset of artificial intelligence',
      'neural networks are used in deep learning',
      'the cat and the dog played together',
    ]);
  });

  it('should produce consistent vectors for the same text', async () => {
    const v1 = await model.embed('the cat sat on the mat');
    const v2 = await model.embed('the cat sat on the mat');
    expect(v1).toEqual(v2);
  });

  // v0.5.76 — smoothed IDF: a single-document fit must not yield an all-zeros
  // vector (raw log(N/df) is 0 when every term appears in the only document).
  it('produces a non-zero embedding when fit on a single document', async () => {
    const solo = createTfIdfEmbeddingModel(64);
    solo.fit(['user authentication login']);
    const vec = await solo.embed('user authentication login');
    expect(vec.some((x) => x !== 0)).toBe(true);
  });

  it('should produce vectors of the correct dimension', async () => {
    const vec = await model.embed('hello world');
    expect(vec).toHaveLength(64);
    expect(model.dimensions).toBe(64);
  });

  it('should produce higher cosine similarity for similar texts than unrelated texts', async () => {
    const catMat = await model.embed('the cat sat on the mat');
    const catDog = await model.embed('the cat and the dog played together');
    const ml = await model.embed('machine learning is a subset of artificial intelligence');

    const simSimilar = cosine(catMat, catDog);
    const simUnrelated = cosine(catMat, ml);

    expect(simSimilar).toBeGreaterThan(simUnrelated);
  });

  // v0.5.47 — a fitted model must not conflate unrelated terms (no hash
  // collisions) nor let out-of-vocabulary query terms invent matches.
  it('gives zero similarity to a document sharing no terms', async () => {
    const catMat = await model.embed('the cat sat on the mat');
    const ml = await model.embed('machine learning is a subset of artificial intelligence');
    expect(cosine(catMat, ml)).toBeCloseTo(0, 5);
  });

  // v0.5.82 — a vocabulary larger than the base dimension (128) must not cause
  // `vocabIdx % dimensions` collisions that give unrelated docs spurious scores.
  it('stays collision-free when the vocabulary exceeds base dimensions', async () => {
    const big = createTfIdfEmbeddingModel(128);
    const corpus: string[] = [];
    for (let i = 0; i < 60; i++) {corpus.push(`alpha${i} beta${i} gamma${i}`);} // ~180 unique terms
    corpus.push('database sharding strategies for horizontal scaling');
    corpus.push('export function handler const value return result'); // no query terms
    big.fit(corpus);
    expect(big.dimensions).toBeGreaterThan(128);
    const q = await big.embed('database sharding');
    expect(cosine(q, await big.embed(corpus[corpus.length - 2]))).toBeGreaterThan(0.1); // db doc
    expect(cosine(q, await big.embed(corpus[corpus.length - 1]))).toBeCloseTo(0, 5); // code doc
  });

  it('ignores out-of-vocabulary query terms instead of scoring on them', async () => {
    // "purple" and "helicopter" are not in the corpus; only "cat" should count.
    const query = await model.embed('purple cat helicopter');
    const catMat = await model.embed('the cat sat on the mat');
    const ml = await model.embed('machine learning is a subset of artificial intelligence');
    expect(cosine(query, catMat)).toBeGreaterThan(0);
    expect(cosine(query, ml)).toBeCloseTo(0, 5);
  });

  it('ranks relevant documents above unrelated ones end-to-end', async () => {
    const engine = createNeuralSearchEngine();
    const docs: Array<[string, string]> = [
      ['d1', 'cache invalidation strategy for redis'],
      ['d2', 'user authentication with oauth tokens'],
      ['d3', 'redis cache eviction policy'],
    ];
    const m = new TfIdfEmbeddingModel(128);
    m.fit(docs.map((d) => d[1]));
    for (const [id, text] of docs) {
      engine.addDocument(id, await m.embed(text), { text });
    }
    const hits = engine.search(await m.embed('redis cache'), 3);
    expect([hits[0].id, hits[1].id].sort()).toEqual(['d1', 'd3']);
    expect(hits.find((h) => h.id === 'd2')!.score).toBeCloseTo(0, 5);
  });

  it('should update vocabulary when fit() is called', () => {
    const model2 = new TfIdfEmbeddingModel(32);
    expect(model2.getVocabularySize()).toBe(0);
    model2.fit(['hello world', 'world peace']);
    expect(model2.getVocabularySize()).toBeGreaterThan(0);
    expect(model2.getVocabularySize()).toBe(3); // hello, world, peace
  });

  it('should return correct count from embedBatch', async () => {
    const texts = ['cat', 'dog', 'bird', 'fish'];
    const vecs = await model.embedBatch(texts);
    expect(vecs).toHaveLength(4);
    vecs.forEach((v) => expect(v).toHaveLength(64));
  });

  it('should handle empty text', async () => {
    const vec = await model.embed('');
    expect(vec).toHaveLength(64);
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('should default to 128 dimensions', () => {
    const m = new TfIdfEmbeddingModel();
    expect(m.dimensions).toBe(128);
  });

  it('should work without calling fit (unseen terms get default IDF)', async () => {
    const unfitted = new TfIdfEmbeddingModel(32);
    const vec = await unfitted.embed('some random text');
    expect(vec).toHaveLength(32);
  });

  it('should integrate with NeuralSearchEngine for semantic search', async () => {
    const engine = createNeuralSearchEngine();
    const corpus = [
      'javascript programming language',
      'python programming language',
      'cooking recipes and food',
    ];

    model.fit(corpus);
    for (let i = 0; i < corpus.length; i++) {
      const vec = await model.embed(corpus[i]);
      engine.addDocument(`doc${i}`, vec);
    }

    const query = await model.embed('programming language syntax');
    const hits = engine.search(query, 3);
    // Programming-related docs should score higher than cooking
    const cookingHit = hits.find((h) => h.id === 'doc2')!;
    const jsHit = hits.find((h) => h.id === 'doc0')!;
    expect(jsHit.score).toBeGreaterThan(cookingHit.score);
  });
});
