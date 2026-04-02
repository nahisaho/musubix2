/**
 * @musubix2/dfg — DES-CG-002: Data Flow and Control Flow Graph analysis
 *
 * Provides DFG/CFG construction from a simple statement IR,
 * reaching-definition queries, and definition-chain traversal.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DFGNodeType = 'variable' | 'parameter' | 'literal' | 'expression' | 'return';
export type DFGEdgeType = 'def-use' | 'use-def' | 'data-dependency';
export type CFGNodeType = 'entry' | 'exit' | 'statement' | 'branch' | 'merge' | 'loop';

export interface DFGNode {
  id: string;
  type: DFGNodeType;
  name: string;
  scope: string;
  line?: number;
  metadata?: Record<string, unknown>;
}

export interface DFGEdge {
  from: string;
  to: string;
  type: DFGEdgeType;
  metadata?: Record<string, unknown>;
}

export interface DataFlowGraph {
  nodes: DFGNode[];
  edges: DFGEdge[];
}

export interface CFGNode {
  id: string;
  type: CFGNodeType;
  code?: string;
  line?: number;
  metadata?: Record<string, unknown>;
}

export interface CFGEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ControlFlowGraph {
  nodes: CFGNode[];
  edges: CFGEdge[];
  entry: string;
  exit: string;
}

export interface SimpleStatement {
  type: 'assignment' | 'return' | 'if' | 'while' | 'call' | 'declaration';
  line: number;
  variable?: string;
  value?: string;
  usedVariables?: string[];
  condition?: string;
  thenBranch?: SimpleStatement[];
  elseBranch?: SimpleStatement[];
  body?: SimpleStatement[];
}

// ---------------------------------------------------------------------------
// DataFlowAnalyzer
// ---------------------------------------------------------------------------

export class DataFlowAnalyzer {
  private dfgCounter = 0;
  private cfgCounter = 0;

  // -- DFG ------------------------------------------------------------------

  buildDFG(statements: SimpleStatement[], scope: string): DataFlowGraph {
    const nodes: DFGNode[] = [];
    const edges: DFGEdge[] = [];
    // variable name → id of last definition node
    const lastDef = new Map<string, string>();

    this.dfgCounter = 0;
    this.walkDFG(statements, scope, nodes, edges, lastDef);

    return { nodes, edges };
  }

  private walkDFG(
    statements: SimpleStatement[],
    scope: string,
    nodes: DFGNode[],
    edges: DFGEdge[],
    lastDef: Map<string, string>,
  ): void {
    for (const stmt of statements) {
      switch (stmt.type) {
        case 'declaration':
        case 'assignment': {
          // uses first — so edges point from existing defs
          if (stmt.usedVariables) {
            for (const used of stmt.usedVariables) {
              const useNode = this.makeDFGNode('expression', used, scope, stmt.line);
              nodes.push(useNode);
              const defId = lastDef.get(used);
              if (defId) {
                edges.push({ from: defId, to: useNode.id, type: 'def-use' });
                edges.push({ from: useNode.id, to: defId, type: 'use-def' });
              }
            }
          }
          // definition
          if (stmt.variable) {
            const defNode = this.makeDFGNode('variable', stmt.variable, scope, stmt.line);
            nodes.push(defNode);

            // data-dependency from used vars to this def
            if (stmt.usedVariables) {
              for (const used of stmt.usedVariables) {
                const usedDefId = lastDef.get(used);
                if (usedDefId) {
                  edges.push({ from: usedDefId, to: defNode.id, type: 'data-dependency' });
                }
              }
            }

            lastDef.set(stmt.variable, defNode.id);
          }
          break;
        }

        case 'return': {
          if (stmt.usedVariables) {
            for (const used of stmt.usedVariables) {
              const useNode = this.makeDFGNode('return', used, scope, stmt.line);
              nodes.push(useNode);
              const defId = lastDef.get(used);
              if (defId) {
                edges.push({ from: defId, to: useNode.id, type: 'def-use' });
                edges.push({ from: useNode.id, to: defId, type: 'use-def' });
              }
            }
          }
          break;
        }

        case 'call': {
          if (stmt.usedVariables) {
            for (const used of stmt.usedVariables) {
              const useNode = this.makeDFGNode('expression', used, scope, stmt.line);
              nodes.push(useNode);
              const defId = lastDef.get(used);
              if (defId) {
                edges.push({ from: defId, to: useNode.id, type: 'def-use' });
                edges.push({ from: useNode.id, to: defId, type: 'use-def' });
              }
            }
          }
          break;
        }

        case 'if': {
          // condition uses
          if (stmt.usedVariables) {
            for (const used of stmt.usedVariables) {
              const useNode = this.makeDFGNode('expression', used, scope, stmt.line);
              nodes.push(useNode);
              const defId = lastDef.get(used);
              if (defId) {
                edges.push({ from: defId, to: useNode.id, type: 'def-use' });
                edges.push({ from: useNode.id, to: defId, type: 'use-def' });
              }
            }
          }
          if (stmt.thenBranch) {
            this.walkDFG(stmt.thenBranch, scope, nodes, edges, new Map(lastDef));
          }
          if (stmt.elseBranch) {
            this.walkDFG(stmt.elseBranch, scope, nodes, edges, new Map(lastDef));
          }
          break;
        }

        case 'while': {
          if (stmt.usedVariables) {
            for (const used of stmt.usedVariables) {
              const useNode = this.makeDFGNode('expression', used, scope, stmt.line);
              nodes.push(useNode);
              const defId = lastDef.get(used);
              if (defId) {
                edges.push({ from: defId, to: useNode.id, type: 'def-use' });
                edges.push({ from: useNode.id, to: defId, type: 'use-def' });
              }
            }
          }
          if (stmt.body) {
            this.walkDFG(stmt.body, scope, nodes, edges, new Map(lastDef));
          }
          break;
        }
      }
    }
  }

  // -- CFG ------------------------------------------------------------------

  buildCFG(statements: SimpleStatement[]): ControlFlowGraph {
    const nodes: CFGNode[] = [];
    const edges: CFGEdge[] = [];
    this.cfgCounter = 0;

    const entryNode: CFGNode = { id: this.nextCFGId(), type: 'entry' };
    const exitNode: CFGNode = { id: this.nextCFGId(), type: 'exit' };
    nodes.push(entryNode, exitNode);

    const lastIds = this.walkCFG(statements, nodes, edges, [entryNode.id]);

    // connect dangling tails to exit
    for (const id of lastIds) {
      edges.push({ from: id, to: exitNode.id });
    }

    return { nodes, edges, entry: entryNode.id, exit: exitNode.id };
  }

  /** Returns the ids of the "tail" nodes that still need a successor. */
  private walkCFG(
    statements: SimpleStatement[],
    nodes: CFGNode[],
    edges: CFGEdge[],
    predecessors: string[],
  ): string[] {
    let currentPreds = predecessors;

    for (const stmt of statements) {
      switch (stmt.type) {
        case 'assignment':
        case 'declaration':
        case 'return':
        case 'call': {
          const n: CFGNode = {
            id: this.nextCFGId(),
            type: 'statement',
            code: this.stmtCode(stmt),
            line: stmt.line,
          };
          nodes.push(n);
          for (const p of currentPreds) {
            edges.push({ from: p, to: n.id });
          }
          currentPreds = [n.id];
          break;
        }

        case 'if': {
          const branchNode: CFGNode = {
            id: this.nextCFGId(),
            type: 'branch',
            code: stmt.condition ?? 'if',
            line: stmt.line,
          };
          nodes.push(branchNode);
          for (const p of currentPreds) {
            edges.push({ from: p, to: branchNode.id });
          }

          const thenTails = stmt.thenBranch
            ? this.walkCFG(stmt.thenBranch, nodes, edges, [branchNode.id])
            : [branchNode.id];
          // add true label to the first edge going into the then-branch
          const thenEdge = edges.find(
            (e) => e.from === branchNode.id && !e.label && thenTails.length > 0,
          );
          if (thenEdge) {
            thenEdge.label = 'true';
          }

          const elseTails = stmt.elseBranch
            ? this.walkCFG(stmt.elseBranch, nodes, edges, [branchNode.id])
            : [branchNode.id];
          const elseEdge = edges.find(
            (e) => e.from === branchNode.id && !e.label && e !== thenEdge,
          );
          if (elseEdge) {
            elseEdge.label = 'false';
          }

          // merge
          const mergeNode: CFGNode = { id: this.nextCFGId(), type: 'merge', line: stmt.line };
          nodes.push(mergeNode);
          for (const t of [...thenTails, ...elseTails]) {
            edges.push({ from: t, to: mergeNode.id });
          }
          currentPreds = [mergeNode.id];
          break;
        }

        case 'while': {
          const loopNode: CFGNode = {
            id: this.nextCFGId(),
            type: 'loop',
            code: stmt.condition ?? 'while',
            line: stmt.line,
          };
          nodes.push(loopNode);
          for (const p of currentPreds) {
            edges.push({ from: p, to: loopNode.id });
          }

          // true branch: body
          if (stmt.body && stmt.body.length > 0) {
            const bodyTails = this.walkCFG(stmt.body, nodes, edges, [loopNode.id]);
            // label the edge from loop into body as 'true'
            const bodyEdge = edges.find((e) => e.from === loopNode.id && !e.label);
            if (bodyEdge) {
              bodyEdge.label = 'true';
            }

            // back-edge
            for (const t of bodyTails) {
              edges.push({ from: t, to: loopNode.id });
            }
          }

          // false branch exits loop
          currentPreds = [loopNode.id];
          break;
        }
      }
    }

    return currentPreds;
  }

  // -- Queries --------------------------------------------------------------

  queryReachingDefs(dfg: DataFlowGraph, variable: string): DFGNode[] {
    return dfg.nodes.filter((n) => n.type === 'variable' && n.name === variable);
  }

  queryUses(dfg: DataFlowGraph, variable: string): DFGNode[] {
    return dfg.nodes.filter(
      (n) => (n.type === 'expression' || n.type === 'return') && n.name === variable,
    );
  }

  getDefinitionChain(dfg: DataFlowGraph, nodeId: string): DFGNode[] {
    const visited = new Set<string>();
    const result: DFGNode[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // follow use-def and data-dependency edges backwards (edge.from === current)
      for (const edge of dfg.edges) {
        if (edge.from === current && (edge.type === 'use-def' || edge.type === 'data-dependency')) {
          const target = edge.to;
          if (!visited.has(target)) {
            queue.push(target);
          }
        }
        if (edge.to === current && (edge.type === 'use-def' || edge.type === 'data-dependency')) {
          const target = edge.from;
          if (!visited.has(target)) {
            queue.push(target);
          }
        }
      }
    }

    // collect definition nodes (variable / parameter) that aren't the start
    for (const id of visited) {
      if (id === nodeId) {
        continue;
      }
      const node = dfg.nodes.find((n) => n.id === id);
      if (node && (node.type === 'variable' || node.type === 'parameter')) {
        result.push(node);
      }
    }

    return result;
  }

  // -- Helpers --------------------------------------------------------------

  private makeDFGNode(type: DFGNodeType, name: string, scope: string, line?: number): DFGNode {
    return { id: `dfg-${this.dfgCounter++}`, type, name, scope, line };
  }

  private nextCFGId(): string {
    return `cfg-${this.cfgCounter++}`;
  }

  private stmtCode(stmt: SimpleStatement): string {
    switch (stmt.type) {
      case 'assignment':
        return `${stmt.variable} = ${stmt.value ?? '?'}`;
      case 'declaration':
        return `let ${stmt.variable} = ${stmt.value ?? '?'}`;
      case 'return':
        return `return ${stmt.value ?? ''}`;
      case 'call':
        return `${stmt.value ?? 'call'}(${(stmt.usedVariables ?? []).join(', ')})`;
      default:
        return stmt.type;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDataFlowAnalyzer(): DataFlowAnalyzer {
  return new DataFlowAnalyzer();
}
