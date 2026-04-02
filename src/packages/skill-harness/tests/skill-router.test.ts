import { describe, it, expect } from 'vitest';
import {
  SkillRouter,
  CapabilityMatcher,
  type SkillCapability,
} from '../src/skill-router.js';

function makeCap(overrides?: Partial<SkillCapability>): SkillCapability {
  return {
    skillId: 'test-skill',
    capabilities: ['code-review', 'analysis'],
    priority: 1,
    domains: ['typescript'],
    ...overrides,
  };
}

describe('DES-SKL-004: SkillRouter', () => {
  describe('CapabilityMatcher', () => {
    it('should match capabilities by keyword overlap', () => {
      const matcher = new CapabilityMatcher();
      const caps = [makeCap({ skillId: 'review', capabilities: ['code-review', 'lint'] })];
      const results = matcher.match('code review', caps);
      expect(results).toHaveLength(1);
      expect(results[0].skillId).toBe('review');
      expect(results[0].matchedCapabilities).toContain('code-review');
    });

    it('should return empty for no match', () => {
      const matcher = new CapabilityMatcher();
      const caps = [makeCap({ capabilities: ['deploy'] })];
      const results = matcher.match('testing', caps);
      expect(results).toHaveLength(0);
    });

    it('should sort results by confidence descending', () => {
      const matcher = new CapabilityMatcher();
      const caps = [
        makeCap({ skillId: 'a', capabilities: ['code', 'deploy', 'build'], priority: 0 }),
        makeCap({ skillId: 'b', capabilities: ['code-review'], priority: 5 }),
      ];
      const results = matcher.match('code review', caps);
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].skillId).toBe('b');
    });
  });

  describe('SkillRouter', () => {
    it('should register and retrieve capabilities', () => {
      const router = new SkillRouter();
      router.register(makeCap({ skillId: 'a' }));
      router.register(makeCap({ skillId: 'b' }));
      expect(router.getCapabilities()).toHaveLength(2);
    });

    it('should unregister a skill', () => {
      const router = new SkillRouter();
      router.register(makeCap({ skillId: 'a' }));
      expect(router.unregister('a')).toBe(true);
      expect(router.getCapabilities()).toHaveLength(0);
    });

    it('should return false for unregistering unknown skill', () => {
      const router = new SkillRouter();
      expect(router.unregister('nonexistent')).toBe(false);
    });

    it('should route to best matching skill', () => {
      const router = new SkillRouter();
      router.register(makeCap({ skillId: 'review', capabilities: ['code-review'], priority: 2 }));
      router.register(makeCap({ skillId: 'test', capabilities: ['testing'], priority: 1 }));
      const result = router.route('code review');
      expect(result).not.toBeNull();
      expect(result!.skillId).toBe('review');
    });

    it('should return null when no match', () => {
      const router = new SkillRouter();
      router.register(makeCap({ capabilities: ['deploy'] }));
      const result = router.route('quantum computing');
      expect(result).toBeNull();
    });

    it('should return all matches sorted', () => {
      const router = new SkillRouter();
      router.register(makeCap({ skillId: 'a', capabilities: ['code', 'analysis'] }));
      router.register(makeCap({ skillId: 'b', capabilities: ['code', 'review'] }));
      const results = router.routeAll('code analysis');
      expect(results.length).toBeGreaterThanOrEqual(1);
      // First result should have higher or equal confidence
      if (results.length >= 2) {
        expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence);
      }
    });

    it('should replace capability on re-register', () => {
      const router = new SkillRouter();
      router.register(makeCap({ skillId: 'a', capabilities: ['old'] }));
      router.register(makeCap({ skillId: 'a', capabilities: ['new'] }));
      expect(router.getCapabilities()).toHaveLength(1);
      expect(router.getCapabilities()[0].capabilities).toContain('new');
    });
  });
});
