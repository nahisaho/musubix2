/**
 * @musubix2/library-learner — E-graph based library learning
 *
 * DES-LRN-003 (P7-03): ライブラリ学習
 * DreamCoder方式のライブラリ学習。E-graphベースの等価性探索と階層的ライブラリ構築。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EClassId = string;

export interface ENode {
  id: EClassId;
  data: string;
  children: EClassId[];
}

export interface LibraryPattern {
  name: string;
  abstraction: string;
  frequency: number;
  examples: string[];
}

// ---------------------------------------------------------------------------
// EGraphEngine
// ---------------------------------------------------------------------------

export class EGraphEngine {
  private nodes: Map<EClassId, ENode[]> = new Map();
  private parent: Map<EClassId, EClassId> = new Map();
  private nextId = 0;

  add(data: string, children: EClassId[] = []): EClassId {
    const id = `e${this.nextId++}`;
    const node: ENode = { id, data, children };
    this.nodes.set(id, [node]);
    this.parent.set(id, id);
    return id;
  }

  find(id: EClassId): EClassId {
    let root = id;
    while (this.parent.get(root) !== root) {
      const p = this.parent.get(root);
      if (p === undefined) {
        return root;
      }
      root = p;
    }
    // Path compression
    let current = id;
    while (current !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  merge(id1: EClassId, id2: EClassId): EClassId {
    const root1 = this.find(id1);
    const root2 = this.find(id2);
    if (root1 === root2) {
      return root1;
    }

    this.parent.set(root2, root1);

    const nodes1 = this.nodes.get(root1) ?? [];
    const nodes2 = this.nodes.get(root2) ?? [];
    this.nodes.set(root1, [...nodes1, ...nodes2]);
    this.nodes.delete(root2);

    return root1;
  }

  getClass(id: EClassId): ENode[] {
    const root = this.find(id);
    return this.nodes.get(root) ?? [];
  }

  size(): number {
    const roots = new Set<EClassId>();
    for (const id of this.parent.keys()) {
      roots.add(this.find(id));
    }
    return roots.size;
  }
}

// ---------------------------------------------------------------------------
// LibraryLearner
// ---------------------------------------------------------------------------

const FUNCTION_SIG_RE = /function\s+(\w+)\s*\(/g;
const ARROW_FN_RE = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
const METHOD_RE = /(\w+)\s*\([^)]*\)\s*\{/g;

export class LibraryLearner {
  private patterns: LibraryPattern[] = [];

  learn(codeSnippets: string[]): LibraryPattern[] {
    const freq = new Map<string, { count: number; examples: string[] }>();

    for (const snippet of codeSnippets) {
      const names = new Set<string>();

      for (const re of [FUNCTION_SIG_RE, ARROW_FN_RE, METHOD_RE]) {
        re.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(snippet)) !== null) {
          names.add(match[1]);
        }
      }

      for (const name of names) {
        const entry = freq.get(name);
        if (entry) {
          entry.count++;
          if (entry.examples.length < 3) {
            entry.examples.push(snippet.slice(0, 100));
          }
        } else {
          freq.set(name, { count: 1, examples: [snippet.slice(0, 100)] });
        }
      }
    }

    const learned: LibraryPattern[] = [...freq.entries()]
      .filter(([, v]) => v.count >= 1)
      .map(([name, v]) => ({
        name,
        abstraction: `pattern:${name}`,
        frequency: v.count,
        examples: v.examples,
      }));

    this.patterns.push(...learned);
    return learned;
  }

  getPatterns(): LibraryPattern[] {
    return [...this.patterns];
  }

  suggest(code: string): LibraryPattern[] {
    return this.patterns.filter((p) => code.includes(p.name));
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createEGraphEngine(): EGraphEngine {
  return new EGraphEngine();
}

export function createLibraryLearner(): LibraryLearner {
  return new LibraryLearner();
}
