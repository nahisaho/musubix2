import { describe, it, expect, beforeEach } from 'vitest';
import {
  NeuralSearchEngine,
  MockEmbeddingModel,
  createNeuralSearchEngine,
  createMockEmbeddingModel,
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
});
