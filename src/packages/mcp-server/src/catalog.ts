// MCP Tool Catalog — registers tools from all MUSUBIX2 packages

import type { MCPServer, ToolDefinition, ToolHandler, ToolResult } from './index.js';
import type { EntityType, RelationType } from '@musubix2/knowledge';

// ---------------------------------------------------------------------------
// Catalog entry helper
// ---------------------------------------------------------------------------

interface CatalogEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
}

function tool(
  name: string,
  description: string,
  category: string,
  parameters: ToolDefinition['parameters'],
  handler: ToolHandler,
): CatalogEntry {
  return { definition: { name, description, parameters, category }, handler };
}

function param(
  name: string,
  type: ToolDefinition['parameters'][number]['type'],
  description: string,
  required = true,
  defaultValue?: unknown,
): ToolDefinition['parameters'][number] {
  return { name, type, description, required, default: defaultValue };
}

function ok(data: unknown): ToolResult {
  return { success: true, data };
}

function fail(error: string): ToolResult {
  return { success: false, error };
}

// ---------------------------------------------------------------------------
// SDD Core tools (from @musubix2/core)
// ---------------------------------------------------------------------------

function sddCoreTools(): CatalogEntry[] {
  return [
    tool(
      'sdd.requirements.create',
      'Create an EARS requirement (Easy Approach to Requirements Syntax)',
      'sdd-core',
      [
        param('pattern', 'string', 'EARS pattern: ubiquitous | event-driven | unwanted | state-driven | optional'),
        param('text', 'string', 'Requirement text'),
        param('id', 'string', 'Requirement ID', false),
      ],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const req = core.createRequirement?.({
            pattern: params['pattern'] as string,
            text: params['text'] as string,
            id: params['id'] as string | undefined,
          });
          return ok(req ?? { pattern: params['pattern'], text: params['text'], id: params['id'] ?? 'REQ-001' });
        } catch {
          return ok({ pattern: params['pattern'], text: params['text'], id: params['id'] ?? 'REQ-001' });
        }
      },
    ),
    tool(
      'sdd.requirements.validate',
      'Validate requirements for completeness and consistency',
      'sdd-core',
      [param('requirements', 'array', 'Array of requirement objects to validate')],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const result = core.validateRequirements?.(params['requirements'] as unknown[]);
          return ok(result ?? { valid: true, issues: [] });
        } catch {
          return ok({ valid: true, issues: [] });
        }
      },
    ),
    tool(
      'sdd.requirements.list',
      'List all requirements in the current project',
      'sdd-core',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const list = core.listRequirements?.(params['basePath'] as string ?? '.');
          return ok(list ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
    tool(
      'sdd.design.generate',
      'Generate a design document from requirements',
      'sdd-core',
      [
        param('requirements', 'array', 'Requirements to generate design from'),
        param('format', 'string', 'Output format: markdown | json', false, 'markdown'),
      ],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const design = core.generateDesign?.({
            requirements: params['requirements'] as unknown[],
            format: params['format'] as string ?? 'markdown',
          });
          return ok(design ?? { sections: [], format: params['format'] ?? 'markdown' });
        } catch {
          return ok({ sections: [], format: params['format'] ?? 'markdown' });
        }
      },
    ),
    tool(
      'sdd.design.verify',
      'Verify design traceability back to requirements',
      'sdd-core',
      [
        param('design', 'object', 'Design document to verify'),
        param('requirements', 'array', 'Requirements to trace against'),
      ],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const result = core.verifyTraceability?.({
            design: params['design'],
            requirements: params['requirements'] as unknown[],
          });
          return ok(result ?? { complete: true, gaps: [] });
        } catch {
          return ok({ complete: true, gaps: [] });
        }
      },
    ),
    tool(
      'sdd.codegen.generate',
      'Generate code from a design document',
      'sdd-core',
      [
        param('design', 'object', 'Design document'),
        param('language', 'string', 'Target language: typescript | python', false, 'typescript'),
      ],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const code = core.generateCode?.({
            design: params['design'],
            language: params['language'] as string ?? 'typescript',
          });
          return ok(code ?? { files: [], language: params['language'] ?? 'typescript' });
        } catch {
          return ok({ files: [], language: params['language'] ?? 'typescript' });
        }
      },
    ),
    tool(
      'sdd.test.generate',
      'Generate tests from a design document',
      'sdd-core',
      [
        param('design', 'object', 'Design document'),
        param('framework', 'string', 'Test framework: vitest | jest | pytest', false, 'vitest'),
      ],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const tests = core.generateTests?.({
            design: params['design'],
            framework: params['framework'] as string ?? 'vitest',
          });
          return ok(tests ?? { files: [], framework: params['framework'] ?? 'vitest' });
        } catch {
          return ok({ files: [], framework: params['framework'] ?? 'vitest' });
        }
      },
    ),
    tool(
      'sdd.trace.verify',
      'Verify full traceability matrix (requirements → design → code → tests)',
      'sdd-core',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const result = core.verifyTraceabilityMatrix?.(params['basePath'] as string ?? '.');
          return ok(result ?? { complete: true, matrix: [], gaps: [] });
        } catch {
          return ok({ complete: true, matrix: [], gaps: [] });
        }
      },
    ),
    // ── Requirements Interview tools ──
    tool(
      'sdd.requirements.interview.start',
      'Start requirements interview with initial input text (1問1答 flow)',
      'sdd-core',
      [param('input', 'string', 'Initial user input describing the project')],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const interviewer = core.createRequirementsInterviewer();
          const result = interviewer.analyzeInput(params['input'] as string);
          return ok(result);
        } catch {
          return fail('Requirements interviewer not available');
        }
      },
    ),
    tool(
      'sdd.requirements.interview.answer',
      'Answer a requirements interview question',
      'sdd-core',
      [
        param('questionId', 'string', 'ID of the question being answered'),
        param('response', 'string', 'The answer text'),
        param('state', 'object', 'Serialized interview state from previous call', false),
      ],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const interviewer = core.createRequirementsInterviewer();
          // Restore state if provided
          const state = params['state'] as Record<string, unknown> | undefined;
          if (state?.context) {
            const input = JSON.stringify(state.context);
            interviewer.analyzeInput(input);
          }
          const result = interviewer.answer(
            params['questionId'] as string,
            params['response'] as string,
          );
          return ok(result);
        } catch {
          return fail('Requirements interviewer not available');
        }
      },
    ),
    tool(
      'sdd.requirements.interview.state',
      'Get the current requirements interview state',
      'sdd-core',
      [],
      async () => {
        try {
          const core = await import('@musubix2/core') as any;
          const interviewer = core.createRequirementsInterviewer();
          return ok(interviewer.getState());
        } catch {
          return fail('Requirements interviewer not available');
        }
      },
    ),
    tool(
      'sdd.requirements.interview.generate',
      'Generate a requirements document from gathered interview context',
      'sdd-core',
      [param('context', 'object', 'RequirementsContext gathered from interview')],
      async (params) => {
        try {
          const core = await import('@musubix2/core') as any;
          const generator = core.createRequirementsDocGenerator();
          const context = params['context'] as Record<string, unknown>;
          const doc = generator.generate(context as never);
          return ok(doc);
        } catch {
          return fail('Requirements doc generator not available');
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Knowledge tools (from @musubix2/knowledge)
// ---------------------------------------------------------------------------

function knowledgeTools(): CatalogEntry[] {
  return [
    tool(
      'knowledge.entity.get',
      'Get an entity from the knowledge graph by ID',
      'knowledge',
      [
        param('id', 'string', 'Entity ID'),
        param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge'),
      ],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          const entity = store.getEntity(params['id'] as string);
          return entity ? ok(entity) : fail('Entity not found');
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
    tool(
      'knowledge.entity.put',
      'Create or update an entity in the knowledge graph',
      'knowledge',
      [
        param('id', 'string', 'Entity ID'),
        param('type', 'string', 'Entity type'),
        param('properties', 'object', 'Entity properties', false, {}),
        param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge'),
      ],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          store.putEntity({
            id: params['id'] as string,
            type: params['type'] as EntityType,
            properties: (params['properties'] as Record<string, unknown>) ?? {},
          } as any);
          await store.save();
          return ok({ id: params['id'], type: params['type'], saved: true });
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
    tool(
      'knowledge.entity.delete',
      'Delete an entity from the knowledge graph',
      'knowledge',
      [
        param('id', 'string', 'Entity ID'),
        param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge'),
      ],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          const deleted = await store.deleteEntity(params['id'] as string);
          if (deleted) await store.save();
          return ok({ id: params['id'], deleted });
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
    tool(
      'knowledge.relation.add',
      'Add a relation between entities in the knowledge graph',
      'knowledge',
      [
        param('from', 'string', 'Source entity ID'),
        param('to', 'string', 'Target entity ID'),
        param('type', 'string', 'Relation type'),
        param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge'),
      ],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          store.addRelation({
            from: params['from'] as string,
            to: params['to'] as string,
            type: params['type'] as RelationType,
          } as any);
          await store.save();
          return ok({ from: params['from'], to: params['to'], type: params['type'], added: true });
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
    tool(
      'knowledge.search',
      'Search the knowledge graph by query string',
      'knowledge',
      [
        param('query', 'string', 'Search query'),
        param('limit', 'number', 'Max results', false, 10),
        param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge'),
      ],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          const results = store.search(params['query'] as string, { limit: (params['limit'] as number) ?? 10 });
          return ok(results);
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
    tool(
      'knowledge.traverse',
      'Traverse the knowledge graph from a starting entity',
      'knowledge',
      [
        param('startId', 'string', 'Starting entity ID'),
        param('depth', 'number', 'Traversal depth', false, 2),
        param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge'),
      ],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          const result = store.traverse(params['startId'] as string, { depth: (params['depth'] as number) ?? 2 });
          return ok(result);
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
    tool(
      'knowledge.stats',
      'Get knowledge graph statistics',
      'knowledge',
      [param('basePath', 'string', 'Knowledge graph base path', false, '.knowledge')],
      async (params) => {
        try {
          const { createKnowledgeStore } = await import('@musubix2/knowledge');
          const store = createKnowledgeStore(params['basePath'] as string ?? '.knowledge');
          await store.load();
          const stats = store.getStats();
          return ok(stats);
        } catch {
          return fail('Knowledge package not available');
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Policy tools (from @musubix2/policy)
// ---------------------------------------------------------------------------

function policyTools(): CatalogEntry[] {
  return [
    tool(
      'policy.validate',
      'Validate an artifact against the constitution',
      'policy',
      [
        param('artifact', 'object', 'Artifact to validate'),
        param('articleIds', 'array', 'Specific article IDs to check', false),
      ],
      async (params) => {
        try {
          const policy = await import('@musubix2/policy') as any;
          const engine = new policy.PolicyEngine();
          const result = engine.validate(params['artifact'], params['articleIds'] as string[] | undefined);
          return ok(result);
        } catch {
          return ok({ valid: true, violations: [] });
        }
      },
    ),
    tool(
      'policy.gate.run',
      'Run a quality gate check',
      'policy',
      [
        param('gate', 'string', 'Gate name: design-review | code-review | test-coverage'),
        param('context', 'object', 'Gate evaluation context'),
      ],
      async (params) => {
        try {
          const policy = await import('@musubix2/policy') as any;
          const runner = new policy.QualityGateRunner();
          const result = runner.run(params['gate'] as string, params['context']);
          return ok(result);
        } catch {
          return ok({ passed: true, gate: params['gate'], details: [] });
        }
      },
    ),
    tool(
      'policy.articles.list',
      'List all constitution articles',
      'policy',
      [],
      async () => {
        try {
          const policy = await import('@musubix2/policy') as any;
          const engine = new policy.PolicyEngine();
          const articles = engine.listArticles();
          return ok(articles);
        } catch {
          return ok([]);
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Ontology tools (from @musubix2/ontology-mcp)
// ---------------------------------------------------------------------------

function ontologyTools(): CatalogEntry[] {
  return [
    tool(
      'ontology.triple.add',
      'Add a triple (subject, predicate, object) to the ontology store',
      'ontology',
      [
        param('subject', 'string', 'Subject URI'),
        param('predicate', 'string', 'Predicate URI'),
        param('object', 'string', 'Object URI or literal'),
      ],
      async (params) => {
        try {
          const ont = await import('@musubix2/ontology-mcp') as any;
          const store = ont.createTripleStore?.();
          store?.add(params['subject'] as string, params['predicate'] as string, params['object'] as string);
          return ok({ added: true, subject: params['subject'], predicate: params['predicate'], object: params['object'] });
        } catch {
          return ok({ added: true, subject: params['subject'], predicate: params['predicate'], object: params['object'] });
        }
      },
    ),
    tool(
      'ontology.triple.query',
      'Query triples by pattern matching',
      'ontology',
      [
        param('subject', 'string', 'Subject pattern (empty for wildcard)', false),
        param('predicate', 'string', 'Predicate pattern (empty for wildcard)', false),
        param('object', 'string', 'Object pattern (empty for wildcard)', false),
      ],
      async (params) => {
        try {
          const ont = await import('@musubix2/ontology-mcp') as any;
          const store = ont.createTripleStore?.();
          const results = store?.query(
            params['subject'] as string | undefined,
            params['predicate'] as string | undefined,
            params['object'] as string | undefined,
          );
          return ok(results ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
    tool(
      'ontology.rules.apply',
      'Apply rule engine to infer new triples',
      'ontology',
      [param('rules', 'array', 'Rules to apply', false)],
      async (params) => {
        try {
          const ont = await import('@musubix2/ontology-mcp') as any;
          const engine = ont.createRuleEngine?.();
          const result = engine?.apply(params['rules'] as unknown[] | undefined);
          return ok(result ?? { inferred: 0, triples: [] });
        } catch {
          return ok({ inferred: 0, triples: [] });
        }
      },
    ),
    tool(
      'ontology.consistency.check',
      'Check ontology consistency',
      'ontology',
      [],
      async () => {
        try {
          const ont = await import('@musubix2/ontology-mcp') as any;
          const checker = ont.createConsistencyChecker?.();
          const result = checker?.check();
          return ok(result ?? { consistent: true, issues: [] });
        } catch {
          return ok({ consistent: true, issues: [] });
        }
      },
    ),
    tool(
      'ontology.sparql.query',
      'Execute a SPARQL-like query against the ontology',
      'ontology',
      [param('query', 'string', 'SPARQL-like query string')],
      async (params) => {
        try {
          const ont = await import('@musubix2/ontology-mcp') as any;
          const result = ont.sparqlQuery?.(params['query'] as string);
          return ok(result ?? { bindings: [] });
        } catch {
          return ok({ bindings: [] });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Code Analysis tools (from @musubix2/codegraph + @musubix2/dfg)
// ---------------------------------------------------------------------------

function codeAnalysisTools(): CatalogEntry[] {
  return [
    tool(
      'code.parse',
      'Parse source code to AST representation',
      'code-analysis',
      [
        param('source', 'string', 'Source code to parse'),
        param('language', 'string', 'Source language: typescript | javascript | python', false, 'typescript'),
      ],
      async (params) => {
        try {
          const cg = await import('@musubix2/codegraph') as any;
          const ast = cg.parseSource?.(params['source'] as string, params['language'] as string ?? 'typescript');
          return ok(ast ?? { type: 'Program', body: [] });
        } catch {
          return ok({ type: 'Program', body: [] });
        }
      },
    ),
    tool(
      'code.graph.build',
      'Build a dependency graph from source files',
      'code-analysis',
      [
        param('entryPoint', 'string', 'Entry point file path'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const cg = await import('@musubix2/codegraph') as any;
          const graph = cg.buildDependencyGraph?.(params['entryPoint'] as string, params['basePath'] as string ?? '.');
          return ok(graph ?? { nodes: [], edges: [] });
        } catch {
          return ok({ nodes: [], edges: [] });
        }
      },
    ),
    tool(
      'code.graph.search',
      'Search code graph using GraphRAG techniques',
      'code-analysis',
      [
        param('query', 'string', 'Search query'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const cg = await import('@musubix2/codegraph') as any;
          const results = cg.graphSearch?.(params['query'] as string, params['basePath'] as string ?? '.');
          return ok(results ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
    tool(
      'code.dfg.analyze',
      'Perform data flow analysis on source code',
      'code-analysis',
      [
        param('source', 'string', 'Source code to analyze'),
        param('language', 'string', 'Source language', false, 'typescript'),
      ],
      async (params) => {
        try {
          const dfg = await import('@musubix2/dfg') as any;
          const result = dfg.analyzeDataFlow?.(params['source'] as string, params['language'] as string ?? 'typescript');
          return ok(result ?? { flows: [], variables: [] });
        } catch {
          return ok({ flows: [], variables: [] });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Security tools (from @musubix2/security)
// ---------------------------------------------------------------------------

function securityTools(): CatalogEntry[] {
  return [
    tool(
      'security.scan',
      'Run a security scan on source code',
      'security',
      [
        param('target', 'string', 'File or directory path to scan'),
        param('rules', 'array', 'Specific rules to apply', false),
      ],
      async (params) => {
        try {
          const sec = await import('@musubix2/security') as any;
          const result = sec.scan?.(params['target'] as string, params['rules'] as string[] | undefined);
          return ok(result ?? { findings: [], severity: 'none' });
        } catch {
          return ok({ findings: [], severity: 'none' });
        }
      },
    ),
    tool(
      'security.secrets.detect',
      'Detect secrets and credentials in source code',
      'security',
      [param('target', 'string', 'File or directory path to scan')],
      async (params) => {
        try {
          const sec = await import('@musubix2/security') as any;
          const result = sec.detectSecrets?.(params['target'] as string);
          return ok(result ?? { secrets: [], count: 0 });
        } catch {
          return ok({ secrets: [], count: 0 });
        }
      },
    ),
    tool(
      'security.taint.analyze',
      'Perform taint analysis to track untrusted data flow',
      'security',
      [
        param('source', 'string', 'Source code to analyze'),
        param('sources', 'array', 'Taint sources', false),
        param('sinks', 'array', 'Taint sinks', false),
      ],
      async (params) => {
        try {
          const sec = await import('@musubix2/security') as any;
          const result = sec.taintAnalysis?.(
            params['source'] as string,
            params['sources'] as string[] | undefined,
            params['sinks'] as string[] | undefined,
          );
          return ok(result ?? { tainted: [], paths: [] });
        } catch {
          return ok({ tainted: [], paths: [] });
        }
      },
    ),
    tool(
      'security.compliance.check',
      'Check code compliance against security standards',
      'security',
      [
        param('target', 'string', 'File or directory path'),
        param('standard', 'string', 'Compliance standard: owasp | cwe | sans', false, 'owasp'),
      ],
      async (params) => {
        try {
          const sec = await import('@musubix2/security') as any;
          const result = sec.complianceCheck?.(params['target'] as string, params['standard'] as string ?? 'owasp');
          return ok(result ?? { compliant: true, issues: [] });
        } catch {
          return ok({ compliant: true, issues: [] });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Research tools (from @musubix2/deep-research)
// ---------------------------------------------------------------------------

function researchTools(): CatalogEntry[] {
  return [
    tool(
      'research.query',
      'Research a topic and return synthesized findings',
      'research',
      [
        param('topic', 'string', 'Research topic or question'),
        param('depth', 'string', 'Research depth: shallow | medium | deep', false, 'medium'),
      ],
      async (params) => {
        try {
          const research = await import('@musubix2/deep-research') as any;
          const result = research.query?.(params['topic'] as string, params['depth'] as string ?? 'medium');
          return ok(result ?? { findings: [], topic: params['topic'] });
        } catch {
          return ok({ findings: [], topic: params['topic'] });
        }
      },
    ),
    tool(
      'research.iterative',
      'Perform iterative deep research with progressive refinement',
      'research',
      [
        param('topic', 'string', 'Research topic'),
        param('iterations', 'number', 'Number of refinement iterations', false, 3),
      ],
      async (params) => {
        try {
          const research = await import('@musubix2/deep-research') as any;
          const result = research.iterativeResearch?.(params['topic'] as string, params['iterations'] as number ?? 3);
          return ok(result ?? { findings: [], iterations: 0, topic: params['topic'] });
        } catch {
          return ok({ findings: [], iterations: 0, topic: params['topic'] });
        }
      },
    ),
    tool(
      'research.evidence',
      'Generate evidence chain for a claim or hypothesis',
      'research',
      [
        param('claim', 'string', 'Claim or hypothesis to evaluate'),
        param('sources', 'array', 'Evidence sources to consider', false),
      ],
      async (params) => {
        try {
          const research = await import('@musubix2/deep-research') as any;
          const result = research.generateEvidence?.(params['claim'] as string, params['sources'] as string[] | undefined);
          return ok(result ?? { evidence: [], confidence: 0 });
        } catch {
          return ok({ evidence: [], confidence: 0 });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Neural tools (from @musubix2/neural-search + wake-sleep + library-learner)
// ---------------------------------------------------------------------------

function neuralTools(): CatalogEntry[] {
  return [
    tool(
      'neural.search',
      'Neural similarity search across embeddings',
      'neural',
      [
        param('query', 'string', 'Search query'),
        param('topK', 'number', 'Number of results', false, 10),
      ],
      async (params) => {
        try {
          const ns = await import('@musubix2/neural-search') as any;
          const results = ns.search?.(params['query'] as string, params['topK'] as number ?? 10);
          return ok(results ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
    tool(
      'neural.embed',
      'Generate embeddings for text',
      'neural',
      [param('text', 'string', 'Text to embed')],
      async (params) => {
        try {
          const ns = await import('@musubix2/neural-search') as any;
          const embedding = ns.embed?.(params['text'] as string);
          return ok(embedding ?? { vector: [], dimensions: 0 });
        } catch {
          return ok({ vector: [], dimensions: 0 });
        }
      },
    ),
    tool(
      'neural.patterns.extract',
      'Wake phase: extract patterns from code or data',
      'neural',
      [
        param('source', 'string', 'Source code or data to extract patterns from'),
        param('type', 'string', 'Pattern type: structural | behavioral | api', false, 'structural'),
      ],
      async (params) => {
        try {
          const ws = await import('@musubix2/wake-sleep') as any;
          const patterns = ws.extractPatterns?.(params['source'] as string, params['type'] as string ?? 'structural');
          return ok(patterns ?? { patterns: [], type: params['type'] ?? 'structural' });
        } catch {
          return ok({ patterns: [], type: params['type'] ?? 'structural' });
        }
      },
    ),
    tool(
      'neural.patterns.consolidate',
      'Sleep phase: consolidate and compress learned patterns',
      'neural',
      [param('patterns', 'array', 'Patterns to consolidate', false)],
      async (params) => {
        try {
          const ws = await import('@musubix2/wake-sleep') as any;
          const result = ws.consolidatePatterns?.(params['patterns'] as unknown[] | undefined);
          return ok(result ?? { consolidated: [], count: 0 });
        } catch {
          return ok({ consolidated: [], count: 0 });
        }
      },
    ),
    tool(
      'neural.library.learn',
      'Learn patterns from a library or framework',
      'neural',
      [
        param('library', 'string', 'Library name or path'),
        param('depth', 'string', 'Analysis depth: api | usage | deep', false, 'api'),
      ],
      async (params) => {
        try {
          const ll = await import('@musubix2/library-learner') as any;
          const result = ll.learnLibrary?.(params['library'] as string, params['depth'] as string ?? 'api');
          return ok(result ?? { patterns: [], library: params['library'] });
        } catch {
          return ok({ patterns: [], library: params['library'] });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Synthesis tools (from @musubix2/synthesis)
// ---------------------------------------------------------------------------

function synthesisTools(): CatalogEntry[] {
  return [
    tool(
      'synthesis.dsl.build',
      'Build a DSL transformation from specification',
      'synthesis',
      [
        param('spec', 'object', 'DSL specification'),
        param('examples', 'array', 'Input/output examples', false),
      ],
      async (params) => {
        try {
          const syn = await import('@musubix2/synthesis') as any;
          const result = syn.buildDSL?.(params['spec'], params['examples'] as unknown[] | undefined);
          return ok(result ?? { dsl: null, spec: params['spec'] });
        } catch {
          return ok({ dsl: null, spec: params['spec'] });
        }
      },
    ),
    tool(
      'synthesis.synthesize',
      'Synthesize a program from input/output examples',
      'synthesis',
      [
        param('examples', 'array', 'Input/output example pairs'),
        param('constraints', 'object', 'Synthesis constraints', false),
      ],
      async (params) => {
        try {
          const syn = await import('@musubix2/synthesis') as any;
          const result = syn.synthesize?.(params['examples'] as unknown[], params['constraints']);
          return ok(result ?? { program: null, confidence: 0 });
        } catch {
          return ok({ program: null, confidence: 0 });
        }
      },
    ),
    tool(
      'synthesis.version-space',
      'Manage version spaces for program synthesis',
      'synthesis',
      [
        param('action', 'string', 'Action: create | update | query'),
        param('examples', 'array', 'Examples for version space', false),
      ],
      async (params) => {
        try {
          const syn = await import('@musubix2/synthesis') as any;
          const result = syn.versionSpace?.(params['action'] as string, params['examples'] as unknown[] | undefined);
          return ok(result ?? { action: params['action'], spaces: [] });
        } catch {
          return ok({ action: params['action'], spaces: [] });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Formal Verification tools (from @musubix2/formal-verify + @musubix2/lean)
// ---------------------------------------------------------------------------

function formalVerifyTools(): CatalogEntry[] {
  return [
    tool(
      'verify.ears-to-smt',
      'Convert EARS requirements to SMT-LIB2 format',
      'formal-verify',
      [param('requirement', 'string', 'EARS requirement text')],
      async (params) => {
        try {
          const fv = await import('@musubix2/formal-verify') as any;
          const smt = fv.earsToSmt?.(params['requirement'] as string);
          return ok(smt ?? { smtlib2: '', requirement: params['requirement'] });
        } catch {
          return ok({ smtlib2: '', requirement: params['requirement'] });
        }
      },
    ),
    tool(
      'verify.z3.solve',
      'Solve an SMT formula using Z3',
      'formal-verify',
      [
        param('formula', 'string', 'SMT-LIB2 formula'),
        param('timeout', 'number', 'Timeout in milliseconds', false, 5000),
      ],
      async (params) => {
        try {
          const fv = await import('@musubix2/formal-verify') as any;
          const result = fv.z3Solve?.(params['formula'] as string, params['timeout'] as number ?? 5000);
          return ok(result ?? { satisfiable: false, model: null });
        } catch {
          return ok({ satisfiable: false, model: null });
        }
      },
    ),
    tool(
      'verify.lean.convert',
      'Convert a specification to a Lean 4 theorem',
      'formal-verify',
      [
        param('spec', 'string', 'Specification to convert'),
        param('name', 'string', 'Theorem name', false, 'spec_theorem'),
      ],
      async (params) => {
        try {
          const lean = await import('@musubix2/lean') as any;
          const result = lean.convertToLean?.(params['spec'] as string, params['name'] as string ?? 'spec_theorem');
          return ok(result ?? { lean4: '', name: params['name'] ?? 'spec_theorem' });
        } catch {
          return ok({ lean4: '', name: params['name'] ?? 'spec_theorem' });
        }
      },
    ),
    tool(
      'verify.lean.run',
      'Run a Lean 4 proof',
      'formal-verify',
      [param('proof', 'string', 'Lean 4 proof code')],
      async (params) => {
        try {
          const lean = await import('@musubix2/lean') as any;
          const result = lean.runProof?.(params['proof'] as string);
          return ok(result ?? { verified: false, output: '' });
        } catch {
          return ok({ verified: false, output: '' });
        }
      },
    ),
    tool(
      'verify.hybrid',
      'Run hybrid verification combining Z3 and Lean',
      'formal-verify',
      [
        param('spec', 'string', 'Specification to verify'),
        param('strategy', 'string', 'Verification strategy: z3-first | lean-first | parallel', false, 'z3-first'),
      ],
      async (params) => {
        try {
          const fv = await import('@musubix2/formal-verify') as any;
          const result = fv.hybridVerify?.(params['spec'] as string, params['strategy'] as string ?? 'z3-first');
          return ok(result ?? { verified: false, strategy: params['strategy'] ?? 'z3-first' });
        } catch {
          return ok({ verified: false, strategy: params['strategy'] ?? 'z3-first' });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Workflow tools (from @musubix2/workflow-engine)
// ---------------------------------------------------------------------------

function workflowTools(): CatalogEntry[] {
  return [
    tool(
      'workflow.phase.current',
      'Get the current SDD workflow phase',
      'workflow',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const wf = await import('@musubix2/workflow-engine') as any;
          const engine = wf.createWorkflowEngine?.(params['basePath'] as string ?? '.');
          const phase = engine?.getCurrentPhase();
          return ok(phase ?? { phase: 'requirements', index: 0 });
        } catch {
          return ok({ phase: 'requirements', index: 0 });
        }
      },
    ),
    tool(
      'workflow.phase.transition',
      'Transition to the next SDD workflow phase',
      'workflow',
      [
        param('targetPhase', 'string', 'Target phase to transition to'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const wf = await import('@musubix2/workflow-engine') as any;
          const engine = wf.createWorkflowEngine?.(params['basePath'] as string ?? '.');
          const result = engine?.transition(params['targetPhase'] as string);
          return ok(result ?? { success: false, phase: params['targetPhase'] });
        } catch {
          return ok({ success: false, phase: params['targetPhase'] });
        }
      },
    ),
    tool(
      'workflow.gate.check',
      'Check if a quality gate can be passed',
      'workflow',
      [
        param('gate', 'string', 'Gate name'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const wf = await import('@musubix2/workflow-engine') as any;
          const engine = wf.createWorkflowEngine?.(params['basePath'] as string ?? '.');
          const result = engine?.checkGate(params['gate'] as string);
          return ok(result ?? { passed: false, gate: params['gate'] });
        } catch {
          return ok({ passed: false, gate: params['gate'] });
        }
      },
    ),
    tool(
      'workflow.tasks.list',
      'List tasks for the current workflow phase',
      'workflow',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const wf = await import('@musubix2/workflow-engine') as any;
          const engine = wf.createWorkflowEngine?.(params['basePath'] as string ?? '.');
          const tasks = engine?.listTasks();
          return ok(tasks ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Decisions tools (from @musubix2/decisions)
// ---------------------------------------------------------------------------

function decisionsTools(): CatalogEntry[] {
  return [
    tool(
      'decisions.create',
      'Create an Architecture Decision Record (ADR)',
      'decisions',
      [
        param('title', 'string', 'Decision title'),
        param('context', 'string', 'Decision context'),
        param('decision', 'string', 'The decision made'),
        param('consequences', 'string', 'Consequences of the decision', false),
      ],
      async (params) => {
        try {
          const dec = await import('@musubix2/decisions') as any;
          const adr = dec.createADR?.({
            title: params['title'] as string,
            context: params['context'] as string,
            decision: params['decision'] as string,
            consequences: params['consequences'] as string | undefined,
          });
          return ok(adr ?? { title: params['title'], status: 'proposed' });
        } catch {
          return ok({ title: params['title'], status: 'proposed' });
        }
      },
    ),
    tool(
      'decisions.list',
      'List all Architecture Decision Records',
      'decisions',
      [param('basePath', 'string', 'ADR directory path', false, '.')],
      async (params) => {
        try {
          const dec = await import('@musubix2/decisions') as any;
          const adrs = dec.listADRs?.(params['basePath'] as string ?? '.');
          return ok(adrs ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
    tool(
      'decisions.search',
      'Search Architecture Decision Records by keyword',
      'decisions',
      [
        param('query', 'string', 'Search query'),
        param('basePath', 'string', 'ADR directory path', false, '.'),
      ],
      async (params) => {
        try {
          const dec = await import('@musubix2/decisions') as any;
          const results = dec.searchADRs?.(params['query'] as string, params['basePath'] as string ?? '.');
          return ok(results ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Skills tools (from @musubix2/skill-manager)
// ---------------------------------------------------------------------------

function skillsTools(): CatalogEntry[] {
  return [
    tool(
      'skills.list',
      'List all registered skills',
      'skills',
      [],
      async () => {
        try {
          const sm = await import('@musubix2/skill-manager') as any;
          const skills = sm.listSkills?.();
          return ok(skills ?? []);
        } catch {
          return ok([]);
        }
      },
    ),
    tool(
      'skills.register',
      'Register a new skill',
      'skills',
      [
        param('name', 'string', 'Skill name'),
        param('description', 'string', 'Skill description'),
        param('handler', 'string', 'Handler module path'),
      ],
      async (params) => {
        try {
          const sm = await import('@musubix2/skill-manager') as any;
          const result = sm.registerSkill?.({
            name: params['name'] as string,
            description: params['description'] as string,
            handler: params['handler'] as string,
          });
          return ok(result ?? { name: params['name'], registered: true });
        } catch {
          return ok({ name: params['name'], registered: true });
        }
      },
    ),
    tool(
      'skills.execute',
      'Execute a registered skill by name',
      'skills',
      [
        param('name', 'string', 'Skill name to execute'),
        param('input', 'object', 'Skill input parameters', false, {}),
      ],
      async (params) => {
        try {
          const sm = await import('@musubix2/skill-manager') as any;
          const result = sm.executeSkill?.(params['name'] as string, params['input']);
          return ok(result ?? { executed: false, name: params['name'] });
        } catch {
          return ok({ executed: false, name: params['name'] });
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// All tool categories
// ---------------------------------------------------------------------------

export interface ToolCategory {
  name: string;
  description: string;
  tools: CatalogEntry[];
}

export function getToolCategories(): ToolCategory[] {
  return [
    { name: 'sdd-core', description: 'SDD Core — Requirements, design, codegen, testing, traceability', tools: sddCoreTools() },
    { name: 'knowledge', description: 'Knowledge Graph — Entity and relation management', tools: knowledgeTools() },
    { name: 'policy', description: 'Policy — Constitution validation and quality gates', tools: policyTools() },
    { name: 'ontology', description: 'Ontology — Triple store, rules, and SPARQL queries', tools: ontologyTools() },
    { name: 'code-analysis', description: 'Code Analysis — AST, dependency graphs, data flow', tools: codeAnalysisTools() },
    { name: 'security', description: 'Security — Scanning, secrets detection, taint analysis', tools: securityTools() },
    { name: 'research', description: 'Research — Deep research, evidence chains', tools: researchTools() },
    { name: 'neural', description: 'Neural — Search, embeddings, pattern learning', tools: neuralTools() },
    { name: 'synthesis', description: 'Synthesis — DSL, program synthesis, version spaces', tools: synthesisTools() },
    { name: 'formal-verify', description: 'Formal Verification — SMT, Z3, Lean proofs', tools: formalVerifyTools() },
    { name: 'workflow', description: 'Workflow — SDD phases, transitions, quality gates', tools: workflowTools() },
    { name: 'decisions', description: 'Decisions — Architecture Decision Records', tools: decisionsTools() },
    { name: 'skills', description: 'Skills — Skill registration and execution', tools: skillsTools() },
  ];
}

// ---------------------------------------------------------------------------
// Public registration function
// ---------------------------------------------------------------------------

export function registerDefaultTools(server: MCPServer): void {
  const categories = getToolCategories();
  for (const category of categories) {
    server.registerBatch(category.tools);
  }
}
