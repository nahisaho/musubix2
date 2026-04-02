import { describe, it, expect, beforeEach } from 'vitest';
import {
  SkillWorkflowBridge,
  createSkillWorkflowBridge,
  type SkillPhaseMapping,
} from '../src/skill-bridge.js';

describe('DES-AGT-003: SkillWorkflowBridge', () => {
  let bridge: SkillWorkflowBridge;

  beforeEach(() => {
    bridge = createSkillWorkflowBridge();
  });

  it('should register a mapping', () => {
    const mapping: SkillPhaseMapping = {
      skillName: 'linter',
      phases: ['implementation'],
      autoTrigger: true,
    };
    bridge.registerMapping(mapping);
    expect(bridge.getMappings()).toHaveLength(1);
  });

  it('should get skills for a specific phase', () => {
    bridge.registerMapping({ skillName: 'linter', phases: ['implementation'], autoTrigger: true });
    bridge.registerMapping({ skillName: 'formatter', phases: ['implementation', 'completion'], autoTrigger: false });
    bridge.registerMapping({ skillName: 'reviewer', phases: ['design'], autoTrigger: true });

    const implSkills = bridge.getSkillsForPhase('implementation');
    expect(implSkills).toHaveLength(2);
    expect(implSkills.map((s) => s.skillName)).toContain('linter');
    expect(implSkills.map((s) => s.skillName)).toContain('formatter');
  });

  it('should return empty array for unmatched phase', () => {
    bridge.registerMapping({ skillName: 'linter', phases: ['implementation'], autoTrigger: true });
    expect(bridge.getSkillsForPhase('requirements')).toHaveLength(0);
  });

  it('should check autoTrigger correctly', () => {
    bridge.registerMapping({ skillName: 'linter', phases: ['implementation'], autoTrigger: true });
    bridge.registerMapping({ skillName: 'formatter', phases: ['implementation'], autoTrigger: false });

    expect(bridge.shouldAutoTrigger('linter', 'implementation')).toBe(true);
    expect(bridge.shouldAutoTrigger('formatter', 'implementation')).toBe(false);
  });

  it('should return false for autoTrigger on wrong phase', () => {
    bridge.registerMapping({ skillName: 'linter', phases: ['implementation'], autoTrigger: true });
    expect(bridge.shouldAutoTrigger('linter', 'design')).toBe(false);
  });

  it('should return false for autoTrigger on unknown skill', () => {
    expect(bridge.shouldAutoTrigger('nonexistent', 'implementation')).toBe(false);
  });

  it('should overwrite mapping on re-register', () => {
    bridge.registerMapping({ skillName: 'linter', phases: ['implementation'], autoTrigger: true });
    bridge.registerMapping({ skillName: 'linter', phases: ['design'], autoTrigger: false });
    const mappings = bridge.getMappings();
    expect(mappings).toHaveLength(1);
    expect(mappings[0].phases).toEqual(['design']);
  });
});
