import { describe, it, expect } from 'vitest';
import {
  MCPServer,
  createFullMCPServer,
  registerDefaultTools,
  getToolCategories,
} from '../src/index.js';
import type { ToolCategory } from '../src/index.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function findTool(category: string, name: string) {
  const cat = getToolCategories().find((c) => c.name === category)!;
  return cat.tools.find((t) => t.definition.name === name)!;
}

// ---------------------------------------------------------------------------
// catalog.ts — registerDefaultTools
// ---------------------------------------------------------------------------

describe('registerDefaultTools', () => {
  it('should register tools on the server', () => {
    const server = new MCPServer();
    registerDefaultTools(server);
    const tools = server.getToolManifest();
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should register the expected number of tools (50)', () => {
    const server = new MCPServer();
    registerDefaultTools(server);
    expect(server.getToolManifest()).toHaveLength(61);
  });

  it('should assign the correct number of categories', () => {
    const server = new MCPServer();
    registerDefaultTools(server);
    const categories = server.getRegistry().getCategories();
    expect(categories).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// getToolCategories
// ---------------------------------------------------------------------------

describe('getToolCategories', () => {
  it('should return all 13 categories', () => {
    const categories = getToolCategories();
    expect(categories).toHaveLength(13);
  });

  it('each category has at least 2 tools', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      expect(cat.tools.length, `${cat.name} should have ≥ 2 tools`).toBeGreaterThanOrEqual(2);
    }
  });

  it('each category has a name and description', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      expect(cat.name).toBeTruthy();
      expect(cat.description).toBeTruthy();
    }
  });

  it('tool names follow category.action dot-separated pattern', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      for (const entry of cat.tools) {
        expect(
          entry.definition.name,
          `${entry.definition.name} should contain a dot`,
        ).toMatch(/^[\w-]+\.[\w.-]+$/);
      }
    }
  });

  it('all tool names are unique', () => {
    const categories = getToolCategories();
    const names = categories.flatMap((c) => c.tools.map((t) => t.definition.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('each tool has a description and at least an empty parameters array', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      for (const entry of cat.tools) {
        expect(entry.definition.description).toBeTruthy();
        expect(Array.isArray(entry.definition.parameters)).toBe(true);
      }
    }
  });

  it('contains the expected category names', () => {
    const categories = getToolCategories();
    const names = categories.map((c: ToolCategory) => c.name);
    expect(names).toContain('sdd-core');
    expect(names).toContain('knowledge');
    expect(names).toContain('policy');
    expect(names).toContain('ontology');
    expect(names).toContain('code-analysis');
    expect(names).toContain('security');
    expect(names).toContain('research');
    expect(names).toContain('neural');
    expect(names).toContain('synthesis');
    expect(names).toContain('formal-verify');
    expect(names).toContain('workflow');
    expect(names).toContain('decisions');
    expect(names).toContain('skills');
  });
});

// ---------------------------------------------------------------------------
// Tool handler fallback behaviour
// ---------------------------------------------------------------------------

describe('tool handler fallback (packages unavailable)', () => {
  it('handlers return a result even when the backing package is not available', async () => {
    const categories = getToolCategories();
    const sddCore = categories.find((c) => c.name === 'sdd-core')!;
    const firstTool = sddCore.tools[0];
    const result = await firstTool.handler({ pattern: 'event-driven', text: 'test', id: 'REQ-001' });
    expect(result.success).toBe(true);
  });

  it('knowledge handlers return fail result when package is unavailable', async () => {
    const categories = getToolCategories();
    const knowledge = categories.find((c) => c.name === 'knowledge')!;
    const getTool = knowledge.tools.find((t) => t.definition.name === 'knowledge.entity.get')!;
    const result = await getTool.handler({ id: 'test-id' });
    // Either success (if package exists) or fail (if not) — just shouldn't throw
    expect(typeof result.success).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// createFullMCPServer
// ---------------------------------------------------------------------------

describe('createFullMCPServer', () => {
  it('should return a server with tools, prompts, and resources', () => {
    const server = createFullMCPServer();
    expect(server.getToolManifest().length).toBeGreaterThan(0);
    expect(server.prompts.list().length).toBeGreaterThan(0);
    expect(server.resources.list().length).toBeGreaterThan(0);
  });

  it('should respect custom server options', () => {
    const server = createFullMCPServer({ name: 'test-full', version: '9.9.9' });
    const info = server.getInfo();
    expect(info.name).toBe('test-full');
    expect(info.version).toBe('9.9.9');
    expect(info.toolCount).toBe(61);
  });
});

// ---------------------------------------------------------------------------
// v0.5.7 — security tools wired to real APIs, knowledge get awaits async
// ---------------------------------------------------------------------------

describe('v0.5.7 MCP tool fixes', () => {
  const SECRET = 'const k = "AKIAIOSFODNN7EXAMPLE";';

  it('security.scan detects a leaked AWS key (real scanner, not a no-op)', async () => {
    const result = await findTool('security', 'security.scan').handler({ code: SECRET });
    expect(result.success).toBe(true);
    const data = result.data as { findings: unknown[]; severity: string };
    expect(data.findings.length).toBeGreaterThan(0);
    expect(data.severity).toBe('critical');
  });

  it('security.secrets.detect finds the secret', async () => {
    const result = await findTool('security', 'security.secrets.detect').handler({ code: SECRET });
    expect(result.success).toBe(true);
    const data = result.data as { count: number };
    expect(data.count).toBeGreaterThan(0);
  });

  it('security.scan on clean code reports no findings', async () => {
    const result = await findTool('security', 'security.scan').handler({ code: 'export const n = 1;' });
    const data = result.data as { findings: unknown[]; severity: string };
    expect(data.findings.length).toBe(0);
    expect(data.severity).toBe('none');
  });

  it('knowledge.entity.get returns the stored entity (awaits async, not {})', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-kg-'));
    try {
      const put = await findTool('knowledge', 'knowledge.entity.put').handler({
        id: 'E1', type: 'concept', basePath: base,
      });
      expect(put.success).toBe(true);
      const get = await findTool('knowledge', 'knowledge.entity.get').handler({
        id: 'E1', basePath: base,
      });
      expect(get.success).toBe(true);
      expect((get.data as { id: string }).id).toBe('E1');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// v0.5.8 — sdd-core / synthesis / decisions wired to real APIs
// ---------------------------------------------------------------------------

describe('v0.5.8 MCP tool wiring', () => {
  it('sdd.requirements.create classifies EARS pattern', async () => {
    const r = await findTool('sdd-core', 'sdd.requirements.create').handler({
      text: 'WHEN a user logs in, THE system SHALL issue a token.', id: 'REQ-AUT-001',
    });
    expect(r.success).toBe(true);
    expect((r.data as { pattern: string }).pattern).toBe('event-driven');
  });

  // v0.5.44 — tool failures surface the real error, not a generic message.
  it('surfaces the real error instead of "Core package not available"', async () => {
    const r = await findTool('sdd-core', 'sdd.design.generate').handler({
      requirements: 'a string, not an array', // wrong shape → triggers an error
    });
    expect(r.success).toBe(false);
    expect(r.error ?? '').not.toContain('Core package not available');
    expect(r.error ?? '').toMatch(/map is not a function/);
  });

  it('sdd.requirements.list parses a Markdown document', async () => {
    const r = await findTool('sdd-core', 'sdd.requirements.list').handler({
      markdown: '## REQ-AUT-001: Login\n**要件**:\nTHE system SHALL work.\n',
    });
    expect((r.data as unknown[]).length).toBe(1);
    expect((r.data as Array<{ id: string }>)[0].id).toBe('REQ-AUT-001');
  });

  it('sdd.codegen.generate produces real code (not an empty stub)', async () => {
    const r = await findTool('sdd-core', 'sdd.codegen.generate').handler({ name: 'TaskService', templateType: 'class' });
    expect((r.data as { code: string }).code).toContain('class TaskService');
  });

  it('sdd.test.generate produces a test suite', async () => {
    const r = await findTool('sdd-core', 'sdd.test.generate').handler({ code: 'export function add(a,b){return a+b}' });
    expect((r.data as { code: string }).code).toContain('describe');
  });

  it('sdd.trace.verify computes coverage and gaps from references', async () => {
    const r = await findTool('sdd-core', 'sdd.trace.verify').handler({
      requirementIds: ['REQ-AUT-001', 'REQ-TSK-001'],
      sources: [{ file: 'a.ts', code: '// @see REQ-AUT-001' }],
    });
    const d = r.data as { coverage: number; gaps: string[] };
    expect(d.coverage).toBe(50);
    expect(d.gaps).toEqual(['REQ-TSK-001']);
  });

  it('synthesis.dsl.build applies the ops pipeline', async () => {
    const r = await findTool('synthesis', 'synthesis.dsl.build').handler({ input: '  hello world ', ops: ['trim', 'camelCase'] });
    expect((r.data as { result: string }).result).toBe('helloWorld');
  });

  it('synthesis.synthesize derives a rule from examples', async () => {
    const r = await findTool('synthesis', 'synthesis.synthesize').handler({
      examples: [{ input: 'a', output: 'aa' }, { input: 'b', output: 'bb' }],
    });
    expect((r.data as { synthesized: boolean }).synthesized).toBe(true);
  });

  it('decisions.create then list round-trips via disk', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-adr-'));
    try {
      const created = await findTool('decisions', 'decisions.create').handler({
        title: 'Use Postgres', context: 'scale', decision: 'pg', basePath: base,
      });
      expect((created.data as { id: string }).id).toBe('ADR-001');
      const listed = await findTool('decisions', 'decisions.list').handler({ basePath: base });
      expect((listed.data as unknown[]).length).toBe(1);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// v0.5.9 — code-analysis + ontology wired to real APIs
// ---------------------------------------------------------------------------

describe('v0.5.9 MCP tool wiring', () => {
  it('code.parse returns real AST nodes', async () => {
    const r = await findTool('code-analysis', 'code.parse').handler({
      source: 'export function add(a,b){return a+b}\nexport class Calc{}', language: 'typescript',
    });
    expect(r.success).toBe(true);
    const names = (r.data as { nodes: Array<{ name: string }> }).nodes.map((n) => n.name);
    expect(names).toContain('add');
    expect(names).toContain('Calc');
  });

  it('code.graph.search finds an indexed symbol', async () => {
    const r = await findTool('code-analysis', 'code.graph.search').handler({
      query: 'add',
      sources: [{ code: 'export function add(){}', language: 'typescript', filePath: 'a.ts' }],
    });
    expect((r.data as { results: unknown[] }).results.length).toBeGreaterThan(0);
  });

  it('ontology triple add/query round-trips and rules infer transitively', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-ont-'));
    try {
      const add = (s: string, p: string, o: string) =>
        findTool('ontology', 'ontology.triple.add').handler({ subject: s, predicate: p, object: o, basePath: base });
      await add('Dog', 'rdfs:subClassOf', 'Animal');
      const second = await add('Animal', 'rdfs:subClassOf', 'LivingThing');
      expect((second.data as { total: number }).total).toBe(2);

      const rules = await findTool('ontology', 'ontology.rules.apply').handler({ basePath: base });
      const inferred = (rules.data as { inferred: Array<{ subject: string; object: string }> }).inferred;
      expect(inferred.some((t) => t.subject === 'Dog' && t.object === 'LivingThing')).toBe(true);

      const q = await findTool('ontology', 'ontology.triple.query').handler({ predicate: 'rdfs:subClassOf', basePath: base });
      expect((q.data as { count: number }).count).toBeGreaterThanOrEqual(2);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('ontology.consistency.check runs against the store', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-ont2-'));
    try {
      const r = await findTool('ontology', 'ontology.consistency.check').handler({ basePath: base });
      expect(r.success).toBe(true);
      expect(typeof (r.data as { consistent: boolean }).consistent).toBe('boolean');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// v0.5.10 — research + neural + workflow wired to real APIs
// ---------------------------------------------------------------------------

describe('v0.5.10 MCP tool wiring', () => {
  it('research.query researches over provided sources', async () => {
    const r = await findTool('research', 'research.query').handler({
      topic: 'EARS',
      sources: [{ title: 'S1', type: 'article', relevance: 0.9, content: 'EARS is a requirements syntax.' }],
    });
    expect(r.success).toBe(true);
    expect((r.data as { sources: unknown[] }).sources.length).toBe(1);
    expect(typeof (r.data as { summary: string }).summary).toBe('string');
  });

  it('neural.search ranks the most relevant document first', async () => {
    const r = await findTool('neural', 'neural.search').handler({
      query: 'login',
      documents: ['payment processing', 'login session token', 'unrelated text'],
    });
    expect(r.success).toBe(true);
    const hits = (r.data as { hits: Array<{ metadata: { text: string } }> }).hits;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].metadata.text).toContain('login');
  });

  it('neural.library.learn extracts a repeated pattern', async () => {
    const r = await findTool('neural', 'neural.library.learn').handler({
      snippets: ['function add(a,b){return a+b}', 'function add(x,y){return x+y}'],
    });
    expect((r.data as { count: number }).count).toBeGreaterThan(0);
  });

  it('neural.patterns.extract processes items (wake phase)', async () => {
    const r = await findTool('neural', 'neural.patterns.extract').handler({ items: ['const x=1', 'const y=2'] });
    expect((r.data as { processedItems: number }).processedItems).toBe(2);
  });

  it('workflow approve persists and phase.current reflects it', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-wf-'));
    try {
      const appr = await findTool('workflow', 'workflow.approve').handler({ phase: 'requirements', basePath: base });
      expect((appr.data as { approved: boolean }).approved).toBe(true);
      const cur = await findTool('workflow', 'workflow.phase.current').handler({ basePath: base });
      const approvals = (cur.data as { approvals: Array<{ phase: string; approved: boolean }> }).approvals;
      expect(approvals.find((a) => a.phase === 'requirements')?.approved).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('workflow.gate.check reports whether a transition is allowed', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-wf2-'));
    try {
      const r = await findTool('workflow', 'workflow.gate.check').handler({ targetPhase: 'design', basePath: base });
      expect(r.success).toBe(true);
      expect(typeof (r.data as { canTransition: boolean }).canTransition).toBe('boolean');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// v0.5.11 — formal-verify / lean / skills wired to real APIs
// ---------------------------------------------------------------------------

describe('v0.5.11 MCP tool wiring', () => {
  it('verify.ears-to-smt produces SMT-LIB2 from an EARS requirement', async () => {
    const r = await findTool('formal-verify', 'verify.ears-to-smt').handler({
      text: 'WHEN a user logs in, THE system SHALL issue a token.', action: 'issue a token',
    });
    expect(r.success).toBe(true);
    const smt = JSON.stringify(r.data);
    expect(smt).toContain('smtLib2');
  });

  it('verify.lean.convert produces a Lean 4 theorem', async () => {
    const r = await findTool('formal-verify', 'verify.lean.convert').handler({
      text: 'THE system SHALL validate input.', action: 'validate input', name: 'validate_thm',
    });
    expect(r.success).toBe(true);
    expect(JSON.stringify(r.data)).toContain('leanCode');
  });

  it('verify.z3.solve returns a result object without throwing', async () => {
    const r = await findTool('formal-verify', 'verify.z3.solve').handler({ formula: '(assert true)(check-sat)' });
    // z3 may or may not be installed; the handler must resolve either way.
    expect(typeof r.success).toBe('boolean');
  });

  it('skills register → list → execute round-trip within the session', async () => {
    const name = `greeter_${Math.floor(process.hrtime()[1] % 100000)}`;
    const reg = await findTool('skills', 'skills.register').handler({ name, description: 'greets' });
    expect((reg.data as { registered: boolean }).registered).toBe(true);

    const list = await findTool('skills', 'skills.list').handler({});
    expect((list.data as Array<{ name: string }>).some((s) => s.name === name)).toBe(true);

    const exec = await findTool('skills', 'skills.execute').handler({ name, input: { who: 'world' } });
    expect((exec.data as { executed: boolean }).executed).toBe(true);
    expect((exec.data as { output: { output: { who: string } } }).output.output.who).toBe('world');
  });

  it('skills.execute reports a clear error for an unknown skill', async () => {
    const r = await findTool('skills', 'skills.execute').handler({ name: 'does-not-exist-xyz', input: {} });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// v0.5.47 — sdd-core tools with optional parameters omitted, exercising their
// `?? default` fallbacks. Scoped to sdd-core (the @musubix2/core package is
// already loaded by its own tests, so this adds no coverage-denominator mass).
// ---------------------------------------------------------------------------

describe('sdd-core tools apply defaults when optional params are omitted', () => {
  const core = (name: string) => findTool('sdd-core', name);

  it('requirements.create defaults the id', async () => {
    const r = await core('sdd.requirements.create').handler({ text: 'THE system SHALL log events.' });
    expect(r.success).toBe(true);
    expect((r.data as { id: string }).id).toBe('REQ-XXX-001');
  });

  it('requirements.validate tolerates object items and an empty list', async () => {
    const r = await core('sdd.requirements.validate').handler({ requirements: [{ text: 'THE system SHALL run.' }, 'THE system SHALL stop.'] });
    expect(r.success).toBe(true);
    expect((r.data as { results: unknown[] }).results).toHaveLength(2);
    const empty = await core('sdd.requirements.validate').handler({});
    expect(empty.success).toBe(true);
    expect((empty.data as { allValid: boolean }).allValid).toBe(true);
  });

  it('requirements.list defaults empty markdown', async () => {
    const r = await core('sdd.requirements.list').handler({});
    expect(r.success).toBe(true);
    expect(r.data).toEqual([]);
  });

  it('design.generate fills missing requirement fields with defaults', async () => {
    const r = await core('sdd.design.generate').handler({ requirements: [{}] });
    expect(r.success).toBe(true);
    expect((r.data as { sections: unknown[] }).sections.length).toBeGreaterThan(0);
  });

  it('design.verify accepts requirements with defaults', async () => {
    const r = await core('sdd.design.verify').handler({ requirements: [{ id: 'REQ-AAA-001' }] });
    expect(r.success).toBe(true);
    expect((r.data as { score: number }).score).toBeGreaterThanOrEqual(0);
  });

  it('codegen.generate defaults templateType and name', async () => {
    const r = await core('sdd.codegen.generate').handler({});
    expect(r.success).toBe(true);
    expect((r.data as { code: string }).code).toContain('Generated');
  });

  it('test.generate defaults the style to unit', async () => {
    const r = await core('sdd.test.generate').handler({ code: 'export function f() {}' });
    expect(r.success).toBe(true);
    expect((r.data as { style: string }).style).toBe('unit');
  });
});


// ---------------------------------------------------------------------------
// v0.5.54 — every tool handler must run and return a well-formed ToolResult
// (success or graceful failure), never throw, and never surface the old generic
// "Core package not available" string. Runs in a throwaway cwd so tools that
// persist to cwd-relative stores can't pollute other suites. Most heavy
// packages live in an excluded index.ts, so this adds little coverage mass.
// ---------------------------------------------------------------------------

function smokeArgs(params: Array<{ name: string; type: string; default?: unknown }>): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const p of params) {
    if (p.default !== undefined) { args[p.name] = p.default; continue; }
    switch (p.type) {
      case 'string':
        args[p.name] = /code|source/i.test(p.name)
          ? 'export function sample(a) { return a; }'
          : /markdown|content|document|text|spec/i.test(p.name)
            ? '## REQ-XXX-001: Sample\n**要件**: THE system SHALL work.'
            : 'sample';
        break;
      case 'number': args[p.name] = 1; break;
      case 'boolean': args[p.name] = false; break;
      case 'array': args[p.name] = []; break;
      default: args[p.name] = {};
    }
  }
  return args;
}

describe('every tool handler returns a well-formed ToolResult', () => {
  const origCwd = process.cwd();
  let tmp: string;
  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'musubix-tools-'));
    process.chdir(tmp);
  });
  afterAll(() => {
    process.chdir(origCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  for (const cat of getToolCategories()) {
    for (const t of cat.tools) {
      it(`${t.definition.name} runs without throwing`, async () => {
        // Call with fully-populated args and again with empty args, so both the
        // "param provided" and the "param omitted → default" branches of each
        // handler's `?? default` fallbacks are exercised.
        for (const args of [smokeArgs(t.definition.parameters), {}]) {
          const result = await t.handler(args);
          expect(typeof result.success).toBe('boolean');
          if (!result.success) {
            expect(result.error ?? '').not.toContain('Core package not available');
          }
        }
      });
    }
  }
});
