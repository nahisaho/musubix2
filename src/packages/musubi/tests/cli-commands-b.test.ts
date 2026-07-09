import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCLIDispatcher,
  handleTrace,
  handleTraceVerify,
  handlePolicy,
  handleOntology,
  handleCodegraph,
  handleSecurity,
  handleWorkflow,
  handleStatus,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// ── Traceability ───────────────────────────────────────────────────────────

describe('CLI Commands B — Traceability', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('trace matrix returns SUCCESS', async () => {
    const code = await handleTrace('matrix', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('trace validate returns SUCCESS', async () => {
    const code = await handleTrace('validate', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('trace impact returns SUCCESS with target', async () => {
    const code = await handleTrace('impact', ['REQ-001']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('REQ-001'));
  });

  it('trace impact returns GENERAL_ERROR without target', async () => {
    const code = await handleTrace('impact', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('trace default shows help', async () => {
    const code = await handleTrace(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('trace'));
  });
});

// ── Trace:verify ───────────────────────────────────────────────────────────

describe('CLI Commands B — Trace:verify', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('trace:verify returns SUCCESS and prints coverage', async () => {
    const fx = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_tv');
    mkdirSync(join(fx, 'src'), { recursive: true });
    writeFileSync(join(fx, 'reqs.md'), '## REQ-AUT-001: Login\n');
    writeFileSync(join(fx, 'src', 'a.ts'), '// @see REQ-AUT-001\nexport const a = 1;\n');
    try {
      const code = await handleTraceVerify({ specs: join(fx, 'reqs.md'), src: join(fx, 'src') });
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Coverage'));
    } finally {
      rmSync(fx, { recursive: true, force: true });
    }
  });
});

// ── Policy ─────────────────────────────────────────────────────────────────

describe('CLI Commands B — Policy', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('policy validate returns SUCCESS', async () => {
    const code = await handlePolicy('validate', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Overall'));
  });

  it('policy list prints all 9 constitution articles', async () => {
    const code = await handlePolicy('list', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Constitution Articles'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 9'));
  });

  it('policy info shows article details', async () => {
    const code = await handlePolicy('info', ['1']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CONST-001'));
  });

  it('policy info returns GENERAL_ERROR for unknown article', async () => {
    const code = await handlePolicy('info', ['99']);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('policy info returns GENERAL_ERROR without article number', async () => {
    const code = await handlePolicy('info', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('policy default shows help', async () => {
    const code = await handlePolicy(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
  });
});

// ── Ontology ───────────────────────────────────────────────────────────────

describe('CLI Commands B — Ontology', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('ontology validate returns SUCCESS (empty store reports no data)', async () => {
    const code = await handleOntology('validate');
    expect(code).toBe(ExitCode.SUCCESS);
    // With no persisted triples the command is honest instead of asserting
    // consistency of nothing.
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No triples stored'));
  });

  it('ontology stats returns SUCCESS', async () => {
    const code = await handleOntology('stats');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Triples'));
  });

  it('ontology default shows help', async () => {
    const code = await handleOntology(undefined);
    expect(code).toBe(ExitCode.SUCCESS);
  });
});

// ── Codegraph ──────────────────────────────────────────────────────────────

describe('CLI Commands B — Codegraph', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('cg stats returns SUCCESS', async () => {
    const code = await handleCodegraph('stats', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nodes'));
  });

  it('cg languages returns SUCCESS', async () => {
    const code = await handleCodegraph('languages', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Supported languages'));
  });

  it('cg index returns GENERAL_ERROR without path', async () => {
    const code = await handleCodegraph('index', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('cg search returns GENERAL_ERROR without query', async () => {
    const code = await handleCodegraph('search', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('cg search returns SUCCESS with query', async () => {
    const code = await handleCodegraph('search', ['test']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Results for "test"'));
  });

  it('cg default shows help', async () => {
    const code = await handleCodegraph(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('cg index succeeds with a valid TypeScript file', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'sample.ts');
    writeFileSync(file, 'export function hello() { return "hi"; }\n');
    const prevCwd = process.cwd();
    process.chdir(dir); // index persists .musubix/ under cwd
    try {
      const code = await handleCodegraph('index', [file]);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Indexed'));
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.13: the indexed graph must persist so `stats` / `search` (separate
  // invocations) can operate on it.
  it('cg index persists the graph for later stats and search', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_persist');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'a.ts'), 'export function loginUser() {}\nexport class AuthToken {}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['a.ts'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('stats', [])).toBe(ExitCode.SUCCESS);
      const statsOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(statsOut).toMatch(/Nodes: [1-9]/); // not zero — graph was loaded

      logSpy.mockClear();
      expect(await handleCodegraph('search', ['login'])).toBe(ExitCode.SUCCESS);
      const searchOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(searchOut).toContain('loginUser');
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.15: cg index records import edges; cg deps lists file → module deps.
  it('cg deps lists dependency edges from imports', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_deps');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'svc.ts'), "import { Token } from './auth';\nexport class Svc {}\n");
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['svc.ts'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('deps', [])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('./auth'); // the imported module
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.16: cg impact = reverse transitive reachability over import edges.
  it('cg impact finds files that transitively depend on a target', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_impact');
    mkdirSync(dir, { recursive: true });
    // base defines UniqueWidget; mid imports it; top imports mid.
    writeFileSync(join(dir, 'base.ts'), 'export class UniqueWidgetXyz {}\n');
    writeFileSync(join(dir, 'mid.ts'), "import { UniqueWidgetXyz } from './base';\nexport class MidThing {}\n");
    writeFileSync(join(dir, 'top.ts'), "import { MidThing } from './mid';\nexport class TopThing {}\n");
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['base.ts'])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('mid.ts'); // directly depends on base
      expect(out).toContain('top.ts'); // transitively depends via mid
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg impact requires a target argument', async () => {
    expect(await handleCodegraph('impact', [])).toBe(ExitCode.VALIDATION_ERROR);
  });
});

// ── Security ───────────────────────────────────────────────────────────────

describe('CLI Commands B — Security', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('security returns GENERAL_ERROR for missing file', async () => {
    const code = await handleSecurity('/nonexistent/file.ts');
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('security scans a valid file', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_sec');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'sample.ts');
    writeFileSync(file, 'const x = 1;\n');
    try {
      const code = await handleSecurity(file);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Security scan'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total findings'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── Workflow ───────────────────────────────────────────────────────────────

describe('CLI Commands B — Workflow', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let wfDir: string;
  let prevCwd: string;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Isolate cwd — approve/transition persist to .musubix/ in the cwd.
    wfDir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_wf');
    mkdirSync(wfDir, { recursive: true });
    prevCwd = process.cwd();
    process.chdir(wfDir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(wfDir, { recursive: true, force: true });
  });

  it('workflow status returns SUCCESS', async () => {
    const code = await handleWorkflow('status', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Current phase'));
  });

  it('workflow approve returns SUCCESS', async () => {
    const code = await handleWorkflow('approve', ['requirements']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Approved'));
  });

  it('workflow approve returns GENERAL_ERROR without phase', async () => {
    const code = await handleWorkflow('approve', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('workflow transition returns SUCCESS or PHASE_BLOCKED', async () => {
    const code = await handleWorkflow('transition', ['design']);
    expect([ExitCode.SUCCESS, ExitCode.PHASE_BLOCKED]).toContain(code);
  });

  it('workflow transition returns GENERAL_ERROR without phase', async () => {
    const code = await handleWorkflow('transition', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('workflow default shows help', async () => {
    const code = await handleWorkflow(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  // ISSUE-14: approval must persist to a later, separate status call.
  it('persists approvals across separate handler calls', async () => {
    await handleWorkflow('approve', ['requirements']);
    logSpy.mockClear();
    const code = await handleWorkflow('status', []);
    expect(code).toBe(ExitCode.SUCCESS);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('✅ requirements');
  });
});

// ── Status ─────────────────────────────────────────────────────────────────

describe('CLI Commands B — Status', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('status returns SUCCESS with dashboard', async () => {
    const code = await handleStatus();
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project Status'));
  });
});

// ── Dispatch integration ───────────────────────────────────────────────────

describe('CLI Commands B — Dispatch integration', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('dispatches trace validate', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('trace', { subcommand: 'validate' });
    expect(logSpy).toHaveBeenCalled();
  });

  it('dispatches policy list', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('policy', { subcommand: 'list' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article'));
  });

  it('dispatches ontology stats', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('ontology', { subcommand: 'stats' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Triples'));
  });

  it('dispatches cg languages', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('cg', { subcommand: 'languages' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Supported languages'));
  });

  it('dispatches workflow status', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('workflow', { subcommand: 'status' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Current phase'));
  });

  it('dispatches status command', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('status', {});
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project Status'));
  });
});

// ── v0.5.2 fixes: directory support, security gating, trace honesty ─────────

describe('v0.5.2 CLI fixes', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_v052');

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mkdirSync(join(dir, 'nested'), { recursive: true });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  // ISSUE-6
  it('cg index accepts a directory (recursively) instead of crashing', async () => {
    writeFileSync(join(dir, 'a.ts'), 'export function a() { return 1; }\n');
    writeFileSync(join(dir, 'nested', 'b.js'), 'export function b() { return 2; }\n');
    const prevCwd = process.cwd();
    process.chdir(dir); // index persists .musubix/ under cwd
    try {
      const code = await handleCodegraph('index', [join(dir, 'a.ts')]);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('file(s)'));
    } finally {
      process.chdir(prevCwd);
    }
  });

  // ISSUE-7
  it('security scans a directory', async () => {
    writeFileSync(join(dir, 'ok.ts'), 'export const n = 1;\n');
    const code = await handleSecurity(dir);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  // ISSUE-8
  it('security --fail-on returns non-zero when a matching finding exists', async () => {
    writeFileSync(join(dir, 'leak.js'), 'export const KEY = "AKIAIOSFODNN7EXAMPLE";\n');
    const failed = await handleSecurity(dir, 'high');
    expect(failed).toBe(ExitCode.VALIDATION_ERROR);
  });

  // v0.5.14: --exclude-tests skips test files so their fixtures don't add noise.
  it('security --exclude-tests skips a leak that lives in a test file', async () => {
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests', 'leak_test.js'), 'const KEY = "AKIAIOSFODNN7EXAMPLE";\n');
    // Without exclusion the test-file secret trips the gate...
    expect(await handleSecurity(dir, 'critical')).toBe(ExitCode.VALIDATION_ERROR);
    // ...with --exclude-tests it is skipped, so the gate passes.
    expect(await handleSecurity(dir, 'critical', true)).toBe(ExitCode.SUCCESS);
  });

  it('security --fail-on passes when no finding meets the threshold', async () => {
    writeFileSync(join(dir, 'clean.js'), 'export const n = 2;\n');
    const ok = await handleSecurity(dir, 'critical');
    expect(ok).toBe(ExitCode.SUCCESS);
  });

  it('security rejects an invalid --fail-on severity', async () => {
    writeFileSync(join(dir, 'x.js'), 'export const n = 3;\n');
    const code = await handleSecurity(dir, 'bogus');
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
  });

  // ISSUE-9 — point at a nonexistent specs file so the dataset is empty.
  it('trace:verify does not claim 100% on empty data', async () => {
    const code = await handleTraceVerify({ specs: 'no/such/requirements.md', src: 'no/such/src' });
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nothing to verify'));
    const claimed100 = logSpy.mock.calls.some((c) =>
      typeof c[0] === 'string' && c[0].includes('Coverage: 100%'),
    );
    expect(claimed100).toBe(false);
  });
});

// ── v0.5.6: real-data trace + ontology persistence ─────────────────────────

describe('v0.5.6 trace real data', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  const base = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_trace');
  const specs = join(base, 'requirements.md');
  const src = join(base, 'src');

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mkdirSync(src, { recursive: true });
    writeFileSync(
      specs,
      ['## REQ-AUT-001: Login', '## REQ-TSK-001: Task', '## REQ-RLT-001: Realtime'].join('\n'),
    );
    writeFileSync(join(src, 'auth.ts'), '// @see REQ-AUT-001\nexport const a = 1;\n');
    writeFileSync(join(src, 'task.ts'), '// REQ-TSK-001\nexport const t = 1;\n');
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(base, { recursive: true, force: true });
  });

  it('trace:verify computes real coverage and lists gaps', async () => {
    const code = await handleTraceVerify({ specs, src });
    expect(code).toBe(ExitCode.SUCCESS);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('Coverage: 67%');
    expect(printed).toContain('REQ-RLT-001'); // the uncovered one
  });

  it('trace:verify --strict fails when a requirement is uncovered', async () => {
    const code = await handleTraceVerify({ specs, src, strict: true });
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
  });

  it('trace matrix reports coverage from real references', async () => {
    const code = await handleTrace('matrix', [], { specs, src });
    expect(code).toBe(ExitCode.SUCCESS);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('referenced in code: 2');
  });
});

describe('v0.5.6 ontology persistence', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let dir: string;
  let prevCwd: string;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_onto');
    mkdirSync(dir, { recursive: true });
    prevCwd = process.cwd();
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  it('add persists triples across separate handler calls', async () => {
    expect(await handleOntology('add', ['Dog', 'rdfs:subClassOf', 'Animal'])).toBe(ExitCode.SUCCESS);
    expect(await handleOntology('add', ['Cat', 'rdfs:subClassOf', 'Animal'])).toBe(ExitCode.SUCCESS);
    logSpy.mockClear();
    await handleOntology('stats', []);
    expect(logSpy).toHaveBeenCalledWith('Triples: 2');
  });

  it('add rejects a missing operand', async () => {
    expect(await handleOntology('add', ['Dog'])).toBe(ExitCode.VALIDATION_ERROR);
  });

  it('list shows stored triples', async () => {
    await handleOntology('add', ['A', 'rel', 'B']);
    logSpy.mockClear();
    await handleOntology('list', []);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('A —[rel]→ B');
  });
});
