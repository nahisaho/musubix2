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
// LibraryLearner — E-graph integrated learning
// ---------------------------------------------------------------------------

const FUNCTION_SIG_RE = /function\s+(\w+)\s*\(([^)]*)\)/g;
const ARROW_FN_RE = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)/g;
const METHOD_RE = /(\w+)\s*\(([^)]*)\)\s*\{/g;

interface ParsedSignature {
  name: string;
  arity: number;
  params: string[];
  snippet: string;
}

function parseSignatures(snippet: string): ParsedSignature[] {
  const sigs: ParsedSignature[] = [];
  const seen = new Set<string>();

  for (const re of [FUNCTION_SIG_RE, ARROW_FN_RE, METHOD_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(snippet)) !== null) {
      const name = match[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const paramStr = match[2] ?? '';
      const params = paramStr
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      sigs.push({
        name,
        arity: params.length,
        params,
        snippet: snippet.slice(0, 100),
      });
    }
  }
  return sigs;
}

/**
 * Determine if two signatures are structurally similar:
 * - Same arity (parameter count)
 * - Similar names (share a common substring of length >= 3), or
 * - Same parameter names
 */
function structurallySimilar(a: ParsedSignature, b: ParsedSignature): boolean {
  if (a.arity !== b.arity) return false;
  if (a.name === b.name) return true;

  // Check for shared parameter names
  const paramsA = new Set(a.params);
  for (const p of b.params) {
    if (paramsA.has(p)) return true;
  }

  // Check for common substring in names (length >= 3)
  const shorter = a.name.length <= b.name.length ? a.name.toLowerCase() : b.name.toLowerCase();
  const longer = a.name.length <= b.name.length ? b.name.toLowerCase() : a.name.toLowerCase();
  for (let len = Math.min(shorter.length, 3); len <= shorter.length; len++) {
    for (let i = 0; i <= shorter.length - len; i++) {
      if (longer.includes(shorter.slice(i, i + len)) && len >= 3) {
        return true;
      }
    }
  }

  return false;
}

export class LibraryLearner {
  private patterns: LibraryPattern[] = [];
  private egraph: EGraphEngine;

  constructor() {
    this.egraph = new EGraphEngine();
  }

  learn(codeSnippets: string[]): LibraryPattern[] {
    // 1. Parse code snippets to extract function signatures
    const allSigs: ParsedSignature[] = [];
    const sigToEClass = new Map<string, EClassId>();

    for (const snippet of codeSnippets) {
      const sigs = parseSignatures(snippet);
      allSigs.push(...sigs);
    }

    // 2. Add each signature to e-graph as a node
    for (const sig of allSigs) {
      const nodeData = `${sig.name}/${sig.arity}`;
      if (!sigToEClass.has(nodeData)) {
        const id = this.egraph.add(nodeData);
        sigToEClass.set(nodeData, id);
      }
    }

    // 3. Find structurally similar functions and merge their e-classes
    const sigEntries = [...sigToEClass.entries()];
    for (let i = 0; i < allSigs.length; i++) {
      for (let j = i + 1; j < allSigs.length; j++) {
        if (structurallySimilar(allSigs[i], allSigs[j])) {
          const keyI = `${allSigs[i].name}/${allSigs[i].arity}`;
          const keyJ = `${allSigs[j].name}/${allSigs[j].arity}`;
          const idI = sigToEClass.get(keyI);
          const idJ = sigToEClass.get(keyJ);
          if (idI && idJ) {
            this.egraph.merge(idI, idJ);
          }
        }
      }
    }

    // 4. Extract patterns from equivalence classes
    // Build frequency map: name → count of occurrences across snippets
    const nameFreq = new Map<string, { count: number; examples: string[] }>();
    for (const sig of allSigs) {
      const entry = nameFreq.get(sig.name);
      if (entry) {
        entry.count++;
        if (entry.examples.length < 3) {
          entry.examples.push(sig.snippet);
        }
      } else {
        nameFreq.set(sig.name, { count: 1, examples: [sig.snippet] });
      }
    }

    // 5. Rank patterns: use equivalence class size as a boost
    const learned: LibraryPattern[] = [];
    const seenNames = new Set<string>();

    for (const sig of allSigs) {
      if (seenNames.has(sig.name)) continue;
      seenNames.add(sig.name);

      const nodeKey = `${sig.name}/${sig.arity}`;
      const eclassId = sigToEClass.get(nodeKey);
      const classSize = eclassId ? this.egraph.getClass(eclassId).length : 1;
      const freq = nameFreq.get(sig.name);

      learned.push({
        name: sig.name,
        abstraction: `pattern:${sig.name}`,
        frequency: freq?.count ?? 1,
        examples: freq?.examples ?? [],
      });
    }

    this.patterns.push(...learned);
    return learned;
  }

  getPatterns(): LibraryPattern[] {
    return [...this.patterns];
  }

  suggest(code: string): LibraryPattern[] {
    // 1. Try to parse input code for function names
    const inputSigs = parseSignatures(code);
    const matches: LibraryPattern[] = [];
    const matched = new Set<string>();

    // 2. Check e-graph for structurally equivalent patterns
    if (inputSigs.length > 0) {
      for (const inputSig of inputSigs) {
        for (const p of this.patterns) {
          if (matched.has(p.name)) continue;
          // Check structural similarity with known patterns
          const pSig: ParsedSignature = {
            name: p.name,
            arity: p.abstraction.split('/').length > 1
              ? parseInt(p.abstraction.split('/')[1], 10) || 0
              : 0,
            params: [],
            snippet: '',
          };
          if (structurallySimilar(inputSig, pSig) || code.includes(p.name)) {
            matches.push(p);
            matched.add(p.name);
          }
        }
      }
    }

    // 3. Fall back to name matching for plain text queries
    for (const p of this.patterns) {
      if (!matched.has(p.name) && code.includes(p.name)) {
        matches.push(p);
        matched.add(p.name);
      }
    }

    return matches;
  }

  /** Get the underlying e-graph engine. */
  getEGraph(): EGraphEngine {
    return this.egraph;
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
