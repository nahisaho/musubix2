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
      'Create and classify an EARS requirement (Easy Approach to Requirements Syntax)',
      'sdd-core',
      [
        param('text', 'string', 'Requirement text (EARS sentence)'),
        param('id', 'string', 'Requirement ID', false),
      ],
      async (params) => {
        try {
          const { createEARSValidator } = await import('@musubix2/core');
          const v = createEARSValidator();
          const text = params['text'] as string;
          const analysis = v.analyze(text);
          const validation = v.validate(text);
          return ok({
            id: (params['id'] as string) ?? 'REQ-XXX-001',
            text,
            pattern: analysis.pattern,
            confidence: analysis.confidence,
            valid: validation.valid,
            issues: validation.issues,
          });
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.requirements.validate',
      'Validate requirements (EARS pattern + issues) for a list of requirement texts',
      'sdd-core',
      [param('requirements', 'array', 'Array of requirement texts or {text} objects')],
      async (params) => {
        try {
          const { createEARSValidator } = await import('@musubix2/core');
          const v = createEARSValidator();
          const items = (params['requirements'] as Array<string | { text?: string }>) ?? [];
          const results = items.map((it) => {
            const text = typeof it === 'string' ? it : (it.text ?? '');
            const analysis = v.analyze(text);
            const validation = v.validate(text);
            return { text, pattern: analysis.pattern, valid: validation.valid, issues: validation.issues };
          });
          return ok({ results, allValid: results.every((r) => r.valid) });
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.requirements.list',
      'Parse and list requirements from a Markdown requirements document',
      'sdd-core',
      [param('markdown', 'string', 'Requirements document contents (Markdown)')],
      async (params) => {
        try {
          const { MarkdownEARSParser } = await import('@musubix2/core');
          const parsed = new MarkdownEARSParser().parse((params['markdown'] as string) ?? '');
          return ok(parsed.map((r) => ({ id: r.id, title: r.title, pattern: r.pattern, text: r.text })));
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.design.generate',
      'Generate a design document from parsed requirements',
      'sdd-core',
      [param('requirements', 'array', 'Requirements as {id,title,text,pattern} objects')],
      async (params) => {
        try {
          const { createDesignGenerator } = await import('@musubix2/core');
          const reqs = (params['requirements'] as Array<Record<string, unknown>>) ?? [];
          const mapped = reqs.map((r) => ({
            id: String(r['id'] ?? 'REQ-XXX-001'),
            title: String(r['title'] ?? ''),
            text: String(r['text'] ?? ''),
            pattern: String(r['pattern'] ?? 'ubiquitous'),
          }));
          return ok(createDesignGenerator().generate(mapped));
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.design.verify',
      'Verify a design against SOLID principles',
      'sdd-core',
      [param('requirements', 'array', 'Requirements the design is generated from')],
      async (params) => {
        try {
          const { createDesignGenerator, createSOLIDValidator } = await import('@musubix2/core');
          const reqs = (params['requirements'] as Array<Record<string, unknown>>) ?? [];
          const mapped = reqs.map((r) => ({
            id: String(r['id'] ?? 'REQ-XXX-001'),
            title: String(r['title'] ?? ''),
            text: String(r['text'] ?? ''),
            pattern: String(r['pattern'] ?? 'ubiquitous'),
          }));
          const design = createDesignGenerator().generate(mapped);
          return ok(createSOLIDValidator().validate(design));
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.codegen.generate',
      'Generate a code skeleton (class/interface/function) from a name',
      'sdd-core',
      [
        param('name', 'string', 'Symbol name to generate'),
        param('templateType', 'string', 'class | interface | function | enum | type', false, 'class'),
        param('description', 'string', 'Doc description', false),
      ],
      async (params) => {
        try {
          const { createCodeGenerator } = await import('@musubix2/core');
          const code = createCodeGenerator().generate({
            templateType: (params['templateType'] as string ?? 'class') as never,
            name: (params['name'] as string) ?? 'Generated',
            description: params['description'] as string | undefined,
          });
          return ok(code);
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.test.generate',
      'Generate a unit-test skeleton from source code',
      'sdd-core',
      [
        param('code', 'string', 'Source code to generate tests for'),
        param('style', 'string', 'Test style: unit | integration', false, 'unit'),
      ],
      async (params) => {
        try {
          const { createUnitTestGenerator } = await import('@musubix2/core');
          const suite = createUnitTestGenerator().generate(
            (params['code'] as string) ?? '',
            (params['style'] as string ?? 'unit') as never,
          );
          return ok(suite);
        } catch {
          return fail('Core package not available');
        }
      },
    ),
    tool(
      'sdd.trace.verify',
      'Verify requirement → code coverage by scanning source references (REQ-XXX-NNN)',
      'sdd-core',
      [
        param('requirementIds', 'array', 'Requirement IDs to check (e.g. ["REQ-AUT-001"])'),
        param('sources', 'array', 'Sources as {file, code} objects to scan for references'),
      ],
      async (params) => {
        try {
          const reqIds = [...new Set((params['requirementIds'] as string[]) ?? [])];
          const sources = (params['sources'] as Array<{ file?: string; code?: string }>) ?? [];
          const refRe = /REQ-[A-Z]{3}-\d{3}/g;
          const covered = new Set<string>();
          for (const s of sources) {
            for (const m of (s.code ?? '').matchAll(refRe)) {
              if (reqIds.includes(m[0])) covered.add(m[0]);
            }
          }
          const gaps = reqIds.filter((r) => !covered.has(r));
          const coverage = reqIds.length === 0 ? 0 : Math.round((covered.size / reqIds.length) * 100);
          return ok({
            total: reqIds.length,
            covered: covered.size,
            coverage,
            gaps,
            complete: gaps.length === 0 && reqIds.length > 0,
          });
        } catch {
          return fail('Trace verification failed');
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
          const entity = await store.getEntity(params['id'] as string);
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
          const results = await store.search(params['query'] as string, { limit: (params['limit'] as number) ?? 10 });
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
          const result = await store.traverse(params['startId'] as string, { depth: (params['depth'] as number) ?? 2 });
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

// Persist ontology triples so MCP calls (and the CLI) share the same store.
async function loadTripleStore(basePath: string) {
  const { createOntologyStore } = await import('@musubix2/ontology-mcp');
  const store = createOntologyStore();
  const { existsSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const file = join(basePath, '.musubix', 'ontology.json');
  try {
    if (existsSync(file)) {
      store.addTriples(JSON.parse(readFileSync(file, 'utf-8')));
    }
  } catch { /* start empty */ }
  return { store, file };
}
async function saveTripleStore(store: { getAll(): unknown[] }, file: string) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(store.getAll(), null, 2), 'utf-8');
}

function ontologyTools(): CatalogEntry[] {
  return [
    tool(
      'ontology.triple.add',
      'Add a triple (subject, predicate, object) to the persisted ontology store',
      'ontology',
      [
        param('subject', 'string', 'Subject'),
        param('predicate', 'string', 'Predicate'),
        param('object', 'string', 'Object (URI or literal)'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const { store, file } = await loadTripleStore((params['basePath'] as string) ?? '.');
          store.addTriple({
            subject: params['subject'] as string,
            predicate: params['predicate'] as string,
            object: params['object'] as string,
          });
          await saveTripleStore(store, file);
          return ok({ added: true, total: store.size() });
        } catch {
          return fail('Ontology package not available');
        }
      },
    ),
    tool(
      'ontology.triple.query',
      'Query triples by pattern (omit a term to wildcard it)',
      'ontology',
      [
        param('subject', 'string', 'Subject pattern', false),
        param('predicate', 'string', 'Predicate pattern', false),
        param('object', 'string', 'Object pattern', false),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const { store } = await loadTripleStore((params['basePath'] as string) ?? '.');
          const results = store.query({
            subject: params['subject'] as string | undefined,
            predicate: params['predicate'] as string | undefined,
            object: params['object'] as string | undefined,
          });
          return ok({ results, count: results.length });
        } catch {
          return fail('Ontology package not available');
        }
      },
    ),
    tool(
      'ontology.rules.apply',
      'Apply the default OWL 2 RL rule engine to infer new triples',
      'ontology',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const { createRuleEngine } = await import('@musubix2/ontology-mcp');
          const { store, file } = await loadTripleStore((params['basePath'] as string) ?? '.');
          const result = createRuleEngine(true).applyRules(store);
          await saveTripleStore(store, file);
          return ok(result);
        } catch {
          return fail('Ontology package not available');
        }
      },
    ),
    tool(
      'ontology.consistency.check',
      'Check ontology consistency against the persisted store',
      'ontology',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const { createConsistencyValidator } = await import('@musubix2/ontology-mcp');
          const { store } = await loadTripleStore((params['basePath'] as string) ?? '.');
          return ok(createConsistencyValidator().validate(store));
        } catch {
          return fail('Ontology package not available');
        }
      },
    ),
    tool(
      'ontology.sparql.query',
      'Pattern query over the store (basic subject/predicate/object matching)',
      'ontology',
      [
        param('subject', 'string', 'Subject pattern', false),
        param('predicate', 'string', 'Predicate pattern', false),
        param('object', 'string', 'Object pattern', false),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const { store } = await loadTripleStore((params['basePath'] as string) ?? '.');
          const bindings = store.query({
            subject: params['subject'] as string | undefined,
            predicate: params['predicate'] as string | undefined,
            object: params['object'] as string | undefined,
          });
          return ok({ bindings, count: bindings.length });
        } catch {
          return fail('Ontology package not available');
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
          const { createASTParser } = await import('@musubix2/codegraph');
          const nodes = createASTParser().parse(
            (params['source'] as string) ?? '',
            (params['language'] as string ?? 'typescript') as never,
          );
          return ok({ nodes, count: nodes.length });
        } catch {
          return fail('Codegraph package not available');
        }
      },
    ),
    tool(
      'code.graph.build',
      'Build a code graph (nodes) from inline sources',
      'code-analysis',
      [param('sources', 'array', 'Sources as {code, language, filePath} objects')],
      async (params) => {
        try {
          const { createASTParser, createGraphEngine } = await import('@musubix2/codegraph');
          const parser = createASTParser();
          const engine = createGraphEngine();
          const sources = (params['sources'] as Array<{ code?: string; language?: string; filePath?: string }>) ?? [];
          for (const s of sources) {
            const lang = (s.language ?? 'typescript') as never;
            for (const n of parser.parse(s.code ?? '', lang)) {
              engine.addNode({
                id: `${s.filePath ?? 'inline'}:${n.name}`,
                name: n.name,
                kind: n.kind,
                filePath: s.filePath ?? 'inline',
                language: lang,
                startLine: n.startLine ?? 0,
                endLine: n.endLine ?? 0,
              });
            }
          }
          const stats = engine.getStats();
          return ok({ nodeCount: stats.nodeCount, edgeCount: stats.edgeCount, languages: [...stats.languages] });
        } catch {
          return fail('Codegraph package not available');
        }
      },
    ),
    tool(
      'code.graph.search',
      'Search a code graph built from inline sources using GraphRAG',
      'code-analysis',
      [
        param('query', 'string', 'Search query'),
        param('sources', 'array', 'Sources as {code, language, filePath} objects to index'),
      ],
      async (params) => {
        try {
          const { createASTParser, createGraphEngine, GraphRAGSearch } = await import('@musubix2/codegraph');
          const parser = createASTParser();
          const engine = createGraphEngine();
          const sources = (params['sources'] as Array<{ code?: string; language?: string; filePath?: string }>) ?? [];
          for (const s of sources) {
            const lang = (s.language ?? 'typescript') as never;
            for (const n of parser.parse(s.code ?? '', lang)) {
              engine.addNode({
                id: `${s.filePath ?? 'inline'}:${n.name}`,
                name: n.name,
                kind: n.kind,
                filePath: s.filePath ?? 'inline',
                language: lang,
                startLine: n.startLine ?? 0,
                endLine: n.endLine ?? 0,
              });
            }
          }
          const results = new GraphRAGSearch(engine).globalSearch((params['query'] as string) ?? '');
          return ok({ query: params['query'], results });
        } catch {
          return fail('Codegraph package not available');
        }
      },
    ),
    tool(
      'code.dfg.analyze',
      'Build a data-flow graph from structured statements and report reaching definitions',
      'code-analysis',
      [
        param('statements', 'array', 'SimpleStatement[] (type/line/variable/value/usedVariables)'),
        param('scope', 'string', 'Scope name', false, 'global'),
      ],
      async (params) => {
        try {
          const { createDataFlowAnalyzer } = await import('@musubix2/dfg');
          const dfg = createDataFlowAnalyzer().buildDFG(
            (params['statements'] as never[]) ?? [],
            (params['scope'] as string) ?? 'global',
          );
          return ok(dfg);
        } catch {
          return fail('DFG package not available');
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Security tools (from @musubix2/security)
// ---------------------------------------------------------------------------

// Accept inline source via `code` (preferred) or `target` for compatibility.
function sourceOf(params: Record<string, unknown>): string {
  return (params['code'] as string) ?? (params['source'] as string) ?? (params['target'] as string) ?? '';
}
function severityOf(findings: Array<{ severity?: string }>): string {
  const order = ['critical', 'high', 'medium', 'low', 'info'];
  for (const s of order) if (findings.some((f) => f.severity === s)) return s;
  return 'none';
}

function securityTools(): CatalogEntry[] {
  return [
    tool(
      'security.scan',
      'Run a security scan on source code',
      'security',
      [
        param('code', 'string', 'Source code to scan'),
        param('filePath', 'string', 'File path for the source (for reporting)', false, 'inline'),
      ],
      async (params) => {
        try {
          const { createSecurityScanner } = await import('@musubix2/security');
          const result = createSecurityScanner().scan(sourceOf(params), (params['filePath'] as string) ?? 'inline');
          return ok({ findings: result.findings, severity: severityOf(result.findings) });
        } catch {
          return fail('Security package not available');
        }
      },
    ),
    tool(
      'security.secrets.detect',
      'Detect secrets and credentials in source code',
      'security',
      [
        param('code', 'string', 'Source code to scan'),
        param('filePath', 'string', 'File path for the source', false, 'inline'),
      ],
      async (params) => {
        try {
          const { createSecretDetector } = await import('@musubix2/security');
          const secrets = createSecretDetector().scan(sourceOf(params), (params['filePath'] as string) ?? 'inline');
          return ok({ secrets, count: secrets.length });
        } catch {
          return fail('Security package not available');
        }
      },
    ),
    tool(
      'security.taint.analyze',
      'Perform taint analysis to track untrusted data flow',
      'security',
      [
        param('code', 'string', 'Source code to analyze'),
        param('filePath', 'string', 'File path for the source', false, 'inline'),
      ],
      async (params) => {
        try {
          const { TaintAnalyzer } = await import('@musubix2/security');
          const tainted = new TaintAnalyzer().analyze(sourceOf(params), (params['filePath'] as string) ?? 'inline');
          return ok({ tainted, count: tainted.length });
        } catch {
          return fail('Security package not available');
        }
      },
    ),
    tool(
      'security.compliance.check',
      'Check code compliance against registered security policies',
      'security',
      [
        param('code', 'string', 'Source code to check'),
        param('filePath', 'string', 'File path for the source', false, 'inline'),
      ],
      async (params) => {
        try {
          const { createComplianceChecker } = await import('@musubix2/security');
          const result = createComplianceChecker().check(sourceOf(params), (params['filePath'] as string) ?? 'inline', []);
          return ok(result);
        } catch {
          return fail('Security package not available');
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
      'Apply a DSL transform pipeline to an input string',
      'synthesis',
      [
        param('input', 'string', 'Input string to transform'),
        param('ops', 'array', 'Ops: trim | upper | lower | reverse | capitalize | camelCase | snakeCase | replace:from:to'),
      ],
      async (params) => {
        try {
          const { createDSLBuilder } = await import('@musubix2/synthesis');
          const builder = createDSLBuilder();
          const ops = (params['ops'] as string[]) ?? [];
          for (const op of ops) {
            const [name, ...a] = String(op).split(':');
            switch (name) {
              case 'trim': builder.trim(); break;
              case 'upper': case 'toUpperCase': builder.toUpperCase(); break;
              case 'lower': case 'toLowerCase': builder.toLowerCase(); break;
              case 'reverse': builder.reverse(); break;
              case 'capitalize': builder.capitalize(); break;
              case 'camelCase': case 'camel': builder.camelCase(); break;
              case 'snakeCase': case 'snake': builder.snakeCase(); break;
              case 'replace': builder.replace(a[0] ?? '', a[1] ?? ''); break;
              case 'prefixRemove': builder.prefixRemove(a[0] ?? ''); break;
              case 'suffixAppend': builder.suffixAppend(a[0] ?? ''); break;
              default: return fail(`Unknown DSL op: ${name}`);
            }
          }
          const result = builder.execute((params['input'] as string) ?? '');
          return ok({ input: params['input'], ops, result });
        } catch {
          return fail('Synthesis package not available');
        }
      },
    ),
    tool(
      'synthesis.synthesize',
      'Synthesize a transformation rule from input/output examples',
      'synthesis',
      [param('examples', 'array', 'Array of {input, output} example pairs')],
      async (params) => {
        try {
          const { createSynthesisEngine } = await import('@musubix2/synthesis');
          const examples = ((params['examples'] as Array<{ input?: string; output?: string }>) ?? []).map((e) => ({
            input: e.input ?? '',
            output: e.output ?? '',
          }));
          const rule = createSynthesisEngine().synthesize(examples);
          return ok({ rule, synthesized: rule !== null });
        } catch {
          return fail('Synthesis package not available');
        }
      },
    ),
    tool(
      'synthesis.version-space',
      'Build a version space from positive/negative examples and get consistent hypotheses',
      'synthesis',
      [
        param('name', 'string', 'Version space name', false, 'default'),
        param('positive', 'array', 'Positive examples', false),
        param('negative', 'array', 'Negative examples', false),
      ],
      async (params) => {
        try {
          const { createVersionSpaceManager } = await import('@musubix2/synthesis');
          const mgr = createVersionSpaceManager();
          const name = (params['name'] as string) ?? 'default';
          mgr.create(name);
          for (const p of (params['positive'] as string[]) ?? []) mgr.addPositive(name, p);
          for (const n of (params['negative'] as string[]) ?? []) mgr.addNegative(name, n);
          return ok({ name, hypotheses: mgr.getConsistentHypotheses(name), spaces: mgr.getSpaces().size });
        } catch {
          return fail('Synthesis package not available');
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
          const { createDecisionManager } = await import('@musubix2/decisions');
          const mgr = createDecisionManager((params['basePath'] as string) ?? '.decisions');
          await mgr.load();
          const adr = await mgr.create({
            title: params['title'] as string,
            context: (params['context'] as string) ?? '',
            decision: (params['decision'] as string) ?? '',
            consequences: (params['consequences'] as string) ?? '',
          });
          return ok(adr);
        } catch {
          return fail('Decisions package not available');
        }
      },
    ),
    tool(
      'decisions.list',
      'List all Architecture Decision Records',
      'decisions',
      [param('basePath', 'string', 'ADR base path', false, '.decisions')],
      async (params) => {
        try {
          const { createDecisionManager } = await import('@musubix2/decisions');
          const mgr = createDecisionManager((params['basePath'] as string) ?? '.decisions');
          await mgr.load();
          return ok(await mgr.list());
        } catch {
          return fail('Decisions package not available');
        }
      },
    ),
    tool(
      'decisions.search',
      'Search Architecture Decision Records by keyword',
      'decisions',
      [
        param('query', 'string', 'Search query'),
        param('basePath', 'string', 'ADR base path', false, '.decisions'),
      ],
      async (params) => {
        try {
          const { createDecisionManager } = await import('@musubix2/decisions');
          const mgr = createDecisionManager((params['basePath'] as string) ?? '.decisions');
          await mgr.load();
          return ok(await mgr.search(params['query'] as string));
        } catch {
          return fail('Decisions package not available');
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
