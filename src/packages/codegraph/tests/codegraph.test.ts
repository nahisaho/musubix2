import { describe, it, expect } from 'vitest';
import {
  ASTParser,
  GraphEngine,
  MemoryStorage,
  GraphRAGSearch,
  createASTParser,
  createGraphEngine,
  createMemoryStorage,
} from '../src/index.js';
import type { CodeNode, CodeEdge } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TS_SOURCE = `
import { Foo } from './foo';
import { Bar } from './bar';

export interface Greeter {
  greet(): string;
}

export class HelloService {
  sayHello() { return 'hello'; }
}

export function add(a: number, b: number) {
  return a + b;
}

const VERSION = '1.0.0';
`;

function makeNode(id: string, overrides?: Partial<CodeNode>): CodeNode {
  return {
    id,
    kind: 'function',
    name: id,
    filePath: 'src/index.ts',
    startLine: 1,
    endLine: 10,
    language: 'typescript',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ASTParser
// ---------------------------------------------------------------------------

describe('DES-CG-001: ASTParser', () => {
  it('should parse import statements', () => {
    const parser = createASTParser();
    const nodes = parser.parse(TS_SOURCE, 'typescript');
    const imports = nodes.filter((n) => n.kind === 'import');
    expect(imports.length).toBe(2);
    expect(imports[0].name).toBe('./foo');
    expect(imports[1].name).toBe('./bar');
  });

  it('should parse class declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(TS_SOURCE, 'typescript');
    const classes = nodes.filter((n) => n.kind === 'class');
    expect(classes.length).toBe(1);
    expect(classes[0].name).toBe('HelloService');
  });

  it('should parse function declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(TS_SOURCE, 'typescript');
    const fns = nodes.filter((n) => n.kind === 'function');
    expect(fns.length).toBe(1);
    expect(fns[0].name).toBe('add');
  });

  it('should parse interface declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(TS_SOURCE, 'typescript');
    const ifaces = nodes.filter((n) => n.kind === 'interface');
    expect(ifaces.length).toBe(1);
    expect(ifaces[0].name).toBe('Greeter');
  });

  it('should parse variable declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(TS_SOURCE, 'typescript');
    const vars = nodes.filter((n) => n.kind === 'variable');
    expect(vars.length).toBe(1);
    expect(vars[0].name).toBe('VERSION');
  });

  it('should return empty array for unsupported languages', () => {
    const parser = createASTParser();
    expect(parser.parse('fn main() {}', 'rust')).toEqual([]);
    expect(parser.parse('def main():', 'python')).toEqual([]);
  });

  it('should report all 16 supported languages', () => {
    const parser = createASTParser();
    const langs = parser.getSupportedLanguages();
    expect(langs).toHaveLength(16);
    expect(langs).toContain('typescript');
    expect(langs).toContain('lua');
  });

  it('should set correct line numbers', () => {
    const parser = createASTParser();
    const nodes = parser.parse(TS_SOURCE, 'typescript');
    const cls = nodes.find((n) => n.kind === 'class');
    expect(cls).toBeDefined();
    expect(cls!.startLine).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GraphEngine
// ---------------------------------------------------------------------------

describe('DES-CG-001: GraphEngine', () => {
  it('should add and retrieve nodes', () => {
    const engine = createGraphEngine();
    const node = makeNode('a');
    engine.addNode(node);
    expect(engine.getNode('a')).toEqual(node);
  });

  it('should return undefined for unknown node', () => {
    const engine = createGraphEngine();
    expect(engine.getNode('missing')).toBeUndefined();
  });

  it('should resolve dependencies (outgoing edges)', () => {
    const engine = createGraphEngine();
    engine.addNode(makeNode('a'));
    engine.addNode(makeNode('b'));
    engine.addEdge({ from: 'a', to: 'b', kind: 'calls' });
    const deps = engine.getDependencies('a');
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe('b');
  });

  it('should resolve callers (incoming edges)', () => {
    const engine = createGraphEngine();
    engine.addNode(makeNode('a'));
    engine.addNode(makeNode('b'));
    engine.addEdge({ from: 'a', to: 'b', kind: 'calls' });
    const callers = engine.getCallers('b');
    expect(callers).toHaveLength(1);
    expect(callers[0].id).toBe('a');
  });

  it('should traverse dependencies with depth limit', () => {
    const engine = createGraphEngine();
    engine.addNode(makeNode('a'));
    engine.addNode(makeNode('b'));
    engine.addNode(makeNode('c'));
    engine.addNode(makeNode('d'));
    engine.addEdge({ from: 'a', to: 'b', kind: 'calls' });
    engine.addEdge({ from: 'b', to: 'c', kind: 'calls' });
    engine.addEdge({ from: 'c', to: 'd', kind: 'calls' });

    const depth1 = engine.traverseDependencies('a', 1);
    expect(depth1).toHaveLength(1);
    expect(depth1[0].id).toBe('b');

    const depth2 = engine.traverseDependencies('a', 2);
    expect(depth2).toHaveLength(2);

    const depth3 = engine.traverseDependencies('a', 3);
    expect(depth3).toHaveLength(3);
  });

  it('should compute stats', () => {
    const engine = createGraphEngine();
    engine.addNode(makeNode('a', { language: 'typescript' }));
    engine.addNode(makeNode('b', { language: 'python' }));
    engine.addEdge({ from: 'a', to: 'b', kind: 'calls' });
    const stats = engine.getStats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
    expect(stats.languages.has('typescript')).toBe(true);
    expect(stats.languages.has('python')).toBe(true);
  });

  it('should export to CodeGraph via toGraph()', () => {
    const engine = createGraphEngine();
    engine.addNode(makeNode('x'));
    engine.addEdge({ from: 'x', to: 'x', kind: 'uses' });
    const graph = engine.toGraph();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// MemoryStorage
// ---------------------------------------------------------------------------

describe('DES-CG-001: MemoryStorage', () => {
  it('should save and load a graph', async () => {
    const storage = createMemoryStorage();
    const graph = {
      nodes: [makeNode('n1')],
      edges: [{ from: 'n1', to: 'n1', kind: 'uses' as const }],
    };
    await storage.save(graph);
    const loaded = await storage.load();
    expect(loaded.nodes).toHaveLength(1);
    expect(loaded.edges).toHaveLength(1);
    expect(loaded.nodes[0].id).toBe('n1');
  });

  it('should query nodes by kind', async () => {
    const storage = createMemoryStorage();
    await storage.save({
      nodes: [
        makeNode('f1', { kind: 'function' }),
        makeNode('c1', { kind: 'class', name: 'c1' }),
      ],
      edges: [],
    });
    const fns = await storage.query({ kind: 'function' });
    expect(fns).toHaveLength(1);
    expect(fns[0].id).toBe('f1');
  });

  it('should query nodes by name substring', async () => {
    const storage = createMemoryStorage();
    await storage.save({
      nodes: [
        makeNode('userService', { name: 'UserService' }),
        makeNode('orderService', { name: 'OrderService' }),
      ],
      edges: [],
    });
    const results = await storage.query({ name: 'User' });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('UserService');
  });

  it('should return empty on no match', async () => {
    const storage = createMemoryStorage();
    await storage.save({ nodes: [makeNode('x')], edges: [] });
    const results = await storage.query({ language: 'python' });
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GraphRAGSearch
// ---------------------------------------------------------------------------

describe('DES-CG-001: GraphRAGSearch', () => {
  function buildEngine(): GraphEngine {
    const engine = createGraphEngine();
    engine.addNode(makeNode('AuthService', { kind: 'class', name: 'AuthService' }));
    engine.addNode(makeNode('login', { kind: 'function', name: 'login' }));
    engine.addNode(makeNode('hashPassword', { kind: 'function', name: 'hashPassword' }));
    engine.addEdge({ from: 'AuthService', to: 'login', kind: 'contains' });
    engine.addEdge({ from: 'login', to: 'hashPassword', kind: 'calls' });
    return engine;
  }

  it('should find nodes by exact name in globalSearch', () => {
    const search = new GraphRAGSearch(buildEngine());
    const results = search.globalSearch('login');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].node.name).toBe('login');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should return empty for unmatched globalSearch', () => {
    const search = new GraphRAGSearch(buildEngine());
    const results = search.globalSearch('zzzzNotExist');
    expect(results).toHaveLength(0);
  });

  it('should perform localSearch within neighborhood', () => {
    const search = new GraphRAGSearch(buildEngine());
    const results = search.localSearch('AuthService', 'hash', 2);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.node.name === 'hashPassword')).toBe(true);
  });

  it('should limit localSearch by depth', () => {
    const engine = createGraphEngine();
    engine.addNode(makeNode('a', { name: 'alpha' }));
    engine.addNode(makeNode('b', { name: 'beta' }));
    engine.addNode(makeNode('target', { name: 'target' }));
    engine.addEdge({ from: 'a', to: 'b', kind: 'calls' });
    engine.addEdge({ from: 'b', to: 'target', kind: 'calls' });

    const search = new GraphRAGSearch(engine);
    const shallow = search.localSearch('a', 'target', 1);
    expect(shallow.some((r) => r.node.name === 'target')).toBe(false);

    const deep = search.localSearch('a', 'target', 2);
    expect(deep.some((r) => r.node.name === 'target')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

describe('DES-CG-001: Factory Functions', () => {
  it('should create ASTParser via factory', () => {
    expect(createASTParser()).toBeInstanceOf(ASTParser);
  });

  it('should create GraphEngine via factory', () => {
    expect(createGraphEngine()).toBeInstanceOf(GraphEngine);
  });

  it('should create MemoryStorage via factory', () => {
    expect(createMemoryStorage()).toBeInstanceOf(MemoryStorage);
  });
});
