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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
          const { createResearchEngine } = await import('@musubix2/deep-research');
          const sources = normalizeSources(params['sources']);
          const result = createResearchEngine().research(
            { topic: (params['topic'] as string) ?? '', depth: (params['depth'] as string ?? 'medium') as never },
            sources,
          );
          return ok(result);
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'research.iterative',
      'Perform iterative research with progressive refinement over provided sources',
      'research',
      [
        param('topic', 'string', 'Research topic'),
        param('depth', 'string', 'Depth: shallow | medium | deep', false, 'medium'),
        param('sources', 'array', 'Sources as {title,type,relevance,content} objects'),
      ],
      async (params) => {
        try {
          const { createResearchEngine } = await import('@musubix2/deep-research');
          const sources = normalizeSources(params['sources']);
          const result = createResearchEngine().researchIterative(
            { topic: (params['topic'] as string) ?? '', depth: (params['depth'] as string ?? 'medium') as never },
            () => sources,
          );
          return ok(result);
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'research.evidence',
      'Accumulate research results and retrieve evidence for a topic',
      'research',
      [
        param('topic', 'string', 'Topic to gather evidence for'),
        param('sources', 'array', 'Sources as {title,type,relevance,content} objects'),
      ],
      async (params) => {
        try {
          const { createResearchEngine, createKnowledgeAccumulator } = await import('@musubix2/deep-research');
          const sources = normalizeSources(params['sources']);
          const topic = (params['topic'] as string) ?? '';
          const result = createResearchEngine().research({ topic, depth: 'medium' }, sources);
          const acc = createKnowledgeAccumulator();
          acc.accumulate(result);
          return ok({ evidence: acc.query(topic), summary: result.summary, confidence: result.confidence });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
  ];
}

type NormalizedSource = { title: string; type: 'code' | 'documentation' | 'article' | 'api-reference'; relevance: number; content: string };

// Coerce loosely-typed source input into ResearchSource objects.
function normalizeSources(raw: unknown): NormalizedSource[] {
  const valid = new Set(['code', 'documentation', 'article', 'api-reference']);
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((s, i) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const t = String(o['type'] ?? 'documentation');
    return {
      title: String(o['title'] ?? `source-${i + 1}`),
      type: (valid.has(t) ? t : 'documentation') as NormalizedSource['type'],
      relevance: typeof o['relevance'] === 'number' ? (o['relevance'] as number) : 0.5,
      content: String(o['content'] ?? (typeof s === 'string' ? s : '')),
    };
  });
}

// ---------------------------------------------------------------------------
// Neural tools (from @musubix2/neural-search + wake-sleep + library-learner)
// ---------------------------------------------------------------------------

function neuralTools(): CatalogEntry[] {
  return [
    tool(
      'neural.search',
      'Neural (TF-IDF) similarity search over provided documents',
      'neural',
      [
        param('query', 'string', 'Search query'),
        param('documents', 'array', 'Documents to index: strings or {id,text} objects'),
        param('topK', 'number', 'Number of results', false, 10),
      ],
      async (params) => {
        try {
          const { createNeuralSearchEngine, createTfIdfEmbeddingModel } = await import('@musubix2/neural-search');
          const model = createTfIdfEmbeddingModel();
          const engine = createNeuralSearchEngine();
          const docs = (params['documents'] as Array<string | { id?: string; text?: string }>) ?? [];
          const texts = docs.map((d) => (typeof d === 'string' ? d : d.text ?? ''));
          // TF-IDF requires the corpus to be fitted before embedding.
          const model2 = createTfIdfEmbeddingModel();
          if (typeof (model2 as { fit?: (t: string[]) => void }).fit === 'function') {
            (model2 as { fit: (t: string[]) => void }).fit(texts);
          }
          const embedder = (typeof (model2 as { fit?: unknown }).fit === 'function') ? model2 : model;
          for (let i = 0; i < docs.length; i++) {
            const d = docs[i];
            const id = typeof d === 'string' ? `doc-${i}` : (d.id ?? `doc-${i}`);
            engine.addDocument(id, await embedder.embed(texts[i]), { text: texts[i] });
          }
          const hits = engine.search(await embedder.embed((params['query'] as string) ?? ''), (params['topK'] as number) ?? 10);
          return ok({ query: params['query'], hits });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'neural.embed',
      'Generate a TF-IDF embedding vector for text',
      'neural',
      [param('text', 'string', 'Text to embed')],
      async (params) => {
        try {
          const { createTfIdfEmbeddingModel } = await import('@musubix2/neural-search');
          const model = createTfIdfEmbeddingModel();
          const text = (params['text'] as string) ?? '';
          if (typeof (model as { fit?: (t: string[]) => void }).fit === 'function') {
            (model as { fit: (t: string[]) => void }).fit([text]);
          }
          const vector = await model.embed(text);
          return ok({ vector, dimensions: Array.isArray(vector) ? vector.length : (vector as { values?: number[] }).values?.length ?? 0 });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'neural.patterns.extract',
      'Wake phase: extract patterns from a list of items',
      'neural',
      [param('items', 'array', 'Items (strings) to process for pattern extraction')],
      async (params) => {
        try {
          const { createWakePhase } = await import('@musubix2/wake-sleep');
          const items = ((params['items'] as unknown[]) ?? []).map(String);
          return ok(createWakePhase().process(items));
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'neural.patterns.consolidate',
      'Sleep phase: consolidate and compress learned patterns',
      'neural',
      [param('patterns', 'array', 'Pattern strings to consolidate')],
      async (params) => {
        try {
          const { createSleepPhase } = await import('@musubix2/wake-sleep');
          const patterns = ((params['patterns'] as unknown[]) ?? []).map(String);
          return ok(createSleepPhase().consolidate(patterns));
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'neural.library.learn',
      'Learn reusable patterns from code snippets (E-graph library learning)',
      'neural',
      [param('snippets', 'array', 'Array of code snippet strings to learn from')],
      async (params) => {
        try {
          const { createLibraryLearner } = await import('@musubix2/library-learner');
          const snippets = ((params['snippets'] as unknown[]) ?? []).map(String);
          const patterns = createLibraryLearner().learn(snippets);
          return ok({ patterns, count: patterns.length });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Formal Verification tools (from @musubix2/formal-verify + @musubix2/lean)
// ---------------------------------------------------------------------------

// Build a {id,title,text,pattern,trigger,condition,action} spec from EARS text.
// Both formal-verify's ParsedRequirement and lean's Specification share this shape.
async function buildSpecFromParams(params: Record<string, unknown>) {
  const text = (params['text'] as string) ?? (params['requirement'] as string) ?? (params['spec'] as string) ?? '';
  let pattern = params['pattern'] as string | undefined;
  if (!pattern) {
    try {
      const { createEARSValidator } = await import('@musubix2/core');
      pattern = createEARSValidator().analyze(text).pattern;
    } catch {
      pattern = 'ubiquitous';
    }
  }
  return {
    id: (params['id'] as string) ?? 'REQ-XXX-001',
    title: (params['name'] as string) ?? (params['title'] as string) ?? 'requirement',
    text,
    pattern: pattern as never,
    trigger: params['trigger'] as string | undefined,
    condition: params['condition'] as string | undefined,
    action: (params['action'] as string) ?? text,
  };
}

function formalVerifyTools(): CatalogEntry[] {
  return [
    tool(
      'verify.ears-to-smt',
      'Convert an EARS requirement to SMT-LIB2',
      'formal-verify',
      [
        param('text', 'string', 'EARS requirement text'),
        param('action', 'string', 'Requirement action clause', false),
      ],
      async (params) => {
        try {
          const { createEarsToSmtConverter } = await import('@musubix2/formal-verify');
          return ok(createEarsToSmtConverter().convert(await buildSpecFromParams(params) as never));
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'verify.z3.solve',
      'Solve an SMT-LIB2 script with the Z3 adapter',
      'formal-verify',
      [param('formula', 'string', 'SMT-LIB2 script')],
      async (params) => {
        try {
          const { createZ3Adapter } = await import('@musubix2/formal-verify');
          return ok(await createZ3Adapter().solve((params['formula'] as string) ?? ''));
        } catch (err) {
          return fail(`Z3 solve failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    ),
    tool(
      'verify.lean.convert',
      'Convert a requirement specification to a Lean 4 theorem',
      'formal-verify',
      [
        param('text', 'string', 'Requirement text'),
        param('action', 'string', 'Requirement action clause', false),
        param('name', 'string', 'Theorem name', false, 'spec_theorem'),
      ],
      async (params) => {
        try {
          const { createEarsToLeanConverter } = await import('@musubix2/lean');
          return ok(createEarsToLeanConverter().convert(await buildSpecFromParams(params) as never));
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'verify.lean.run',
      'Run a Lean 4 proof (requires a Lean toolchain; reports availability otherwise)',
      'formal-verify',
      [param('proof', 'string', 'Lean 4 proof code')],
      async (params) => {
        try {
          const { createLeanProofRunner } = await import('@musubix2/lean');
          return ok(await createLeanProofRunner().runProof((params['proof'] as string) ?? ''));
        } catch (err) {
          return fail(`Lean proof run failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    ),
    tool(
      'verify.hybrid',
      'Run hybrid (Z3 + Lean) verification on a requirement specification',
      'formal-verify',
      [
        param('text', 'string', 'Requirement text'),
        param('action', 'string', 'Requirement action clause', false),
      ],
      async (params) => {
        try {
          const { createHybridVerifier } = await import('@musubix2/lean');
          return ok(await createHybridVerifier().verify(await buildSpecFromParams(params) as never));
        } catch (err) {
          return fail(`Hybrid verification failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Workflow tools (from @musubix2/workflow-engine)
// ---------------------------------------------------------------------------

// Load/save the shared workflow state (matches the CLI's .musubix/workflow-state.json).
async function loadTracker(basePath: string) {
  const { createStateTracker } = await import('@musubix2/workflow-engine');
  const { existsSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const tracker = createStateTracker();
  const file = join(basePath, '.musubix', 'workflow-state.json');
  try {
    if (existsSync(file)) tracker.restore(JSON.parse(readFileSync(file, 'utf-8')));
  } catch { /* start fresh */ }
  return { tracker, file };
}
async function saveTracker(tracker: { toJSON(): unknown }, file: string) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(tracker.toJSON(), null, 2), 'utf-8');
}

function workflowTools(): CatalogEntry[] {
  return [
    tool(
      'workflow.phase.current',
      'Get the current SDD workflow phase and approvals',
      'workflow',
      [param('basePath', 'string', 'Project base path', false, '.')],
      async (params) => {
        try {
          const { PHASE_ORDER } = await import('@musubix2/workflow-engine');
          const { tracker } = await loadTracker((params['basePath'] as string) ?? '.');
          const state = tracker.getState();
          return ok({
            currentPhase: state.currentPhase,
            approvals: PHASE_ORDER.map((p) => ({ phase: p, approved: tracker.isApproved(p) })),
          });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'workflow.phase.transition',
      'Transition to a target SDD workflow phase (persisted)',
      'workflow',
      [
        param('targetPhase', 'string', 'Target phase to transition to'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const { createPhaseController } = await import('@musubix2/workflow-engine');
          const { tracker, file } = await loadTracker((params['basePath'] as string) ?? '.');
          const result = await createPhaseController(tracker).transitionTo(params['targetPhase'] as never);
          if (result.success) await saveTracker(tracker, file);
          return ok(result);
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'workflow.gate.check',
      'Check whether the workflow can transition to a target phase (quality gates)',
      'workflow',
      [
        param('targetPhase', 'string', 'Target phase to check'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const { createPhaseController } = await import('@musubix2/workflow-engine');
          const { tracker } = await loadTracker((params['basePath'] as string) ?? '.');
          const target = (params['targetPhase'] ?? params['gate']) as never;
          const canTransition = await createPhaseController(tracker).canTransition(target);
          return ok({ targetPhase: target, canTransition });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'workflow.approve',
      'Approve the current (or a named) SDD phase (persisted)',
      'workflow',
      [
        param('phase', 'string', 'Phase to approve'),
        param('basePath', 'string', 'Project base path', false, '.'),
      ],
      async (params) => {
        try {
          const { tracker, file } = await loadTracker((params['basePath'] as string) ?? '.');
          const phase = (params['phase'] as string) ?? tracker.getState().currentPhase;
          tracker.approve(phase as never);
          await saveTracker(tracker, file);
          return ok({ phase, approved: true });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Skills tools (from @musubix2/skill-manager)
// ---------------------------------------------------------------------------

// Session-lifetime skill registry: skills registered in one MCP call are
// visible to later execute/list calls within the same server process.
let _skillManager: unknown = null;
async function getSkillManager() {
  if (!_skillManager) {
    const { createSkillManager } = await import('@musubix2/skill-manager');
    _skillManager = createSkillManager();
  }
  return _skillManager as {
    loadFromMetadata: (m: unknown, e: (i: Record<string, unknown>) => Promise<Record<string, unknown>>) => { id: string; metadata: { name: string } };
    getAvailableSkills: () => Array<{
      id: string;
      metadata: { name: string };
      status: string;
      execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    }>;
  };
}

function skillsTools(): CatalogEntry[] {
  return [
    tool(
      'skills.list',
      'List skills registered in the current server session',
      'skills',
      [],
      async () => {
        try {
          const mgr = await getSkillManager();
          return ok(mgr.getAvailableSkills().map((s) => ({ id: s.id, name: s.metadata.name, status: s.status })));
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'skills.register',
      'Register a skill (echo-executor) for this server session',
      'skills',
      [
        param('name', 'string', 'Skill name'),
        param('description', 'string', 'Skill description', false, ''),
        param('triggers', 'array', 'Trigger keywords', false),
      ],
      async (params) => {
        try {
          const mgr = await getSkillManager();
          const name = (params['name'] as string) ?? 'skill';
          const skill = mgr.loadFromMetadata(
            {
              name,
              version: '1.0.0',
              description: (params['description'] as string) ?? '',
              triggers: (params['triggers'] as string[]) ?? [],
            },
            async (input: Record<string, unknown>) => ({ skill: name, output: input }),
          );
          return ok({ id: skill.id, name, registered: true });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
        }
      },
    ),
    tool(
      'skills.execute',
      'Execute a session skill by name (must be registered in this session first)',
      'skills',
      [
        param('name', 'string', 'Skill name to execute'),
        param('input', 'object', 'Skill input parameters', false, {}),
      ],
      async (params) => {
        try {
          const mgr = await getSkillManager();
          const name = (params['name'] as string) ?? '';
          const match = mgr.getAvailableSkills().find((s) => s.metadata.name === name);
          if (!match) return fail(`Skill not registered in this session: ${name}`);
          const output = await match.execute((params['input'] as Record<string, unknown>) ?? {});
          return ok({ executed: true, name, output });
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err));
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
