/**
 * In-memory repository implementations
 *
 * @module infrastructure
 * @see REQ-ARC-002 — Library-first, testable implementations
 */

import type {
  IRepository,
  ISearchableRepository,
  IPaginatedRepository,
  PaginatedResult,
} from '../domain/interfaces/repository.js';

interface Identifiable {
  id: string;
}

export class InMemoryRepository<T extends Identifiable> implements IRepository<T, string> {
  protected store = new Map<string, T>();

  async get(id: string): Promise<T | undefined> {
    return this.store.get(id);
  }

  async getAll(): Promise<T[]> {
    return [...this.store.values()];
  }

  async save(entity: T): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }
}

export class InMemorySearchableRepository<T extends Identifiable & Record<string, unknown>>
  extends InMemoryRepository<T>
  implements ISearchableRepository<T, string>
{
  async search(query: string): Promise<T[]> {
    const lower = query.toLowerCase();
    return [...this.store.values()].filter((entity) => {
      return Object.values(entity).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(lower),
      );
    });
  }

  async findBy(criteria: Partial<T>): Promise<T[]> {
    return [...this.store.values()].filter((entity) => {
      return Object.entries(criteria).every(([key, value]) => entity[key] === value);
    });
  }
}

export class InMemoryPaginatedRepository<T extends Identifiable>
  extends InMemoryRepository<T>
  implements IPaginatedRepository<T, string>
{
  async getPage(page: number, size: number): Promise<PaginatedResult<T>> {
    const all = [...this.store.values()];
    const total = all.length;
    const totalPages = Math.ceil(total / size);
    const start = (page - 1) * size;
    const items = all.slice(start, start + size);

    return { items, total, page, pageSize: size, totalPages };
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}

// --- Factory functions ---

export function createInMemoryRepository<T extends Identifiable>(): InMemoryRepository<T> {
  return new InMemoryRepository<T>();
}

export function createInMemorySearchableRepository<
  T extends Identifiable & Record<string, unknown>,
>(): InMemorySearchableRepository<T> {
  return new InMemorySearchableRepository<T>();
}

export function createInMemoryPaginatedRepository<
  T extends Identifiable,
>(): InMemoryPaginatedRepository<T> {
  return new InMemoryPaginatedRepository<T>();
}
