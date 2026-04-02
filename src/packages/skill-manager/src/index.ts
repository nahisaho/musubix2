// DES-AGT-004: Skill Management
// REQ-AGT-004 traceability

import { randomUUID } from 'node:crypto';

// ── Types ──

export type SkillStatus = 'available' | 'disabled' | 'error';

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  triggers: string[];
}

export interface Skill {
  id: string;
  metadata: SkillMetadata;
  status: SkillStatus;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

// ── SkillRegistry ──

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  unregister(id: string): boolean {
    return this.skills.delete(id);
  }

  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  list(status?: SkillStatus): Skill[] {
    const all = Array.from(this.skills.values());
    if (status === undefined) {
      return all;
    }
    return all.filter((s) => s.status === status);
  }

  findByTrigger(trigger: string): Skill[] {
    const lowerTrigger = trigger.toLowerCase();
    return Array.from(this.skills.values()).filter((skill) =>
      skill.metadata.triggers.some((t) => t.toLowerCase().includes(lowerTrigger)),
    );
  }

  enable(id: string): void {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }
    skill.status = 'available';
  }

  disable(id: string): void {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }
    skill.status = 'disabled';
  }

  async execute(id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }
    if (skill.status === 'disabled') {
      throw new Error(`Skill is disabled: ${id}`);
    }
    return skill.execute(input);
  }
}

// ── SkillManager ──

export class SkillManager {
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
    this.registry = registry;
  }

  loadFromMetadata(metadata: SkillMetadata, executor: Skill['execute']): Skill {
    const skill: Skill = {
      id: randomUUID(),
      metadata,
      status: 'available',
      execute: executor,
    };
    this.registry.register(skill);
    return skill;
  }

  getAvailableSkills(): Skill[] {
    return this.registry.list('available');
  }

  matchSkill(query: string): Skill | null {
    const lowerQuery = query.toLowerCase();
    let bestSkill: Skill | null = null;
    let bestScore = 0;

    for (const skill of this.registry.list()) {
      if (skill.status !== 'available') {
        continue;
      }

      let score = 0;
      for (const trigger of skill.metadata.triggers) {
        if (lowerQuery.includes(trigger.toLowerCase())) {
          score += trigger.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestSkill = skill;
      }
    }

    return bestSkill;
  }
}

// ── Factories ──

export function createSkillRegistry(): SkillRegistry {
  return new SkillRegistry();
}

export function createSkillManager(): SkillManager {
  const registry = createSkillRegistry();
  return new SkillManager(registry);
}

export {
  SkillExecutor,
  createSkillExecutor,
  type SkillContext,
  type SkillResult,
  type SkillExecutionOptions,
} from './executor.js';
