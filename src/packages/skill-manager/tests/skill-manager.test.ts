import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SkillRegistry,
  SkillManager,
  createSkillRegistry,
  createSkillManager,
  type Skill,
  type SkillMetadata,
} from '../src/index.js';

function createTestSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: overrides.id ?? 'skill-1',
    metadata: overrides.metadata ?? {
      name: 'Test Skill',
      version: '1.0.0',
      description: 'A test skill',
      triggers: ['test', 'check'],
    },
    status: overrides.status ?? 'available',
    execute: overrides.execute ?? (async (input) => ({ result: 'ok', ...input })),
  };
}

describe('DES-AGT-004: SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = createSkillRegistry();
  });

  it('should register and retrieve a skill', () => {
    const skill = createTestSkill();
    registry.register(skill);
    const found = registry.get('skill-1');
    expect(found).toBeDefined();
    expect(found?.metadata.name).toBe('Test Skill');
  });

  it('should return undefined for unknown skill', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should unregister a skill', () => {
    registry.register(createTestSkill());
    expect(registry.unregister('skill-1')).toBe(true);
    expect(registry.get('skill-1')).toBeUndefined();
  });

  it('should return false when unregistering unknown skill', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('should list all skills', () => {
    registry.register(createTestSkill({ id: 'a' }));
    registry.register(createTestSkill({ id: 'b' }));
    expect(registry.list()).toHaveLength(2);
  });

  it('should filter skills by status', () => {
    registry.register(createTestSkill({ id: 'a', status: 'available' }));
    registry.register(createTestSkill({ id: 'b', status: 'disabled' }));
    registry.register(createTestSkill({ id: 'c', status: 'error' }));
    expect(registry.list('available')).toHaveLength(1);
    expect(registry.list('disabled')).toHaveLength(1);
  });

  it('should findByTrigger with substring match', () => {
    registry.register(createTestSkill({
      id: 'a',
      metadata: { name: 'Lint', version: '1.0.0', description: '', triggers: ['lint', 'eslint'] },
    }));
    registry.register(createTestSkill({
      id: 'b',
      metadata: { name: 'Format', version: '1.0.0', description: '', triggers: ['format', 'prettier'] },
    }));
    const found = registry.findByTrigger('lint');
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('a');
  });

  it('should findByTrigger case-insensitively', () => {
    registry.register(createTestSkill({
      id: 'a',
      metadata: { name: 'Deploy', version: '1.0.0', description: '', triggers: ['Deploy', 'CI/CD'] },
    }));
    const found = registry.findByTrigger('deploy');
    expect(found).toHaveLength(1);
  });

  it('should enable a disabled skill', () => {
    const skill = createTestSkill({ status: 'disabled' });
    registry.register(skill);
    registry.enable('skill-1');
    expect(registry.get('skill-1')?.status).toBe('available');
  });

  it('should disable an available skill', () => {
    registry.register(createTestSkill({ status: 'available' }));
    registry.disable('skill-1');
    expect(registry.get('skill-1')?.status).toBe('disabled');
  });

  it('should throw when enabling unknown skill', () => {
    expect(() => registry.enable('bad')).toThrow('Skill not found');
  });

  it('should throw when disabling unknown skill', () => {
    expect(() => registry.disable('bad')).toThrow('Skill not found');
  });

  it('should execute a skill', async () => {
    const executor = vi.fn(async () => ({ answer: 42 }));
    registry.register(createTestSkill({ execute: executor }));
    const result = await registry.execute('skill-1', { question: 'what' });
    expect(result).toEqual({ answer: 42 });
    expect(executor).toHaveBeenCalledWith({ question: 'what' });
  });

  it('should throw when executing unknown skill', async () => {
    await expect(registry.execute('bad', {})).rejects.toThrow('Skill not found');
  });

  it('should throw when executing disabled skill', async () => {
    registry.register(createTestSkill({ status: 'disabled' }));
    await expect(registry.execute('skill-1', {})).rejects.toThrow('Skill is disabled');
  });
});

describe('DES-AGT-004: SkillManager', () => {
  let manager: SkillManager;
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = createSkillRegistry();
    manager = new SkillManager(registry);
  });

  it('should loadFromMetadata and register skill', () => {
    const metadata: SkillMetadata = {
      name: 'Formatter',
      version: '2.0.0',
      description: 'Code formatter',
      triggers: ['format', 'prettify'],
    };
    const executor = async () => ({ formatted: true });
    const skill = manager.loadFromMetadata(metadata, executor);
    expect(skill.id).toBeTruthy();
    expect(skill.metadata.name).toBe('Formatter');
    expect(skill.status).toBe('available');
    expect(registry.get(skill.id)).toBeDefined();
  });

  it('should getAvailableSkills', () => {
    registry.register(createTestSkill({ id: 'a', status: 'available' }));
    registry.register(createTestSkill({ id: 'b', status: 'disabled' }));
    const available = manager.getAvailableSkills();
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('a');
  });

  it('should matchSkill by trigger', () => {
    registry.register(createTestSkill({
      id: 'lint-skill',
      metadata: { name: 'Linter', version: '1.0.0', description: '', triggers: ['lint', 'eslint'] },
    }));
    registry.register(createTestSkill({
      id: 'fmt-skill',
      metadata: { name: 'Formatter', version: '1.0.0', description: '', triggers: ['format'] },
    }));
    const match = manager.matchSkill('please lint my code');
    expect(match).not.toBeNull();
    expect(match?.id).toBe('lint-skill');
  });

  it('should return null when no skill matches', () => {
    registry.register(createTestSkill());
    const match = manager.matchSkill('quantum computing');
    expect(match).toBeNull();
  });

  it('should not match disabled skills', () => {
    registry.register(createTestSkill({ id: 'dis', status: 'disabled' }));
    const match = manager.matchSkill('test check');
    expect(match).toBeNull();
  });

  it('should create manager via factory', () => {
    const mgr = createSkillManager();
    expect(mgr).toBeInstanceOf(SkillManager);
  });
});
