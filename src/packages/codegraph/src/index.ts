/**
 * @musubix2/codegraph — Code Graph Engine
 *
 * AST parsing (regex-based fallback), in-memory dependency graph,
 * storage adapters, and keyword-based GraphRAG search.
 *
 * @see DES-CG-001 — Code Graph
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupportedLanguage =
  | 'typescript' | 'javascript' | 'python' | 'java' | 'go'
  | 'rust' | 'c' | 'cpp' | 'csharp' | 'ruby'
  | 'php' | 'swift' | 'kotlin' | 'scala' | 'haskell' | 'lua';

export type CodeNodeKind =
  | 'class' | 'function' | 'method' | 'interface'
  | 'import' | 'export' | 'variable' | 'module';

export type EdgeKind =
  | 'calls' | 'imports' | 'extends' | 'implements' | 'uses' | 'contains';

export interface ASTNode {
  kind: CodeNodeKind;
  name: string;
  startLine: number;
  endLine: number;
  children: ASTNode[];
  metadata?: Record<string, unknown>;
}

export interface CodeNode {
  id: string;
  kind: CodeNodeKind;
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: SupportedLanguage;
  metadata?: Record<string, unknown>;
}

export interface CodeEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  metadata?: Record<string, unknown>;
}

export interface CodeGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export interface GraphQuery {
  kind?: CodeNodeKind;
  name?: string;
  filePath?: string;
  language?: SupportedLanguage;
}

export interface SearchResult {
  node: CodeNode;
  score: number;
  context?: string;
}

export interface StorageAdapter {
  save(graph: CodeGraph): Promise<void>;
  load(): Promise<CodeGraph>;
  query(filter: GraphQuery): Promise<CodeNode[]>;
}

// ---------------------------------------------------------------------------
// ASTParser
// ---------------------------------------------------------------------------

const ALL_LANGUAGES: SupportedLanguage[] = [
  'typescript', 'javascript', 'python', 'java', 'go',
  'rust', 'c', 'cpp', 'csharp', 'ruby',
  'php', 'swift', 'kotlin', 'scala', 'haskell', 'lua',
];

const JS_TS_LANGUAGES: Set<SupportedLanguage> = new Set([
  'typescript', 'javascript',
]);

export class ASTParser {
  parse(source: string, language: SupportedLanguage): ASTNode[] {
    if (!JS_TS_LANGUAGES.has(language)) {
      return [];
    }
    return this.parseTypeScript(source);
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return [...ALL_LANGUAGES];
  }

  // -- private --------------------------------------------------------------

  private parseTypeScript(source: string): ASTNode[] {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];

    const patterns: { kind: CodeNodeKind; regex: RegExp }[] = [
      { kind: 'class',     regex: /(?:export\s+)?class\s+(\w+)/ },
      { kind: 'interface', regex: /(?:export\s+)?interface\s+(\w+)/ },
      { kind: 'function',  regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
      { kind: 'import',    regex: /import\s+.*from\s+['"](.[^'"]+)['"]/ },
      { kind: 'export',    regex: /export\s+\{\s*([^}]+)\}/ },
      { kind: 'variable',  regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)/ },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { kind, regex } of patterns) {
        const match = regex.exec(line);
        if (match) {
          const name = match[1].trim();
          nodes.push({
            kind,
            name,
            startLine: i + 1,
            endLine: i + 1,
            children: [],
          });
          break; // one match per line
        }
      }
    }

    return nodes;
  }
}

// ---------------------------------------------------------------------------
// GraphEngine
// ---------------------------------------------------------------------------

export class GraphEngine {
  private nodes = new Map<string, CodeNode>();
  private edges: CodeEdge[] = [];

  addNode(node: CodeNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: CodeEdge): void {
    this.edges.push(edge);
  }

  getNode(id: string): CodeNode | undefined {
    return this.nodes.get(id);
  }

  getDependencies(id: string): CodeNode[] {
    const targetIds = this.edges
      .filter((e) => e.from === id)
      .map((e) => e.to);
    return targetIds
      .map((tid) => this.nodes.get(tid))
      .filter((n): n is CodeNode => n !== undefined);
  }

  getCallers(id: string): CodeNode[] {
    const sourceIds = this.edges
      .filter((e) => e.to === id)
      .map((e) => e.from);
    return sourceIds
      .map((sid) => this.nodes.get(sid))
      .filter((n): n is CodeNode => n !== undefined);
  }

  traverseDependencies(id: string, maxDepth: number): CodeNode[] {
    const visited = new Set<string>();
    const result: CodeNode[] = [];
    const queue: { nodeId: string; depth: number }[] = [{ nodeId: id, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.nodeId) || item.depth > maxDepth) continue;
      visited.add(item.nodeId);

      if (item.nodeId !== id) {
        const node = this.nodes.get(item.nodeId);
        if (node) result.push(node);
      }

      if (item.depth < maxDepth) {
        const deps = this.edges
          .filter((e) => e.from === item.nodeId)
          .map((e) => e.to);
        for (const dep of deps) {
          if (!visited.has(dep)) {
            queue.push({ nodeId: dep, depth: item.depth + 1 });
          }
        }
      }
    }

    return result;
  }

  getStats(): { nodeCount: number; edgeCount: number; languages: Set<SupportedLanguage> } {
    const languages = new Set<SupportedLanguage>();
    for (const node of this.nodes.values()) {
      languages.add(node.language);
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      languages,
    };
  }

  toGraph(): CodeGraph {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges],
    };
  }
}

// ---------------------------------------------------------------------------
// MemoryStorage
// ---------------------------------------------------------------------------

export class MemoryStorage implements StorageAdapter {
  private graph: CodeGraph = { nodes: [], edges: [] };

  async save(graph: CodeGraph): Promise<void> {
    this.graph = { nodes: [...graph.nodes], edges: [...graph.edges] };
  }

  async load(): Promise<CodeGraph> {
    return { nodes: [...this.graph.nodes], edges: [...this.graph.edges] };
  }

  async query(filter: GraphQuery): Promise<CodeNode[]> {
    return this.graph.nodes.filter((node) => {
      if (filter.kind && node.kind !== filter.kind) return false;
      if (filter.name && !node.name.includes(filter.name)) return false;
      if (filter.filePath && !node.filePath.includes(filter.filePath)) return false;
      if (filter.language && node.language !== filter.language) return false;
      return true;
    });
  }
}

// ---------------------------------------------------------------------------
// GraphRAGSearch
// ---------------------------------------------------------------------------

export class GraphRAGSearch {
  constructor(private engine: GraphEngine) {}

  globalSearch(query: string): SearchResult[] {
    const graph = this.engine.toGraph();
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const node of graph.nodes) {
      const nameScore = this.scoreMatch(node.name.toLowerCase(), lowerQuery);
      const kindScore = this.scoreMatch(node.kind.toLowerCase(), lowerQuery);
      const pathScore = this.scoreMatch(node.filePath.toLowerCase(), lowerQuery);
      const score = Math.max(nameScore, kindScore * 0.5, pathScore * 0.3);

      if (score > 0) {
        results.push({
          node,
          score,
          context: `${node.kind} ${node.name} in ${node.filePath}`,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  localSearch(entityId: string, query: string, depth: number): SearchResult[] {
    const neighbors = this.engine.traverseDependencies(entityId, depth);
    const startNode = this.engine.getNode(entityId);
    const candidates = startNode ? [startNode, ...neighbors] : neighbors;
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const node of candidates) {
      const score = this.scoreMatch(node.name.toLowerCase(), lowerQuery);
      if (score > 0) {
        results.push({
          node,
          score,
          context: `${node.kind} ${node.name} in ${node.filePath}`,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private scoreMatch(text: string, query: string): number {
    if (text === query) return 1.0;
    if (text.includes(query)) return 0.7;

    const words = query.split(/\s+/);
    const matchCount = words.filter((w) => text.includes(w)).length;
    if (matchCount > 0) return (matchCount / words.length) * 0.5;

    return 0;
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createASTParser(): ASTParser {
  return new ASTParser();
}

export function createGraphEngine(): GraphEngine {
  return new GraphEngine();
}

export function createMemoryStorage(): MemoryStorage {
  return new MemoryStorage();
}

export { TestPlacementValidator, createTestPlacementValidator } from './test-placement.js';
export type { TestPlacementRule, MissingTest, TestPlacementReport } from './test-placement.js';
