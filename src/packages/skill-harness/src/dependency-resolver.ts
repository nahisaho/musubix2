/**
 * DES-SKL-006: Skill Dependency & Version Management
 * Declarative dependency management with semver checking and topological sort.
 */

// --- Types ---

export interface SkillVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface SkillDependency {
  skillId: string;
  versionRange: string;
  optional?: boolean;
}

export interface ResolvedDependency {
  skillId: string;
  version: SkillVersion;
  satisfied: boolean;
}

// --- Version Manager ---

export class SkillVersionManager {
  private versions: Map<string, SkillVersion> = new Map();

  register(skillId: string, version: SkillVersion): void {
    this.versions.set(skillId, version);
  }

  getVersion(skillId: string): SkillVersion | undefined {
    return this.versions.get(skillId);
  }

  satisfies(actual: SkillVersion, range: string): boolean {
    const trimmed = range.trim();

    // ^major.minor.patch — compatible with version (same major)
    if (trimmed.startsWith('^')) {
      const required = this._parseVersion(trimmed.slice(1));
      if (!required) {
        return false;
      }
      if (actual.major !== required.major) {
        return false;
      }
      return this._compare(actual, required) >= 0;
    }

    // ~major.minor.patch — approximately equivalent (same major.minor)
    if (trimmed.startsWith('~')) {
      const required = this._parseVersion(trimmed.slice(1));
      if (!required) {
        return false;
      }
      if (actual.major !== required.major || actual.minor !== required.minor) {
        return false;
      }
      return actual.patch >= required.patch;
    }

    // >=major.minor.patch
    if (trimmed.startsWith('>=')) {
      const required = this._parseVersion(trimmed.slice(2));
      if (!required) {
        return false;
      }
      return this._compare(actual, required) >= 0;
    }

    // <=major.minor.patch
    if (trimmed.startsWith('<=')) {
      const required = this._parseVersion(trimmed.slice(2));
      if (!required) {
        return false;
      }
      return this._compare(actual, required) <= 0;
    }

    // >major.minor.patch
    if (trimmed.startsWith('>') && !trimmed.startsWith('>=')) {
      const required = this._parseVersion(trimmed.slice(1));
      if (!required) {
        return false;
      }
      return this._compare(actual, required) > 0;
    }

    // <major.minor.patch
    if (trimmed.startsWith('<') && !trimmed.startsWith('<=')) {
      const required = this._parseVersion(trimmed.slice(1));
      if (!required) {
        return false;
      }
      return this._compare(actual, required) < 0;
    }

    // Exact match
    const required = this._parseVersion(trimmed);
    if (!required) {
      return false;
    }
    return this._compare(actual, required) === 0;
  }

  private _parseVersion(str: string): SkillVersion | null {
    const trimmed = str.trim();
    const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
      return null;
    }
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  private _compare(a: SkillVersion, b: SkillVersion): number {
    if (a.major !== b.major) {
      return a.major - b.major;
    }
    if (a.minor !== b.minor) {
      return a.minor - b.minor;
    }
    return a.patch - b.patch;
  }
}

// --- Dependency Resolver ---

export class SkillDependencyResolver {
  constructor(private versionManager: SkillVersionManager) {}

  resolve(dependencies: SkillDependency[]): ResolvedDependency[] {
    return dependencies.map((dep) => {
      const version = this.versionManager.getVersion(dep.skillId);
      if (!version) {
        return {
          skillId: dep.skillId,
          version: { major: 0, minor: 0, patch: 0 },
          satisfied: !!dep.optional,
        };
      }
      const satisfied = this.versionManager.satisfies(version, dep.versionRange);
      return { skillId: dep.skillId, version, satisfied };
    });
  }

  checkConflicts(
    dependencies: SkillDependency[],
  ): Array<{ dep1: string; dep2: string; reason: string }> {
    const conflicts: Array<{ dep1: string; dep2: string; reason: string }> = [];
    const bySkill = new Map<string, SkillDependency[]>();

    for (const dep of dependencies) {
      const existing = bySkill.get(dep.skillId) ?? [];
      existing.push(dep);
      bySkill.set(dep.skillId, existing);
    }

    for (const [skillId, deps] of bySkill) {
      if (deps.length < 2) {
        continue;
      }
      // Check if the version ranges can be simultaneously satisfied
      const version = this.versionManager.getVersion(skillId);
      if (!version) {
        continue;
      }

      for (let i = 0; i < deps.length; i++) {
        for (let j = i + 1; j < deps.length; j++) {
          const sat1 = this.versionManager.satisfies(version, deps[i].versionRange);
          const sat2 = this.versionManager.satisfies(version, deps[j].versionRange);
          if (sat1 !== sat2) {
            conflicts.push({
              dep1: `${deps[i].skillId}@${deps[i].versionRange}`,
              dep2: `${deps[j].skillId}@${deps[j].versionRange}`,
              reason: `Version ${version.major}.${version.minor}.${version.patch} satisfies "${deps[i].versionRange}" but not "${deps[j].versionRange}" (or vice versa)`,
            });
          }
        }
      }
    }

    return conflicts;
  }

  getResolutionOrder(dependencies: SkillDependency[]): string[] {
    // Build adjacency list from dependency relationships
    const graph = new Map<string, Set<string>>();
    const allNodes = new Set<string>();

    for (const dep of dependencies) {
      allNodes.add(dep.skillId);
      if (!graph.has(dep.skillId)) {
        graph.set(dep.skillId, new Set());
      }
    }

    // Topological sort using Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const node of allNodes) {
      inDegree.set(node, 0);
    }

    for (const [, deps] of graph) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    queue.sort(); // deterministic ordering

    const order: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      const deps = graph.get(node) ?? new Set();
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) ?? 1) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
          queue.sort();
        }
      }
    }

    return order;
  }
}
