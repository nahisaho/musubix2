import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileKnowledgeStore, createKnowledgeStore } from '../src/index.js';
import type { Entity, Relation } from '../src/index.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('REQ-KNW-001: FileKnowledgeStore', () => {
  let store: FileKnowledgeStore;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'musubix2-knowledge-'));
    store = new FileKnowledgeStore(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function createEntity(id: string, type: string = 'requirement'): Entity {
    return {
      id,
      type: type as Entity['type'],
      name: `Entity ${id}`,
      description: `Description for ${id}`,
      properties: {},
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  it('should put and get entities', async () => {
    const entity = createEntity('e1');
    await store.putEntity(entity);
    const retrieved = await store.getEntity('e1');
    expect(retrieved?.name).toBe('Entity e1');
  });

  it('should return undefined for missing entity', async () => {
    expect(await store.getEntity('missing')).toBeUndefined();
  });

  it('should delete entities and their relations', async () => {
    await store.putEntity(createEntity('e1'));
    await store.putEntity(createEntity('e2'));
    await store.addRelation({ id: 'r1', source: 'e1', target: 'e2', type: 'traces_to' });
    
    expect(await store.deleteEntity('e1')).toBe(true);
    expect(await store.getEntity('e1')).toBeUndefined();
    const rels = await store.getRelations('e2');
    expect(rels).toHaveLength(0);
  });

  it('should add and get relations', async () => {
    await store.putEntity(createEntity('e1'));
    await store.putEntity(createEntity('e2'));
    const rel: Relation = { id: 'r1', source: 'e1', target: 'e2', type: 'implements' };
    await store.addRelation(rel);

    const outRels = await store.getRelations('e1', 'out');
    expect(outRels).toHaveLength(1);
    const inRels = await store.getRelations('e2', 'in');
    expect(inRels).toHaveLength(1);
    const bothRels = await store.getRelations('e1', 'both');
    expect(bothRels).toHaveLength(1);
  });

  it('should remove relations', async () => {
    await store.addRelation({ id: 'r1', source: 'e1', target: 'e2', type: 'traces_to' });
    expect(await store.removeRelation('r1')).toBe(true);
    expect(await store.removeRelation('nonexistent')).toBe(false);
  });

  it('should query entities by type', async () => {
    await store.putEntity(createEntity('req1', 'requirement'));
    await store.putEntity(createEntity('des1', 'design'));
    await store.putEntity(createEntity('req2', 'requirement'));

    const reqs = await store.query({ type: 'requirement' });
    expect(reqs).toHaveLength(2);
  });

  it('should query entities by text', async () => {
    await store.putEntity(createEntity('e1'));
    await store.putEntity({ ...createEntity('e2'), name: 'Special item' });

    const results = await store.query({ text: 'Special' });
    expect(results).toHaveLength(1);
  });

  it('should query with pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await store.putEntity(createEntity(`e${i}`));
    }
    const page = await store.query({ limit: 2, offset: 1 });
    expect(page).toHaveLength(2);
  });

  it('should search entities', async () => {
    await store.putEntity(createEntity('e1'));
    await store.putEntity({ ...createEntity('e2'), name: 'EARS Validator' });

    const results = await store.search('ears');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('e2');
  });

  it('should search with specific fields', async () => {
    await store.putEntity({ ...createEntity('e1'), tags: ['ears', 'validator'] });
    const byTag = await store.search('ears', { fields: ['tags'] });
    expect(byTag).toHaveLength(1);
  });

  it('should traverse graph', async () => {
    await store.putEntity(createEntity('a'));
    await store.putEntity(createEntity('b'));
    await store.putEntity(createEntity('c'));
    await store.addRelation({ id: 'r1', source: 'a', target: 'b', type: 'traces_to' });
    await store.addRelation({ id: 'r2', source: 'b', target: 'c', type: 'traces_to' });

    const result = await store.traverse('a', { depth: 2, direction: 'out' });
    expect(result).toHaveLength(3);
  });

  it('should get subgraph', async () => {
    await store.putEntity(createEntity('a'));
    await store.putEntity(createEntity('b'));
    await store.addRelation({ id: 'r1', source: 'a', target: 'b', type: 'implements' });

    const sub = await store.getSubgraph('a', 1);
    expect(Object.keys(sub.entities)).toHaveLength(2);
    expect(sub.relations).toHaveLength(1);
  });

  it('should save and load', async () => {
    await store.putEntity(createEntity('e1'));
    await store.save();

    const store2 = new FileKnowledgeStore(tmpDir);
    await store2.load();
    const entity = await store2.getEntity('e1');
    expect(entity?.name).toBe('Entity e1');
  });

  it('should get stats', async () => {
    await store.putEntity(createEntity('req1', 'requirement'));
    await store.putEntity(createEntity('des1', 'design'));
    await store.addRelation({ id: 'r1', source: 'req1', target: 'des1', type: 'traces_to' });

    const stats = store.getStats();
    expect(stats.entityCount).toBe(2);
    expect(stats.relationCount).toBe(1);
    expect(stats.types['requirement']).toBe(1);
    expect(stats.types['design']).toBe(1);
  });

  it('should create via factory', () => {
    const s = createKnowledgeStore(tmpDir);
    expect(s).toBeDefined();
  });
});
