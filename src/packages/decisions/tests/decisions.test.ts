import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DecisionManager, createDecisionManager } from '../src/index.js';
import type { ADRDraft } from '../src/index.js';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('REQ-DES-003: DecisionManager', () => {
  let manager: DecisionManager;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'musubix2-decisions-'));
    manager = new DecisionManager(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  const draft: ADRDraft = {
    title: 'Use TypeScript',
    context: 'Need type safety',
    decision: 'Adopt TypeScript',
    consequences: 'Better DX, build step required',
    relatedRequirements: ['REQ-ARC-001'],
  };

  it('should create an ADR with proposed status', async () => {
    const adr = await manager.create(draft);
    expect(adr.id).toBe('ADR-001');
    expect(adr.status).toBe('proposed');
    expect(adr.title).toBe('Use TypeScript');
  });

  it('should auto-increment IDs', async () => {
    await manager.create(draft);
    const adr2 = await manager.create({ ...draft, title: 'Second' });
    expect(adr2.id).toBe('ADR-002');
  });

  it('should get ADR by ID', async () => {
    await manager.create(draft);
    const adr = await manager.get('ADR-001');
    expect(adr?.title).toBe('Use TypeScript');
  });

  it('should return undefined for missing ADR', async () => {
    expect(await manager.get('ADR-999')).toBeUndefined();
  });

  it('should list all ADRs', async () => {
    await manager.create(draft);
    await manager.create({ ...draft, title: 'Second' });
    const list = await manager.list();
    expect(list).toHaveLength(2);
  });

  it('should filter by status', async () => {
    const adr = await manager.create(draft);
    await manager.accept(adr.id);
    await manager.create({ ...draft, title: 'Still proposed' });

    const accepted = await manager.list({ status: 'accepted' });
    expect(accepted).toHaveLength(1);
    expect(accepted[0].title).toBe('Use TypeScript');
  });

  it('should accept a proposed ADR', async () => {
    const adr = await manager.create(draft);
    const accepted = await manager.accept(adr.id);
    expect(accepted.status).toBe('accepted');
  });

  it('should reject accepting non-proposed ADR', async () => {
    const adr = await manager.create(draft);
    await manager.accept(adr.id);
    await expect(manager.accept(adr.id)).rejects.toThrow('Cannot accept');
  });

  it('should deprecate an accepted ADR', async () => {
    const adr = await manager.create(draft);
    await manager.accept(adr.id);
    const deprecated = await manager.deprecate(adr.id);
    expect(deprecated.status).toBe('deprecated');
  });

  it('should supersede an accepted ADR', async () => {
    const adr = await manager.create(draft);
    await manager.accept(adr.id);
    const superseded = await manager.deprecate(adr.id, 'ADR-002');
    expect(superseded.status).toBe('superseded');
    expect(superseded.supersededBy).toBe('ADR-002');
  });

  it('should reject deprecating non-accepted ADR', async () => {
    const adr = await manager.create(draft);
    await expect(manager.deprecate(adr.id)).rejects.toThrow('Cannot deprecate');
  });

  it('should search ADRs', async () => {
    await manager.create(draft);
    await manager.create({ ...draft, title: 'Use ESM', context: 'Need modules', decision: 'Adopt ESM' });
    const results = await manager.search('TypeScript');
    expect(results).toHaveLength(1);
  });

  it('should find by requirement', async () => {
    await manager.create(draft);
    await manager.create({ ...draft, title: 'Other', relatedRequirements: ['REQ-GOV-001'] });
    const results = await manager.findByRequirement('REQ-ARC-001');
    expect(results).toHaveLength(1);
  });

  it('should generate index', async () => {
    await manager.create(draft);
    const index = await manager.generateIndex();
    expect(index).toContain('ADR-001');
    expect(index).toContain('Use TypeScript');
  });

  it('should save ADR to file', async () => {
    await manager.create(draft);
    const filePath = join(tmpDir, 'decisions', 'ADR-001.md');
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('Use TypeScript');
    expect(content).toContain('proposed');
  });

  it('should create via factory', () => {
    const m = createDecisionManager(tmpDir);
    expect(m).toBeDefined();
  });
});
