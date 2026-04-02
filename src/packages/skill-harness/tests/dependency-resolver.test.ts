import { describe, it, expect } from 'vitest';
import {
  SkillVersionManager,
  SkillDependencyResolver,
  type SkillVersion,
  type SkillDependency,
} from '../src/dependency-resolver.js';

function v(major: number, minor: number, patch: number): SkillVersion {
  return { major, minor, patch };
}

describe('DES-SKL-006: SkillDependencyResolver', () => {
  describe('SkillVersionManager', () => {
    it('should register and retrieve versions', () => {
      const vm = new SkillVersionManager();
      vm.register('a', v(1, 2, 3));
      expect(vm.getVersion('a')).toEqual(v(1, 2, 3));
    });

    it('should return undefined for unknown skill', () => {
      const vm = new SkillVersionManager();
      expect(vm.getVersion('nope')).toBeUndefined();
    });

    it('should satisfy exact version match', () => {
      const vm = new SkillVersionManager();
      expect(vm.satisfies(v(1, 2, 3), '1.2.3')).toBe(true);
      expect(vm.satisfies(v(1, 2, 4), '1.2.3')).toBe(false);
    });

    it('should satisfy >= range', () => {
      const vm = new SkillVersionManager();
      expect(vm.satisfies(v(2, 0, 0), '>=1.0.0')).toBe(true);
      expect(vm.satisfies(v(1, 0, 0), '>=1.0.0')).toBe(true);
      expect(vm.satisfies(v(0, 9, 0), '>=1.0.0')).toBe(false);
    });

    it('should satisfy ^ (caret) range', () => {
      const vm = new SkillVersionManager();
      expect(vm.satisfies(v(1, 3, 0), '^1.2.0')).toBe(true);
      expect(vm.satisfies(v(1, 2, 0), '^1.2.0')).toBe(true);
      expect(vm.satisfies(v(1, 1, 0), '^1.2.0')).toBe(false);
      expect(vm.satisfies(v(2, 0, 0), '^1.2.0')).toBe(false);
    });

    it('should satisfy ~ (tilde) range', () => {
      const vm = new SkillVersionManager();
      expect(vm.satisfies(v(1, 2, 5), '~1.2.3')).toBe(true);
      expect(vm.satisfies(v(1, 2, 3), '~1.2.3')).toBe(true);
      expect(vm.satisfies(v(1, 2, 1), '~1.2.3')).toBe(false);
      expect(vm.satisfies(v(1, 3, 0), '~1.2.3')).toBe(false);
    });

    it('should satisfy > and < ranges', () => {
      const vm = new SkillVersionManager();
      expect(vm.satisfies(v(2, 0, 0), '>1.0.0')).toBe(true);
      expect(vm.satisfies(v(1, 0, 0), '>1.0.0')).toBe(false);
      expect(vm.satisfies(v(0, 9, 0), '<1.0.0')).toBe(true);
      expect(vm.satisfies(v(1, 0, 0), '<1.0.0')).toBe(false);
    });

    it('should satisfy <= range', () => {
      const vm = new SkillVersionManager();
      expect(vm.satisfies(v(1, 0, 0), '<=1.0.0')).toBe(true);
      expect(vm.satisfies(v(0, 9, 0), '<=1.0.0')).toBe(true);
      expect(vm.satisfies(v(1, 0, 1), '<=1.0.0')).toBe(false);
    });
  });

  describe('SkillDependencyResolver', () => {
    it('should resolve dependencies with registered versions', () => {
      const vm = new SkillVersionManager();
      vm.register('a', v(1, 2, 0));
      vm.register('b', v(2, 0, 0));
      const resolver = new SkillDependencyResolver(vm);

      const deps: SkillDependency[] = [
        { skillId: 'a', versionRange: '>=1.0.0' },
        { skillId: 'b', versionRange: '^2.0.0' },
      ];
      const resolved = resolver.resolve(deps);
      expect(resolved).toHaveLength(2);
      expect(resolved[0].satisfied).toBe(true);
      expect(resolved[1].satisfied).toBe(true);
    });

    it('should mark unregistered dependencies as unsatisfied', () => {
      const vm = new SkillVersionManager();
      const resolver = new SkillDependencyResolver(vm);
      const deps: SkillDependency[] = [{ skillId: 'missing', versionRange: '>=1.0.0' }];
      const resolved = resolver.resolve(deps);
      expect(resolved[0].satisfied).toBe(false);
    });

    it('should treat optional unregistered deps as satisfied', () => {
      const vm = new SkillVersionManager();
      const resolver = new SkillDependencyResolver(vm);
      const deps: SkillDependency[] = [
        { skillId: 'opt', versionRange: '>=1.0.0', optional: true },
      ];
      const resolved = resolver.resolve(deps);
      expect(resolved[0].satisfied).toBe(true);
    });

    it('should detect version conflicts', () => {
      const vm = new SkillVersionManager();
      vm.register('x', v(1, 5, 0));
      const resolver = new SkillDependencyResolver(vm);
      const deps: SkillDependency[] = [
        { skillId: 'x', versionRange: '>=1.0.0' },
        { skillId: 'x', versionRange: '^2.0.0' },
      ];
      const conflicts = resolver.checkConflicts(deps);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].reason).toContain('satisfies');
    });

    it('should return empty conflicts when no issues', () => {
      const vm = new SkillVersionManager();
      vm.register('a', v(1, 0, 0));
      const resolver = new SkillDependencyResolver(vm);
      const deps: SkillDependency[] = [
        { skillId: 'a', versionRange: '>=1.0.0' },
      ];
      const conflicts = resolver.checkConflicts(deps);
      expect(conflicts).toHaveLength(0);
    });

    it('should return resolution order via topological sort', () => {
      const vm = new SkillVersionManager();
      vm.register('a', v(1, 0, 0));
      vm.register('b', v(1, 0, 0));
      vm.register('c', v(1, 0, 0));
      const resolver = new SkillDependencyResolver(vm);
      const deps: SkillDependency[] = [
        { skillId: 'c', versionRange: '>=1.0.0' },
        { skillId: 'a', versionRange: '>=1.0.0' },
        { skillId: 'b', versionRange: '>=1.0.0' },
      ];
      const order = resolver.getResolutionOrder(deps);
      expect(order).toHaveLength(3);
      expect(order).toContain('a');
      expect(order).toContain('b');
      expect(order).toContain('c');
    });
  });
});
