import { describe, it, expect } from 'vitest';
import {
  InMemoryRepository,
  InMemorySearchableRepository,
  InMemoryPaginatedRepository,
  createInMemoryRepository,
} from '../../src/infrastructure/repository.js';

interface TestEntity {
  id: string;
  name: string;
  status: string;
}

describe('REQ-ARC-004: InMemoryRepository', () => {
  it('should save and get entities', async () => {
    const repo = new InMemoryRepository<TestEntity>();
    await repo.save({ id: '1', name: 'Test', status: 'active' });
    const result = await repo.get('1');
    expect(result?.name).toBe('Test');
  });

  it('should return undefined for missing entities', async () => {
    const repo = new InMemoryRepository<TestEntity>();
    expect(await repo.get('missing')).toBeUndefined();
  });

  it('should get all entities', async () => {
    const repo = new InMemoryRepository<TestEntity>();
    await repo.save({ id: '1', name: 'A', status: 'active' });
    await repo.save({ id: '2', name: 'B', status: 'active' });
    const all = await repo.getAll();
    expect(all).toHaveLength(2);
  });

  it('should delete entities', async () => {
    const repo = new InMemoryRepository<TestEntity>();
    await repo.save({ id: '1', name: 'A', status: 'active' });
    expect(await repo.delete('1')).toBe(true);
    expect(await repo.exists('1')).toBe(false);
  });

  it('should check existence', async () => {
    const repo = new InMemoryRepository<TestEntity>();
    expect(await repo.exists('x')).toBe(false);
    await repo.save({ id: 'x', name: 'X', status: 'active' });
    expect(await repo.exists('x')).toBe(true);
  });
});

describe('REQ-ARC-004: InMemorySearchableRepository', () => {
  it('should search by string fields', async () => {
    const repo = new InMemorySearchableRepository<TestEntity>();
    await repo.save({ id: '1', name: 'Alpha', status: 'active' });
    await repo.save({ id: '2', name: 'Beta', status: 'inactive' });

    const results = await repo.search('alpha');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('should findBy criteria', async () => {
    const repo = new InMemorySearchableRepository<TestEntity>();
    await repo.save({ id: '1', name: 'A', status: 'active' });
    await repo.save({ id: '2', name: 'B', status: 'inactive' });
    await repo.save({ id: '3', name: 'C', status: 'active' });

    const results = await repo.findBy({ status: 'active' });
    expect(results).toHaveLength(2);
  });
});

describe('REQ-ARC-004: InMemoryPaginatedRepository', () => {
  it('should paginate results', async () => {
    const repo = new InMemoryPaginatedRepository<TestEntity>();
    for (let i = 1; i <= 5; i++) {
      await repo.save({ id: `${i}`, name: `Item ${i}`, status: 'active' });
    }

    const page1 = await repo.getPage(1, 2);
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page1.page).toBe(1);

    const page3 = await repo.getPage(3, 2);
    expect(page3.items).toHaveLength(1);
  });

  it('should count entities', async () => {
    const repo = new InMemoryPaginatedRepository<TestEntity>();
    expect(await repo.count()).toBe(0);
    await repo.save({ id: '1', name: 'A', status: 'active' });
    expect(await repo.count()).toBe(1);
  });
});

describe('REQ-ARC-004: Factory functions', () => {
  it('should create repository via factory', async () => {
    const repo = createInMemoryRepository<TestEntity>();
    await repo.save({ id: '1', name: 'T', status: 'x' });
    expect(await repo.get('1')).toBeDefined();
  });
});
