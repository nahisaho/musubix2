/**
 * Repository abstractions
 *
 * Generic repository interfaces for domain entities.
 *
 * @module domain/interfaces/repository
 * @see REQ-ARC-004 — Repository pattern abstraction
 */

export interface IRepository<T, ID = string> {
  get(id: ID): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<boolean>;
  exists(id: ID): Promise<boolean>;
}

export interface ISearchableRepository<T, ID = string> extends IRepository<T, ID> {
  search(query: string): Promise<T[]>;
  findBy(criteria: Partial<T>): Promise<T[]>;
}

export interface IPaginatedRepository<T, ID = string> extends IRepository<T, ID> {
  getPage(page: number, size: number): Promise<PaginatedResult<T>>;
  count(): Promise<number>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
