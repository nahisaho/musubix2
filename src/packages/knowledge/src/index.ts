/**
 * @musubix2/knowledge — Knowledge Graph
 *
 * File-based knowledge store with entity/relation management,
 * query, search, traversal, and subgraph extraction.
 *
 * @see DES-KNW-001 — FileKnowledgeStore
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export type EntityType =
  | 'requirement'
  | 'design'
  | 'task'
  | 'code'
  | 'decision'
  | 'pattern'
  | 'constraint';

export type RelationType =
  | 'implements'
  | 'depends_on'
  | 'traces_to'
  | 'related_to'
  | 'derives_from'
  | 'conflicts_with';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description?: string;
  properties: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  properties?: Record<string, unknown>;
}

export interface KnowledgeGraphData {
  version: '1.0.0';
  metadata: {
    lastModified: string;
    entityCount: number;
    relationCount: number;
  };
  entities: Record<string, Entity>;
  relations: Relation[];
}

export interface QueryFilter {
  type?: EntityType | EntityType[];
  tags?: string[];
  properties?: Record<string, unknown>;
  text?: string;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  fields?: ('name' | 'description' | 'tags')[];
  caseSensitive?: boolean;
  limit?: number;
}

export interface TraverseOptions {
  depth?: number;
  relationTypes?: RelationType[];
  direction?: 'out' | 'in' | 'both';
}

export interface KnowledgeStore {
  getEntity(id: string): Promise<Entity | undefined>;
  putEntity(entity: Entity): Promise<void>;
  deleteEntity(id: string): Promise<boolean>;
  addRelation(relation: Relation): Promise<void>;
  removeRelation(id: string): Promise<boolean>;
  getRelations(entityId: string, direction?: 'in' | 'out' | 'both'): Promise<Relation[]>;
  query(filter: QueryFilter): Promise<Entity[]>;
  search(text: string, options?: SearchOptions): Promise<Entity[]>;
  getSubgraph(rootId: string, depth: number): Promise<KnowledgeGraphData>;
  traverse(startId: string, options?: TraverseOptions): Promise<Entity[]>;
  save(): Promise<void>;
  load(): Promise<void>;
  getStats(): { entityCount: number; relationCount: number; types: Record<string, number> };
}

function createEmptyGraph(): KnowledgeGraphData {
  return {
    version: '1.0.0',
    metadata: { lastModified: new Date().toISOString(), entityCount: 0, relationCount: 0 },
    entities: {},
    relations: [],
  };
}

export class FileKnowledgeStore implements KnowledgeStore {
  private graph: KnowledgeGraphData;
  private filePath: string;

  constructor(basePath: string) {
    this.filePath = join(basePath, 'knowledge-graph.json');
    this.graph = createEmptyGraph();
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.graph = JSON.parse(raw) as KnowledgeGraphData;
    } catch {
      this.graph = createEmptyGraph();
    }
  }

  async save(): Promise<void> {
    this.graph.metadata.lastModified = new Date().toISOString();
    this.graph.metadata.entityCount = Object.keys(this.graph.entities).length;
    this.graph.metadata.relationCount = this.graph.relations.length;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.graph, null, 2), 'utf-8');
  }

  async getEntity(id: string): Promise<Entity | undefined> {
    return this.graph.entities[id];
  }

  async putEntity(entity: Entity): Promise<void> {
    entity.updatedAt = new Date().toISOString();
    if (!entity.createdAt) {
      entity.createdAt = entity.updatedAt;
    }
    this.graph.entities[entity.id] = entity;
  }

  async deleteEntity(id: string): Promise<boolean> {
    if (!this.graph.entities[id]) {
      return false;
    }
    delete this.graph.entities[id];
    this.graph.relations = this.graph.relations.filter((r) => r.source !== id && r.target !== id);
    return true;
  }

  async addRelation(relation: Relation): Promise<void> {
    this.graph.relations.push(relation);
  }

  async removeRelation(id: string): Promise<boolean> {
    const before = this.graph.relations.length;
    this.graph.relations = this.graph.relations.filter((r) => r.id !== id);
    return this.graph.relations.length < before;
  }

  async getRelations(
    entityId: string,
    direction: 'in' | 'out' | 'both' = 'both',
  ): Promise<Relation[]> {
    return this.graph.relations.filter((r) => {
      if (direction === 'out') {
        return r.source === entityId;
      }
      if (direction === 'in') {
        return r.target === entityId;
      }
      return r.source === entityId || r.target === entityId;
    });
  }

  async query(filter: QueryFilter): Promise<Entity[]> {
    let results = Object.values(this.graph.entities);

    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      results = results.filter((e) => types.includes(e.type));
    }

    if (filter.tags?.length) {
      results = results.filter((e) => filter.tags!.some((tag) => e.tags.includes(tag)));
    }

    if (filter.text) {
      const lower = filter.text.toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(lower) ||
          (e.description?.toLowerCase().includes(lower) ?? false),
      );
    }

    if (filter.properties) {
      results = results.filter((e) =>
        Object.entries(filter.properties!).every(([key, val]) => e.properties[key] === val),
      );
    }

    if (filter.offset) {
      results = results.slice(filter.offset);
    }
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async search(text: string, options?: SearchOptions): Promise<Entity[]> {
    const fields = options?.fields ?? ['name', 'description', 'tags'];
    const caseSensitive = options?.caseSensitive ?? false;
    const searchText = caseSensitive ? text : text.toLowerCase();

    let results = Object.values(this.graph.entities).filter((e) => {
      for (const field of fields) {
        if (field === 'name') {
          const val = caseSensitive ? e.name : e.name.toLowerCase();
          if (val.includes(searchText)) {
            return true;
          }
        }
        if (field === 'description' && e.description) {
          const val = caseSensitive ? e.description : e.description.toLowerCase();
          if (val.includes(searchText)) {
            return true;
          }
        }
        if (field === 'tags') {
          for (const tag of e.tags) {
            const val = caseSensitive ? tag : tag.toLowerCase();
            if (val.includes(searchText)) {
              return true;
            }
          }
        }
      }
      return false;
    });

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getSubgraph(rootId: string, depth: number): Promise<KnowledgeGraphData> {
    const visited = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: rootId, d: 0 }];
    const subEntities: Record<string, Entity> = {};
    const subRelations: Relation[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.d > depth) {
        continue;
      }
      visited.add(current.id);

      const entity = this.graph.entities[current.id];
      if (entity) {
        subEntities[current.id] = entity;
      }

      if (current.d < depth) {
        const rels = await this.getRelations(current.id);
        for (const rel of rels) {
          subRelations.push(rel);
          const neighborId = rel.source === current.id ? rel.target : rel.source;
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, d: current.d + 1 });
          }
        }
      }
    }

    return {
      version: '1.0.0',
      metadata: {
        lastModified: new Date().toISOString(),
        entityCount: Object.keys(subEntities).length,
        relationCount: subRelations.length,
      },
      entities: subEntities,
      relations: subRelations,
    };
  }

  async traverse(startId: string, options?: TraverseOptions): Promise<Entity[]> {
    const depth = options?.depth ?? 3;
    const direction = options?.direction ?? 'out';
    const relationTypes = options?.relationTypes;
    const visited = new Set<string>();
    const result: Entity[] = [];
    const queue: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.d > depth) {
        continue;
      }
      visited.add(current.id);

      const entity = this.graph.entities[current.id];
      if (entity) {
        result.push(entity);
      }

      if (current.d < depth) {
        let rels = await this.getRelations(current.id, direction);
        if (relationTypes) {
          rels = rels.filter((r) => relationTypes.includes(r.type));
        }
        for (const rel of rels) {
          const neighborId = rel.source === current.id ? rel.target : rel.source;
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, d: current.d + 1 });
          }
        }
      }
    }

    return result;
  }

  getStats(): { entityCount: number; relationCount: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    for (const entity of Object.values(this.graph.entities)) {
      types[entity.type] = (types[entity.type] ?? 0) + 1;
    }
    return {
      entityCount: Object.keys(this.graph.entities).length,
      relationCount: this.graph.relations.length,
      types,
    };
  }
}

export function createKnowledgeStore(basePath: string): KnowledgeStore {
  return new FileKnowledgeStore(basePath);
}
