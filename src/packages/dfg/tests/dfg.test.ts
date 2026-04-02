import { describe, it, expect } from 'vitest';
import {
  createDataFlowAnalyzer,
  DataFlowAnalyzer,
  type SimpleStatement,
  type DataFlowGraph,
  type ControlFlowGraph,
} from '../src/index.js';

describe('DES-CG-002: DFG Construction', () => {
  it('builds DFG from simple assignment statements with def-use edges', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'x', value: '1' },
      { type: 'assignment', line: 2, variable: 'y', value: 'x + 1', usedVariables: ['x'] },
    ];

    const dfg = analyzer.buildDFG(stmts, 'main');

    // definition node for x, use node for x, definition node for y
    const xDef = dfg.nodes.find((n) => n.type === 'variable' && n.name === 'x');
    const xUse = dfg.nodes.find((n) => n.type === 'expression' && n.name === 'x');
    const yDef = dfg.nodes.find((n) => n.type === 'variable' && n.name === 'y');

    expect(xDef).toBeDefined();
    expect(xUse).toBeDefined();
    expect(yDef).toBeDefined();

    // def-use edge from xDef → xUse
    const defUse = dfg.edges.find(
      (e) => e.from === xDef!.id && e.to === xUse!.id && e.type === 'def-use',
    );
    expect(defUse).toBeDefined();
  });

  it('handles variable reassignment with a new definition node', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'x', value: '1' },
      { type: 'assignment', line: 2, variable: 'x', value: '2' },
      { type: 'assignment', line: 3, variable: 'y', value: 'x', usedVariables: ['x'] },
    ];

    const dfg = analyzer.buildDFG(stmts, 'main');

    // two definition nodes for x
    const xDefs = dfg.nodes.filter((n) => n.type === 'variable' && n.name === 'x');
    expect(xDefs).toHaveLength(2);

    // the use of x on line 3 should link to the second definition (line 2)
    const xUse = dfg.nodes.find((n) => n.type === 'expression' && n.name === 'x' && n.line === 3);
    expect(xUse).toBeDefined();
    const edge = dfg.edges.find(
      (e) => e.from === xDefs[1].id && e.to === xUse!.id && e.type === 'def-use',
    );
    expect(edge).toBeDefined();
  });

  it('creates use-def edges from uses back to definitions', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'a', value: '10' },
      { type: 'assignment', line: 2, variable: 'b', value: 'a', usedVariables: ['a'] },
    ];

    const dfg = analyzer.buildDFG(stmts, 'fn');

    const aDef = dfg.nodes.find((n) => n.type === 'variable' && n.name === 'a');
    const aUse = dfg.nodes.find((n) => n.type === 'expression' && n.name === 'a');
    expect(aDef).toBeDefined();
    expect(aUse).toBeDefined();

    const useDef = dfg.edges.find(
      (e) => e.from === aUse!.id && e.to === aDef!.id && e.type === 'use-def',
    );
    expect(useDef).toBeDefined();
  });

  it('creates data-dependency edges from used defs to the new definition', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'a', value: '5' },
      { type: 'assignment', line: 2, variable: 'b', value: 'a + 1', usedVariables: ['a'] },
    ];

    const dfg = analyzer.buildDFG(stmts, 'main');

    const aDef = dfg.nodes.find((n) => n.type === 'variable' && n.name === 'a');
    const bDef = dfg.nodes.find((n) => n.type === 'variable' && n.name === 'b');

    const dep = dfg.edges.find(
      (e) => e.from === aDef!.id && e.to === bDef!.id && e.type === 'data-dependency',
    );
    expect(dep).toBeDefined();
  });

  it('handles return statements with uses', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'r', value: '42' },
      { type: 'return', line: 2, value: 'r', usedVariables: ['r'] },
    ];

    const dfg = analyzer.buildDFG(stmts, 'fn');

    const retNode = dfg.nodes.find((n) => n.type === 'return' && n.name === 'r');
    expect(retNode).toBeDefined();

    const rDef = dfg.nodes.find((n) => n.type === 'variable' && n.name === 'r');
    const defUse = dfg.edges.find(
      (e) => e.from === rDef!.id && e.to === retNode!.id && e.type === 'def-use',
    );
    expect(defUse).toBeDefined();
  });
});

describe('DES-CG-002: CFG Construction', () => {
  it('builds CFG from sequential statements with entry→stmts→exit', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'x', value: '1' },
      { type: 'assignment', line: 2, variable: 'y', value: '2' },
      { type: 'return', line: 3, value: 'y' },
    ];

    const cfg = analyzer.buildCFG(stmts);

    expect(cfg.nodes.find((n) => n.type === 'entry')).toBeDefined();
    expect(cfg.nodes.find((n) => n.type === 'exit')).toBeDefined();
    // 3 statements + entry + exit
    expect(cfg.nodes).toHaveLength(5);

    // entry → first stmt
    const entryEdge = cfg.edges.find((e) => e.from === cfg.entry);
    expect(entryEdge).toBeDefined();

    // last stmt → exit
    const exitEdge = cfg.edges.find((e) => e.to === cfg.exit);
    expect(exitEdge).toBeDefined();
  });

  it('builds CFG with if-branch producing branch and merge nodes', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      {
        type: 'if',
        line: 1,
        condition: 'x > 0',
        usedVariables: ['x'],
        thenBranch: [{ type: 'assignment', line: 2, variable: 'y', value: '1' }],
        elseBranch: [{ type: 'assignment', line: 3, variable: 'y', value: '0' }],
      },
    ];

    const cfg = analyzer.buildCFG(stmts);

    const branchNode = cfg.nodes.find((n) => n.type === 'branch');
    expect(branchNode).toBeDefined();

    const mergeNode = cfg.nodes.find((n) => n.type === 'merge');
    expect(mergeNode).toBeDefined();

    // branch should have true and false labelled edges
    const branchEdges = cfg.edges.filter((e) => e.from === branchNode!.id);
    const labels = branchEdges.map((e) => e.label).sort();
    expect(labels).toContain('true');
    expect(labels).toContain('false');
  });

  it('builds CFG with while loop producing loop node and back-edge', () => {
    const analyzer = createDataFlowAnalyzer();
    const stmts: SimpleStatement[] = [
      {
        type: 'while',
        line: 1,
        condition: 'i < 10',
        usedVariables: ['i'],
        body: [
          { type: 'assignment', line: 2, variable: 'i', value: 'i + 1', usedVariables: ['i'] },
        ],
      },
    ];

    const cfg = analyzer.buildCFG(stmts);

    const loopNode = cfg.nodes.find((n) => n.type === 'loop');
    expect(loopNode).toBeDefined();

    // should have a true-labelled edge into the body
    const trueEdge = cfg.edges.find((e) => e.from === loopNode!.id && e.label === 'true');
    expect(trueEdge).toBeDefined();

    // back-edge from body back to loop node
    const backEdge = cfg.edges.find(
      (e) => e.to === loopNode!.id && e.from !== cfg.entry,
    );
    expect(backEdge).toBeDefined();
  });

  it('connects entry and exit for empty statement list', () => {
    const analyzer = createDataFlowAnalyzer();
    const cfg = analyzer.buildCFG([]);

    expect(cfg.nodes).toHaveLength(2);
    expect(cfg.edges).toHaveLength(1);
    expect(cfg.edges[0].from).toBe(cfg.entry);
    expect(cfg.edges[0].to).toBe(cfg.exit);
  });
});

describe('DES-CG-002: Queries', () => {
  let analyzer: DataFlowAnalyzer;
  let dfg: DataFlowGraph;

  const stmts: SimpleStatement[] = [
    { type: 'declaration', line: 1, variable: 'a', value: '1' },
    { type: 'declaration', line: 2, variable: 'b', value: '2' },
    { type: 'assignment', line: 3, variable: 'c', value: 'a + b', usedVariables: ['a', 'b'] },
    { type: 'assignment', line: 4, variable: 'a', value: '10' },
    { type: 'return', line: 5, value: 'c', usedVariables: ['c'] },
  ];

  beforeEach(() => {
    analyzer = createDataFlowAnalyzer();
    dfg = analyzer.buildDFG(stmts, 'test');
  });

  it('queryReachingDefs finds all definitions of a variable', () => {
    const defs = analyzer.queryReachingDefs(dfg, 'a');
    expect(defs).toHaveLength(2); // line 1 and line 4
    expect(defs.every((d) => d.name === 'a' && d.type === 'variable')).toBe(true);
  });

  it('queryUses finds all uses of a variable', () => {
    const uses = analyzer.queryUses(dfg, 'a');
    expect(uses.length).toBeGreaterThanOrEqual(1);
    expect(uses.every((u) => u.name === 'a')).toBe(true);
  });

  it('queryUses returns empty for unused variable', () => {
    const uses = analyzer.queryUses(dfg, 'z');
    expect(uses).toHaveLength(0);
  });

  it('getDefinitionChain traces back through edges', () => {
    // 'c' is defined using 'a' and 'b' — chain from c's use (return node) should
    // reach through to the definitions of a, b, and c
    const returnNode = dfg.nodes.find((n) => n.type === 'return' && n.name === 'c');
    expect(returnNode).toBeDefined();

    const chain = analyzer.getDefinitionChain(dfg, returnNode!.id);
    expect(chain.length).toBeGreaterThanOrEqual(1);

    const names = chain.map((n) => n.name);
    expect(names).toContain('c');
  });
});

describe('DES-CG-002: Factory', () => {
  it('createDataFlowAnalyzer returns a DataFlowAnalyzer instance', () => {
    const analyzer = createDataFlowAnalyzer();
    expect(analyzer).toBeInstanceOf(DataFlowAnalyzer);
  });
});
