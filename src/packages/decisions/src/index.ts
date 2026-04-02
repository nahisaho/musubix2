/**
 * @musubix2/decisions — ADR Manager
 *
 * Architecture Decision Record management with file-based storage,
 * status lifecycle, search, and index generation.
 *
 * @see DES-DES-003 — ADR management
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export type ADRStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';

export interface ADRDraft {
  title: string;
  context: string;
  decision: string;
  consequences: string;
  relatedRequirements?: string[];
}

export interface ADR {
  id: string;
  title: string;
  status: ADRStatus;
  date: string;
  context: string;
  decision: string;
  consequences: string;
  supersededBy?: string;
  relatedRequirements: string[];
}

export interface ADRFilter {
  status?: ADRStatus;
  search?: string;
}

export interface IDecisionManager {
  create(draft: ADRDraft): Promise<ADR>;
  get(id: string): Promise<ADR | undefined>;
  list(filter?: ADRFilter): Promise<ADR[]>;
  update(id: string, updates: Partial<ADR>): Promise<ADR>;
  accept(id: string): Promise<ADR>;
  deprecate(id: string, supersededBy?: string): Promise<ADR>;
  search(query: string): Promise<ADR[]>;
  findByRequirement(reqId: string): Promise<ADR[]>;
  generateIndex(): Promise<string>;
}

export const ADR_TEMPLATE = `# ADR-{id}: {title}

**Status**: {status}
**Date**: {date}

## Context
{context}

## Decision
{decision}

## Consequences
{consequences}
`;

export class DecisionManager implements IDecisionManager {
  private adrs: Map<string, ADR> = new Map();
  private basePath: string;
  private counter = 0;

  constructor(basePath: string) {
    this.basePath = join(basePath, 'decisions');
  }

  async create(draft: ADRDraft): Promise<ADR> {
    this.counter++;
    const id = `ADR-${String(this.counter).padStart(3, '0')}`;
    const adr: ADR = {
      id,
      title: draft.title,
      status: 'proposed',
      date: new Date().toISOString().split('T')[0],
      context: draft.context,
      decision: draft.decision,
      consequences: draft.consequences,
      relatedRequirements: draft.relatedRequirements ?? [],
    };
    this.adrs.set(id, adr);
    await this.saveADR(adr);
    return adr;
  }

  async get(id: string): Promise<ADR | undefined> {
    return this.adrs.get(id);
  }

  async list(filter?: ADRFilter): Promise<ADR[]> {
    let results = [...this.adrs.values()];
    if (filter?.status) {
      results = results.filter((a) => a.status === filter.status);
    }
    if (filter?.search) {
      const lower = filter.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(lower) ||
          a.context.toLowerCase().includes(lower) ||
          a.decision.toLowerCase().includes(lower),
      );
    }
    return results;
  }

  async update(id: string, updates: Partial<ADR>): Promise<ADR> {
    const adr = this.adrs.get(id);
    if (!adr) throw new Error(`ADR not found: ${id}`);
    const updated = { ...adr, ...updates, id: adr.id };
    this.adrs.set(id, updated);
    await this.saveADR(updated);
    return updated;
  }

  async accept(id: string): Promise<ADR> {
    const adr = this.adrs.get(id);
    if (!adr) throw new Error(`ADR not found: ${id}`);
    if (adr.status !== 'proposed') {
      throw new Error(`Cannot accept ADR in ${adr.status} status. Must be proposed.`);
    }
    return this.update(id, { status: 'accepted' });
  }

  async deprecate(id: string, supersededBy?: string): Promise<ADR> {
    const adr = this.adrs.get(id);
    if (!adr) throw new Error(`ADR not found: ${id}`);
    if (adr.status !== 'accepted') {
      throw new Error(`Cannot deprecate ADR in ${adr.status} status. Must be accepted.`);
    }
    const updates: Partial<ADR> = { status: 'deprecated' };
    if (supersededBy) {
      updates.supersededBy = supersededBy;
      updates.status = 'superseded';
    }
    return this.update(id, updates);
  }

  async search(query: string): Promise<ADR[]> {
    return this.list({ search: query });
  }

  async findByRequirement(reqId: string): Promise<ADR[]> {
    return [...this.adrs.values()].filter((a) =>
      a.relatedRequirements.includes(reqId),
    );
  }

  async generateIndex(): Promise<string> {
    const adrs = [...this.adrs.values()].sort((a, b) => a.id.localeCompare(b.id));
    const lines = ['# ADR Index', ''];
    lines.push('| ID | Title | Status | Date |');
    lines.push('|----|-------|--------|------|');
    for (const adr of adrs) {
      lines.push(`| ${adr.id} | ${adr.title} | ${adr.status} | ${adr.date} |`);
    }
    const index = lines.join('\n');
    await mkdir(this.basePath, { recursive: true });
    await writeFile(join(this.basePath, 'INDEX.md'), index, 'utf-8');
    return index;
  }

  private async saveADR(adr: ADR): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
    const content = ADR_TEMPLATE
      .replace('{id}', adr.id.replace('ADR-', ''))
      .replace('{title}', adr.title)
      .replace('{status}', adr.status)
      .replace('{date}', adr.date)
      .replace('{context}', adr.context)
      .replace('{decision}', adr.decision)
      .replace('{consequences}', adr.consequences);
    await writeFile(join(this.basePath, `${adr.id}.md`), content, 'utf-8');
  }
}

export function createDecisionManager(basePath: string): IDecisionManager {
  return new DecisionManager(basePath);
}
