import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCLIDispatcher,
  handleTrace,
  handleTraceVerify,
  handlePolicy,
  handleOntology,
  handleCodegraph,
  cgSubcommandHelp,
  handleSecurity,
  handleWorkflow,
  handleStatus,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
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

  // v0.5.40 — dogfooding: validate actually checks coverage from specs/src.
  it('trace validate reports uncovered requirements and --strict fails', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_trace');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'reqs.md'),
      '## REQ-AUT-001: Auth\n**要件**: shall authenticate.\n## REQ-PAY-001: Pay\n**要件**: shall pay.\n',
    );
    writeFileSync(join(dir, 'src', 'auth.ts'), '// Implements REQ-AUT-001\nexport const a = 1;\n');
    const specs = join(dir, 'reqs.md');
    const src = join(dir, 'src');
    try {
      logSpy.mockClear();
      // Non-strict: reports the gap but still SUCCESS.
      expect(await handleTrace('validate', [], { specs, src })).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('REQ-PAY-001'); // uncovered
      // Strict: fails.
      expect(await handleTrace('validate', [], { specs, src, strict: true })).toBe(ExitCode.GENERAL_ERROR);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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

  // v0.5.44 — impact uses real trace links from specs/src.
  it('trace impact lists the source files that reference a requirement', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_impact');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'reqs.md'), '## REQ-AUT-001: Auth\n**要件**: shall authenticate.\n');
    writeFileSync(join(dir, 'src', 'a.ts'), '// Implements REQ-AUT-001\nexport const a = 1;\n');
    writeFileSync(join(dir, 'src', 'b.ts'), '// REQ-AUT-001\nexport const b = 2;\n');
    try {
      logSpy.mockClear();
      const code = await handleTrace('impact', ['REQ-AUT-001'], {
        specs: join(dir, 'reqs.md'),
        src: join(dir, 'src'),
      });
      expect(code).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('Affected: 2');
      expect(out).toContain('a.ts');
      expect(out).toContain('b.ts');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.50 — impact is symbol-level: requirements sharing a *file* but not a
  // class must not be reported as coupled; those sharing a class must be.
  it('trace impact couples requirements by class, not by file', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_impact_sym');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'reqs.md'),
      '## REQ-PAY-001: Charge\n**要件**: shall charge.\n## REQ-PAY-002: Refund\n**要件**: shall refund.\n## REQ-LOG-001: Audit\n**要件**: shall log.\n',
    );
    // PAY-001 & PAY-002 share PaymentService; LOG-001 is a separate class in the
    // same file.
    writeFileSync(
      join(dir, 'src', 'pay.ts'),
      [
        '// Implements: REQ-PAY-001, REQ-PAY-002',
        'export class PaymentService { charge() {} refund() {} }',
        '// Implements: REQ-LOG-001',
        'export class AuditLogger { log() {} }',
      ].join('\n'),
    );
    try {
      logSpy.mockClear();
      expect(await handleTrace('impact', ['REQ-PAY-001'], { specs: join(dir, 'reqs.md'), src: join(dir, 'src') }))
        .toBe(ExitCode.SUCCESS);
      let out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('PaymentService');
      expect(out).toContain('REQ-PAY-002'); // coupled — shares the class
      expect(out).not.toContain('REQ-LOG-001'); // different class, not coupled

      logSpy.mockClear();
      expect(await handleTrace('impact', ['REQ-LOG-001'], { specs: join(dir, 'reqs.md'), src: join(dir, 'src') }))
        .toBe(ExitCode.SUCCESS);
      out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('AuditLogger');
      expect(out).not.toContain('REQ-PAY-001'); // isolated despite same file
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
      expect(out).toContain('direct dependent'); // v0.5.19: direct/indirect split
      expect(out).toContain('indirect (transitive)');

      // v0.5.19: --direct limits output to depth-1 dependents.
      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['base.ts', '--direct'])).toBe(ExitCode.SUCCESS);
      const dOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(dOut).toContain('mid.ts'); // direct dependent shown
      expect(dOut).toContain('omitted'); // indirect suppressed with a note
      expect(dOut).not.toContain('← ' + join(dir, 'top.ts')); // top (indirect) not listed
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg impact requires a target argument', async () => {
    expect(await handleCodegraph('impact', [])).toBe(ExitCode.VALIDATION_ERROR);
  });

  // v0.5.22: --depth bounds the transitive BFS.
  it('cg impact --depth N bounds transitive reach', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_depth');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'base.ts'), 'export class UniqueBaseZzz {}\n');
    writeFileSync(join(dir, 'mid.ts'), "import { UniqueBaseZzz } from './base';\nexport class MidZzz {}\n");
    writeFileSync(join(dir, 'top.ts'), "import { MidZzz } from './mid';\nexport class TopZzz {}\n");
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['base.ts', '--depth', '1'])).toBe(ExitCode.SUCCESS);
      const d1 = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(d1).toContain('mid.ts'); // depth-1 dependent
      expect(d1).not.toContain('← ' + join(dir, 'top.ts')); // beyond depth 1

      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['base.ts', '--depth', '2'])).toBe(ExitCode.SUCCESS);
      const d2 = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(d2).toContain('mid.ts');
      expect(d2).toContain('top.ts'); // now within depth 2
      expect(d2).toContain('within depth 2');
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.22: candidates works across languages (not just C).
  it('cg candidates ranks TypeScript files too', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_ts_cand');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'core.ts'),
      'export function coreParse(s: string): number { return s.length; }\n' +
        'export function coreCheck(s: string): boolean { return coreParse(s) > 0; }\n',
    );
    writeFileSync(join(dir, 'app.ts'), "import { coreParse } from './core';\nexport function run() { return coreParse('x'); }\n");
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('candidates', [])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('core.ts'); // TS file ranked as a candidate
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.22: per-subcommand help.
  it('cgSubcommandHelp returns subcommand-specific text', () => {
    expect(cgSubcommandHelp('impact')).toContain('--depth');
    expect(cgSubcommandHelp('candidates')).toContain('rewrite');
    expect(cgSubcommandHelp('index')).toContain('code graph');
    // Unknown/absent subcommand → general help listing subcommands.
    expect(cgSubcommandHelp(undefined)).toContain('Subcommands:');
  });

  // v0.5.18: cross-file call-graph edges — impact/deps see calls, not just #include.
  it('cg deps/impact follow C call-graph edges across files', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_calls');
    mkdirSync(dir, { recursive: true });
    // lib.c defines helper_fn (uniquely); app.c calls it WITHOUT #including lib.c.
    writeFileSync(join(dir, 'lib.c'), 'int helper_fn(int x)\n{\n\treturn x + 1;\n}\n');
    writeFileSync(
      join(dir, 'app.c'),
      'int run(void)\n{\n\treturn helper_fn(41);\n}\n',
    );
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('deps', ['app.c'])).toBe(ExitCode.SUCCESS);
      const depsOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(depsOut).toContain('helper_fn'); // call edge recorded, no #include present

      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['lib.c'])).toBe(ExitCode.SUCCESS);
      const impactOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(impactOut).toContain('app.c'); // caller is impacted by lib.c
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.21: static-aware call resolution — local `static` binds in-file.
  it('cg impact binds static homonyms locally and globals cross-file', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_static');
    mkdirSync(dir, { recursive: true });
    // global.c defines the global shared_api.
    writeFileSync(join(dir, 'global.c'), 'int shared_api(int x)\n{\n\treturn x;\n}\n');
    // other.c defines its OWN static shared_api and calls it — local binding.
    writeFileSync(
      join(dir, 'other.c'),
      'static int shared_api(int x)\n{\n\treturn x * 2;\n}\nint wrap(void)\n{\n\treturn shared_api(3);\n}\n',
    );
    // caller.c has no local def — its call binds to the global.
    writeFileSync(join(dir, 'caller.c'), 'int c(void)\n{\n\treturn shared_api(9);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['global.c'])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('caller.c'); // global call resolves to global.c
      expect(out).not.toContain('other.c'); // static homonym binds locally, not to global.c
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.25: class method call resolution (obj.method()).
  it('cg impact resolves cross-file method calls', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_methods');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'service.ts'),
      'export class Service {\n  doUniqueWork(): number { return 42; }\n}\n',
    );
    writeFileSync(
      join(dir, 'consumer.ts'),
      "import { Service } from './service';\nconst s = new Service();\nexport function run() { return s.doUniqueWork(); }\n",
    );
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('search', ['doUniqueWork'])).toBe(ExitCode.SUCCESS);
      const search = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(search).toContain('doUniqueWork'); // method is now an indexed node

      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['service.ts'])).toBe(ExitCode.SUCCESS);
      const impact = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(impact).toContain('consumer.ts'); // method call resolves cross-file
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg does not resolve built-in method names to user methods', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_builtin');
    mkdirSync(dir, { recursive: true });
    // A user class with a `map` method — must NOT capture Array.prototype.map calls.
    writeFileSync(join(dir, 'coll.ts'), 'export class Coll {\n  map(): number { return 1; }\n}\n');
    writeFileSync(join(dir, 'user.ts'), 'export function run() { return [1, 2].map((x) => x); }\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['coll.ts'])).toBe(ExitCode.SUCCESS);
      const impact = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(impact).not.toContain('user.ts'); // built-in .map() is not an edge
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.30: cg path — shortest dependency chain between two files.
  it('cg path finds the shortest dependency chain (directional)', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_path');
    mkdirSync(dir, { recursive: true });
    // a.c → b.c → c.c (a depends on b depends on c).
    writeFileSync(join(dir, 'c.c'), 'int c_fn(int x)\n{\n\treturn x;\n}\n');
    writeFileSync(join(dir, 'b.c'), 'int c_fn(int);\nint b_fn(int x)\n{\n\treturn c_fn(x);\n}\n');
    writeFileSync(join(dir, 'a.c'), 'int b_fn(int);\nint a_fn(int x)\n{\n\treturn b_fn(x);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('path', ['a.c', 'c.c'])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('2 hop'); // a → b → c
      expect(out).toContain('a.c');
      expect(out).toContain('b.c');
      expect(out).toContain('c.c');

      // JSON output.
      logSpy.mockClear();
      expect(await handleCodegraph('path', ['a.c', 'c.c', '--json'])).toBe(ExitCode.SUCCESS);
      const j = JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
      expect(j.hops).toBe(2);
      expect(j.path[0]).toContain('a.c');
      expect(j.path[2]).toContain('c.c');

      // No reverse path (c does not depend on a).
      logSpy.mockClear();
      expect(await handleCodegraph('path', ['c.c', 'a.c'])).toBe(ExitCode.SUCCESS);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('No dependency path');

      // Missing args → validation error.
      expect(await handleCodegraph('path', ['a.c'])).toBe(ExitCode.VALIDATION_ERROR);
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.67: a short fragment must match the file NAME, not the directory. Files
  // under `src/` must not all match fragment `c` via the `sr`c`/` prefix.
  it('cg path/impact match by basename, not the directory prefix', async () => {
    const root = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_frag');
    const dir = join(root, 'src');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'c.ts'), 'export function cFn(x: number): number { return x; }\n');
    writeFileSync(join(dir, 'b.ts'), "import { cFn } from './c.js';\nexport function bFn(x: number): number { return cFn(x); }\n");
    writeFileSync(join(dir, 'a.ts'), "import { bFn } from './b.js';\nexport function aFn(x: number): number { return bFn(x); }\n");
    const prevCwd = process.cwd();
    process.chdir(root);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      // `b` → `c`: target fragment `c` must resolve to src/c.ts, not src/b.ts
      // (whose path contains the `c` of `sr`c`/`). Was a spurious 0-hop path.
      logSpy.mockClear();
      expect(await handleCodegraph('path', ['b', 'c', '--json'])).toBe(ExitCode.SUCCESS);
      const j = JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
      expect(j.hops).toBe(1);
      expect(j.path[j.path.length - 1]).toContain('c.ts');

      // `cg impact c` selects only c.ts, not every file under src/.
      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['c'])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('1 file(s) matching');
    } finally {
      process.chdir(prevCwd);
      rmSync(root, { recursive: true, force: true });
    }
  });

  // v0.5.31: Python class method call resolution.
  it('cg impact resolves Python method calls across files', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_py');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'service.py'), 'class Service:\n    def do_unique_work(self):\n        return 42\n');
    writeFileSync(
      join(dir, 'consumer.py'),
      'from service import Service\ndef run():\n    s = Service()\n    return s.do_unique_work()\n',
    );
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['service.py'])).toBe(ExitCode.SUCCESS);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('consumer.py');
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.32: Python builtin globals must not resolve to same-named user defs.
  it('cg does not resolve Python builtin names to user definitions', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_pybuiltin');
    mkdirSync(dir, { recursive: true });
    // lib.py defines a real helper AND (unluckily) a `type` — both unique.
    writeFileSync(join(dir, 'lib.py'), 'def my_unique_helper():\n    return 1\ndef type():\n    return 2\n');
    writeFileSync(
      join(dir, 'app.py'),
      'from lib import my_unique_helper\ndef run(x):\n    return my_unique_helper() + type(x) + len(x)\n',
    );
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      const graph = JSON.parse(readFileSync(join(dir, '.musubix', 'codegraph.json'), 'utf-8'));
      const callTargets = graph.edges.filter((e: { kind: string }) => e.kind === 'calls')
        .map((e: { to: string }) => e.to);
      expect(callTargets).toContain('my_unique_helper'); // real cross-file call resolves
      expect(callTargets).not.toContain('type'); // builtin — suppressed
      expect(callTargets).not.toContain('len'); // builtin — suppressed
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.33: Rust std methods suppressed per caller language; other langs keep the name.
  it('cg suppresses Rust std method names only for Rust callers', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_rust');
    mkdirSync(dir, { recursive: true });
    // lib.rs defines a real helper AND (unluckily) `clone` and `as_ref`.
    writeFileSync(
      join(dir, 'lib.rs'),
      'pub fn my_unique_rs_fn() -> i32 { 1 }\npub fn clone() -> i32 { 2 }\npub fn as_ref() -> i32 { 3 }\n',
    );
    writeFileSync(
      join(dir, 'app.rs'),
      'fn run(x: Foo) -> i32 { my_unique_rs_fn() + x.clone() + x.as_ref() }\n',
    );
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      const graph = JSON.parse(readFileSync(join(dir, '.musubix', 'codegraph.json'), 'utf-8'));
      const callTargets = graph.edges.filter((e: { kind: string }) => e.kind === 'calls')
        .map((e: { to: string }) => e.to);
      expect(callTargets).toContain('my_unique_rs_fn'); // real call resolves
      expect(callTargets).not.toContain('clone'); // Rust std trait method — suppressed
      expect(callTargets).not.toContain('as_ref'); // suppressed
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.31: candidates cycle penalty + path --all.
  it('cg candidates penalises files in a dependency cycle', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_cyc_pen');
    mkdirSync(dir, { recursive: true });
    // solo.c: self-contained (no cycle). a.c ↔ b.c: mutual cycle.
    writeFileSync(join(dir, 'solo.c'), 'int s1(int x)\n{\n\treturn x;\n}\nint s2(int x)\n{\n\treturn x;\n}\n');
    writeFileSync(join(dir, 'a.c'), 'int b_fn(int);\nint a_fn(int x)\n{\n\treturn b_fn(x);\n}\n');
    writeFileSync(join(dir, 'b.c'), 'int a_fn(int);\nint b_fn(int x)\n{\n\treturn a_fn(x);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('candidates', ['--json'])).toBe(ExitCode.SUCCESS);
      const j = JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
      const byFile = Object.fromEntries(j.candidates.map((c: { file: string; cyclePenalty: number }) =>
        [c.file.split(/[\\/]/).pop(), c.cyclePenalty]));
      expect(byFile['solo.c']).toBe(0);
      expect(byFile['a.c']).toBeGreaterThan(0); // in a cycle → penalised
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg path --all lists multiple shortest paths', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_pathall');
    mkdirSync(dir, { recursive: true });
    // src → m1 → dst and src → m2 → dst: two distinct 2-hop paths.
    writeFileSync(join(dir, 'dst.c'), 'int dst_fn(int x)\n{\n\treturn x;\n}\n');
    writeFileSync(join(dir, 'm1.c'), 'int dst_fn(int);\nint m1_fn(int x)\n{\n\treturn dst_fn(x);\n}\n');
    writeFileSync(join(dir, 'm2.c'), 'int dst_fn(int);\nint m2_fn(int x)\n{\n\treturn dst_fn(x);\n}\n');
    writeFileSync(join(dir, 'src.c'), 'int m1_fn(int);\nint m2_fn(int);\nint src_fn(int x)\n{\n\treturn m1_fn(x) + m2_fn(x);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('path', ['src.c', 'dst.c', '--all', '--json'])).toBe(ExitCode.SUCCESS);
      const j = JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
      expect(j.hops).toBe(2);
      expect(j.paths.length).toBe(2); // via m1 and via m2
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.24: cg cycles — detect circular file dependencies (SCCs).
  it('cg cycles detects mutual file dependencies', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_cycles');
    mkdirSync(dir, { recursive: true });
    // a_fn (in a.c) calls b_fn (in b.c) and vice-versa → a.c ↔ b.c cycle.
    writeFileSync(join(dir, 'a.c'), 'int b_fn(int);\nint a_fn(int x)\n{\n\treturn b_fn(x);\n}\n');
    writeFileSync(join(dir, 'b.c'), 'int a_fn(int);\nint b_fn(int x)\n{\n\treturn a_fn(x);\n}\n');
    // standalone.c has no cycle.
    writeFileSync(join(dir, 'standalone.c'), 'int s_fn(int x)\n{\n\treturn x;\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('cycles', [])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('dependency cycle');
      expect(out).toContain('a.c');
      expect(out).toContain('b.c');
      expect(out).not.toContain('standalone.c'); // not part of any cycle
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg cycles reports a clean graph', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_nocycle');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lib.c'), 'int helper(int x)\n{\n\treturn x;\n}\n');
    writeFileSync(join(dir, 'app.c'), 'int helper(int);\nint run(void)\n{\n\treturn helper(1);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('cycles', [])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('No circular file dependencies');
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.28: cg gate — CI quality gate with non-zero exit on violations.
  it('cg gate enforces cycle and layering rules with exit codes', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_gate');
    mkdirSync(dir, { recursive: true });
    // ui.c → lib.c (layering edge); cyc_a.c ↔ cyc_b.c (a cycle).
    writeFileSync(join(dir, 'lib.c'), 'int helper(int x)\n{\n\treturn x;\n}\n');
    writeFileSync(join(dir, 'ui.c'), 'int helper(int);\nint show(void)\n{\n\treturn helper(1);\n}\n');
    writeFileSync(join(dir, 'cyc_a.c'), 'int cyc_b_fn(int);\nint cyc_a_fn(int x)\n{\n\treturn cyc_b_fn(x);\n}\n');
    writeFileSync(join(dir, 'cyc_b.c'), 'int cyc_a_fn(int);\nint cyc_b_fn(int x)\n{\n\treturn cyc_a_fn(x);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      // Cycle gate: 1 cycle present.
      expect(await handleCodegraph('gate', ['--max-cycles', '0'])).toBe(ExitCode.GENERAL_ERROR);
      expect(await handleCodegraph('gate', ['--max-cycles', '5'])).toBe(ExitCode.SUCCESS);

      // Layering gate: ui.c → lib.c edge exists.
      expect(await handleCodegraph('gate', ['--forbid', 'ui.c:lib.c'])).toBe(ExitCode.GENERAL_ERROR);
      expect(await handleCodegraph('gate', ['--forbid', 'ui.c:nonexistent'])).toBe(ExitCode.SUCCESS);

      // JSON output.
      logSpy.mockClear();
      expect(await handleCodegraph('gate', ['--forbid', 'ui.c:lib.c', '--json'])).toBe(ExitCode.GENERAL_ERROR);
      const gate = JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
      expect(gate.passed).toBe(false);
      expect(gate.checks[0].pass).toBe(false);

      // No rules → validation error.
      expect(await handleCodegraph('gate', [])).toBe(ExitCode.VALIDATION_ERROR);
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.23: cg export — file-level dependency graph as DOT / JSON.
  it('cg export emits DOT and JSON file-level graphs', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_export');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lib.c'), 'int helper_fn(int x)\n{\n\treturn x + 1;\n}\n');
    writeFileSync(join(dir, 'app.c'), 'int run(void)\n{\n\treturn helper_fn(41);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('export', ['--format', 'dot'])).toBe(ExitCode.SUCCESS);
      const dot = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(dot).toContain('digraph codegraph {');
      expect(dot).toContain(' -> '); // at least one edge (app.c -> lib.c)
      expect(dot.trimEnd().endsWith('}')).toBe(true);
      expect(dot).not.toContain('subgraph'); // flat by default

      // v0.5.29: --cluster groups nodes into per-directory subgraphs.
      logSpy.mockClear();
      expect(await handleCodegraph('export', ['--format', 'dot', '--cluster'])).toBe(ExitCode.SUCCESS);
      const clustered = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(clustered).toContain('subgraph "cluster_0"');
      expect(clustered).toContain('label='); // directory label
      // Balanced braces (well-formed DOT).
      expect((clustered.match(/{/g) ?? []).length).toBe((clustered.match(/}/g) ?? []).length);

      logSpy.mockClear();
      expect(await handleCodegraph('export', ['--format', 'json'])).toBe(ExitCode.SUCCESS);
      const jsonStr = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      const parsed = JSON.parse(jsonStr);
      expect(Array.isArray(parsed.files)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
      expect(parsed.edges.some((e: { kind: string }) => e.kind === 'calls')).toBe(true);

      // --out writes a file and reports counts.
      const outFile = join(dir, 'graph.dot');
      logSpy.mockClear();
      expect(await handleCodegraph('export', ['--out', outFile])).toBe(ExitCode.SUCCESS);
      const msg = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(msg).toContain('Exported');
      expect(readFileSync(outFile, 'utf-8')).toContain('digraph');

      // Unknown format is rejected.
      expect(await handleCodegraph('export', ['--format', 'yaml'])).toBe(ExitCode.VALIDATION_ERROR);
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.26: cg diff — compare two graph snapshots.
  it('cg diff reports added files and dependencies', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_diff');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lib.c'), 'int helper_fn(int x)\n{\n\treturn x + 1;\n}\n');
    writeFileSync(join(dir, 'app.c'), 'int run(void)\n{\n\treturn helper_fn(1);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      // Baseline: lib.c + app.c.
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      const baseline = join(dir, 'baseline.json');
      writeFileSync(baseline, readFileSync(join(dir, '.musubix', 'codegraph.json'), 'utf-8'));

      // No-diff against itself.
      logSpy.mockClear();
      expect(await handleCodegraph('diff', [baseline, baseline])).toBe(ExitCode.SUCCESS);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('No differences');

      // Add a new caller and re-index → current graph.
      writeFileSync(join(dir, 'extra.c'), 'int extra(void)\n{\n\treturn helper_fn(2);\n}\n');
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('diff', [baseline])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('Files added');
      expect(out).toContain('extra.c'); // new file
      expect(out).toContain('Dependencies added'); // extra.c → lib.c call edge
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg diff errors when the baseline is missing', async () => {
    expect(await handleCodegraph('diff', [])).toBe(ExitCode.VALIDATION_ERROR);
    expect(await handleCodegraph('diff', ['/no/such/baseline.json'])).toBe(ExitCode.GENERAL_ERROR);
  });

  // v0.5.27: --json machine-readable output for impact/cycles/candidates/diff.
  it('cg supports --json output for automation', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_json');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lib.c'), 'int helper_fn(int x)\n{\n\treturn x + 1;\n}\n');
    writeFileSync(join(dir, 'app.c'), 'int run(void)\n{\n\treturn helper_fn(1);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    const parseLast = () => JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);

      logSpy.mockClear();
      expect(await handleCodegraph('impact', ['lib.c', '--json'])).toBe(ExitCode.SUCCESS);
      const impact = parseLast();
      expect(impact.counts.direct).toBeGreaterThanOrEqual(1);
      expect(impact.direct.some((f: string) => f.endsWith('app.c'))).toBe(true);

      logSpy.mockClear();
      expect(await handleCodegraph('candidates', ['--json'])).toBe(ExitCode.SUCCESS);
      const cand = parseLast();
      expect(Array.isArray(cand.candidates)).toBe(true);
      expect(cand.candidates[0]).toHaveProperty('score');

      logSpy.mockClear();
      expect(await handleCodegraph('cycles', ['--json'])).toBe(ExitCode.SUCCESS);
      const cyc = parseLast();
      expect(cyc.count).toBe(0); // no cycle in this fixture
      expect(Array.isArray(cyc.cycles)).toBe(true);

      // diff --json (self-diff → all zero).
      const baseline = join(dir, 'baseline.json');
      writeFileSync(baseline, readFileSync(join(dir, '.musubix', 'codegraph.json'), 'utf-8'));
      logSpy.mockClear();
      expect(await handleCodegraph('diff', [baseline, baseline, '--json'])).toBe(ExitCode.SUCCESS);
      const diff = parseLast();
      expect(diff.counts).toEqual({ filesAdded: 0, filesRemoved: 0, edgesAdded: 0, edgesRemoved: 0 });
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // v0.5.20: enriched stats + candidates ranking for rewrite triage.
  it('cg stats reports kind breakdowns and top called functions', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_stats');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lib.c'), 'int helper_fn(int x)\n{\n\treturn x + 1;\n}\n');
    writeFileSync(join(dir, 'app.c'), 'int run(void)\n{\n\treturn helper_fn(41);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('stats', [])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('Node kinds:');
      expect(out).toContain('function=');
      expect(out).toContain('Top called functions:');
      expect(out).toContain('helper_fn');
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cg candidates ranks self-contained files and excludes test files', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg_cand');
    mkdirSync(dir, { recursive: true });
    // core.c: substantive, no external deps, used by others → strong candidate.
    writeFileSync(
      join(dir, 'core.c'),
      'int a(int x)\n{\n\treturn x;\n}\nint b(int x)\n{\n\treturn x;\n}\n',
    );
    writeFileSync(join(dir, 'user.c'), 'int u(void)\n{\n\treturn a(1) + b(2);\n}\n');
    writeFileSync(join(dir, 'core_test.c'), 'int t(void)\n{\n\treturn a(0);\n}\n');
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await handleCodegraph('index', ['.'])).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      expect(await handleCodegraph('candidates', [])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('Rewrite candidates');
      expect(out).toContain('core.c');
      expect(out).not.toContain('core_test.c'); // test file excluded
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
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

  // v0.5.64 — the same issue on the same line is reported once, not per detector.
  it('deduplicates findings from multiple detectors on the same line', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_sec_dup');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'app.ts'),
      "app.get('/u', (req, res) => {\n  db.query(\"SELECT * FROM users WHERE n = '\" + req.query.n + \"'\");\n});\n",
    );
    try {
      await handleSecurity(dir);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      const sqlCount = out.split('\n').filter((l) => /SQL injection/i.test(l)).length;
      expect(sqlCount).toBe(1);
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
