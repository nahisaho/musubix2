import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCLIDispatcher,
  getDefaultCommands,
  handleSkills,
  handleKnowledge,
  handleDecision,
  handleDeepResearch,
  handleRepl,
  handleScaffold,
  handleExplain,
  handleLearn,
  handleSynthesis,
  handleWatch,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ── Registration ───────────────────────────────────────────────────────────

describe('CLI Commands C — New command registration', () => {
  it('all 10 new commands are registered in default dispatcher', () => {
    const dispatcher = createCLIDispatcher();
    const names = dispatcher.listCommands().map((c) => c.name);
    expect(names).toContain('skills');
    expect(names).toContain('knowledge');
    expect(names).toContain('decision');
    expect(names).toContain('deep-research');
    expect(names).toContain('repl');
    expect(names).toContain('scaffold');
    expect(names).toContain('explain');
    expect(names).toContain('learn');
    expect(names).toContain('synthesis');
    expect(names).toContain('watch');
  });

  it('getDefaultCommands includes at least 27 commands (17 original + 10 new)', () => {
    const commands = getDefaultCommands();
    expect(commands.length).toBeGreaterThanOrEqual(27);
  });
});

// ── Skills ─────────────────────────────────────────────────────────────────

describe('CLI Commands C — Skills', () => {
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

  it('skills list returns SUCCESS', async () => {
    const code = await handleSkills('list', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('skills create scaffolds real files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'musubix2-skill-'));
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const code = await handleSkills('create', ['my-skill']);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(existsSync(join(dir, 'my-skill', 'skill.json'))).toBe(true);
      expect(existsSync(join(dir, 'my-skill', 'index.ts'))).toBe(true);
      expect(existsSync(join(dir, 'my-skill', 'tests', 'index.test.ts'))).toBe(true);
    } finally {
      process.chdir(prev);
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('skills create returns GENERAL_ERROR without name', async () => {
    const code = await handleSkills('create', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('skills validate returns GENERAL_ERROR without path', async () => {
    const code = await handleSkills('validate', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('skills unknown subcommand shows usage', async () => {
    const code = await handleSkills(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── Knowledge ──────────────────────────────────────────────────────────────

describe('CLI Commands C — Knowledge', () => {
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

  it('knowledge stats returns SUCCESS', async () => {
    const code = await handleKnowledge('stats', [], {});
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Entities'));
  });

  it('knowledge get returns GENERAL_ERROR without id', async () => {
    const code = await handleKnowledge('get', [], {});
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('knowledge put returns GENERAL_ERROR without args', async () => {
    const code = await handleKnowledge('put', [], {});
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('knowledge search returns GENERAL_ERROR without term', async () => {
    const code = await handleKnowledge('search', [], {});
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('knowledge unknown subcommand shows usage', async () => {
    const code = await handleKnowledge(undefined, [], {});
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── Decision ───────────────────────────────────────────────────────────────

describe('CLI Commands C — Decision', () => {
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

  it('decision list returns SUCCESS', async () => {
    const code = await handleDecision('list', [], {});
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('decision create returns GENERAL_ERROR without title', async () => {
    const code = await handleDecision('create', [], {});
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // v0.5.41 — dogfooding: create must populate context/decision from flags.
  it('decision create stores context/decision from flags', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'musubix2-adr-'));
    try {
      const flags = { path: dir, context: 'Need ACID', decision: 'Use PostgreSQL' };
      expect(await handleDecision('create', ['Use PostgreSQL'], flags)).toBe(ExitCode.SUCCESS);
      logSpy.mockClear();
      await handleDecision('get', ['ADR-001'], { path: dir });
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('Need ACID');
      expect(out).toContain('Use PostgreSQL');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('decision get returns GENERAL_ERROR without id', async () => {
    const code = await handleDecision('get', [], {});
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('decision unknown subcommand shows usage', async () => {
    const code = await handleDecision(undefined, [], {});
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── Deep Research ──────────────────────────────────────────────────────────

describe('CLI Commands C — Deep Research', () => {
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

  it('deep-research query returns SUCCESS with question', async () => {
    const code = await handleDeepResearch('query', ['What is SDD?']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Confidence'));
  });

  // v0.5.41 — dogfooding: query/evidence pull sources from the knowledge graph.
  it('deep-research query uses knowledge-graph entities as sources', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'musubix2-dr-'));
    const prev = process.cwd();
    process.chdir(dir);
    try {
      await handleKnowledge(
        'put',
        ['microservices', 'concept', 'Microservices add operational complexity'],
        {},
      );
      logSpy.mockClear();
      expect(await handleDeepResearch('query', ['microservices'])).toBe(ExitCode.SUCCESS);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('from knowledge graph');
    } finally {
      process.chdir(prev);
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('deep-research query returns GENERAL_ERROR without question', async () => {
    const code = await handleDeepResearch('query', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('deep-research unknown subcommand shows usage', async () => {
    const code = await handleDeepResearch(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── REPL ───────────────────────────────────────────────────────────────────

describe('CLI Commands C — REPL', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('repl handler prints welcome message', async () => {
    const code = await handleRepl();
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('MUSUBIX2 Interactive REPL'));
  });
});

// ── Scaffold ───────────────────────────────────────────────────────────────

describe('CLI Commands C — Scaffold', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let dir: string;
  let prevCwd: string;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Isolate the working directory — scaffold writes real files.
    dir = await mkdtemp(join(tmpdir(), 'musubix2-scaffold-'));
    prevCwd = process.cwd();
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(prevCwd);
    logSpy.mockRestore();
    errSpy.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });

  it('scaffold project returns SUCCESS with name', async () => {
    const code = await handleScaffold('project', ['my-project']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-project'));
  });

  // ISSUE-12: package/skill must write real files, not just print a tree.
  it('scaffold package writes real files', async () => {
    const code = await handleScaffold('package', ['my-pkg']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(existsSync(join(dir, 'packages/my-pkg/package.json'))).toBe(true);
    expect(existsSync(join(dir, 'packages/my-pkg/src/index.ts'))).toBe(true);
    expect(existsSync(join(dir, 'packages/my-pkg/tests/index.test.ts'))).toBe(true);
  });

  it('scaffold skill writes real files', async () => {
    const code = await handleScaffold('skill', ['my-skill']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(existsSync(join(dir, 'skills/my-skill/skill.json'))).toBe(true);
    expect(existsSync(join(dir, 'skills/my-skill/index.ts'))).toBe(true);
  });

  it('scaffold refuses to overwrite an existing target', async () => {
    await handleScaffold('package', ['dup']);
    const second = await handleScaffold('package', ['dup']);
    expect(second).toBe(ExitCode.GENERAL_ERROR);
  });

  it('scaffold project returns GENERAL_ERROR without name', async () => {
    const code = await handleScaffold('project', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('scaffold unknown subcommand shows usage', async () => {
    const code = await handleScaffold(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── Explain ────────────────────────────────────────────────────────────────

describe('CLI Commands C — Explain', () => {
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

  it('explain with inline code returns SUCCESS', async () => {
    const code = await handleExplain('function add(a, b) { return a + b; }');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Code Explanation'));
  });

  it('explain without input returns GENERAL_ERROR', async () => {
    const code = await handleExplain(undefined);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // ISSUE-16: a directory must yield a clear error, not a raw EISDIR crash.
  it('explain on a directory returns a clear error', async () => {
    const d = await mkdtemp(join(tmpdir(), 'musubix2-explain-'));
    try {
      const code = await handleExplain(d);
      expect(code).toBe(ExitCode.GENERAL_ERROR);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('not a directory'));
    } finally {
      await rm(d, { recursive: true, force: true });
    }
  });
});

// ── Learn ──────────────────────────────────────────────────────────────────

describe('CLI Commands C — Learn', () => {
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

  it('learn patterns returns SUCCESS', async () => {
    const code = await handleLearn('patterns', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('learn suggest returns SUCCESS', async () => {
    const code = await handleLearn('suggest', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('learn analyze returns GENERAL_ERROR without path', async () => {
    const code = await handleLearn('analyze', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // ISSUE-13: analyzing a directory must not crash with EISDIR.
  it('learn analyze accepts a directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'musubix2-learn-'));
    try {
      mkdirSync(join(dir, 'sub'), { recursive: true });
      writeFileSync(join(dir, 'a.ts'), 'export function a() { return 1; }\n');
      writeFileSync(join(dir, 'sub', 'b.js'), 'export function b() { return 2; }\n');
      const code = await handleLearn('analyze', [dir]);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('file(s)'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('learn unknown subcommand shows usage', async () => {
    const code = await handleLearn(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── Synthesis ──────────────────────────────────────────────────────────────

describe('CLI Commands C — Synthesis', () => {
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

  // v0.5.6: dsl applies a real transform pipeline given via --ops.
  it('synthesis dsl applies the --ops pipeline', async () => {
    const code = await handleSynthesis('dsl', ['  hello world  '], { ops: 'trim,camelCase' });
    expect(code).toBe(ExitCode.SUCCESS);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('helloWorld');
  });

  it('synthesis dsl without --ops returns a validation error (no more silent echo)', async () => {
    const code = await handleSynthesis('dsl', ['hello'], {});
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
  });

  it('synthesis dsl rejects an unknown op', async () => {
    const code = await handleSynthesis('dsl', ['hello'], { ops: 'bogus' });
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
  });

  it('synthesis dsl returns GENERAL_ERROR without input', async () => {
    const code = await handleSynthesis('dsl', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('synthesis version-space returns SUCCESS', async () => {
    const code = await handleSynthesis('version-space', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Version space'));
  });

  it('synthesis fromExamples returns SUCCESS', async () => {
    const code = await handleSynthesis('fromExamples', ['1=2', '2=4']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Synthesized'));
  });

  it('synthesis unknown subcommand shows usage', async () => {
    const code = await handleSynthesis(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });
});

// ── Watch ──────────────────────────────────────────────────────────────────

describe('CLI Commands C — Watch', () => {
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

  it('watch returns GENERAL_ERROR without pattern', async () => {
    const code = await handleWatch(undefined);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });

  it('watch initializes with pattern', async () => {
    const code = await handleWatch('**/*.ts');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Watching'));
  });
});

// ── Dispatch integration ───────────────────────────────────────────────────

describe('CLI Commands C — Dispatch integration', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let dir: string;
  let prevCwd: string;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Isolate cwd — some dispatched commands (scaffold/knowledge/decision)
    // write state relative to the working directory.
    dir = await mkdtemp(join(tmpdir(), 'musubix2-dispatch-'));
    prevCwd = process.cwd();
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(prevCwd);
    logSpy.mockRestore();
    errSpy.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });

  it('dispatches skills list', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('skills', { subcommand: 'list', args: [] });
    expect(logSpy).toHaveBeenCalled();
  });

  it('dispatches knowledge stats', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('knowledge', { subcommand: 'stats', args: [] });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Entities'));
  });

  it('dispatches decision list', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('decision', { subcommand: 'list', args: [] });
    expect(logSpy).toHaveBeenCalled();
  });

  it('dispatches scaffold package', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('scaffold', { subcommand: 'package', args: ['test-pkg'] });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test-pkg'));
  });

  it('dispatches explain with snippet', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('explain', { subcommand: 'const x = 1;', args: [] });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Code Explanation'));
  });

  it('dispatches synthesis version-space', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('synthesis', { subcommand: 'version-space', args: [] });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Version space'));
  });
});

// ── v0.5.3: knowledge / decision persistence across invocations ─────────────

describe('v0.5.3 CLI persistence', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let dir: string;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dir = await mkdtemp(join(tmpdir(), 'musubix2-persist-'));
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });

  // ISSUE-10
  it('knowledge put then get (separate handler calls) round-trips via disk', async () => {
    const kdir = join(dir, 'kg');
    const put = await handleKnowledge('put', ['E1', 'concept'], { path: kdir });
    expect(put).toBe(ExitCode.SUCCESS);

    logSpy.mockClear();
    const get = await handleKnowledge('get', ['E1'], { path: kdir });
    expect(get).toBe(ExitCode.SUCCESS);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('"id": "E1"');
    expect(printed).not.toBe('{}');
  });

  it('knowledge get for a missing id returns an error', async () => {
    const code = await handleKnowledge('get', ['NOPE'], { path: join(dir, 'kg') });
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // ISSUE-11
  it('decision create then list (separate handler calls) persists', async () => {
    const created = await handleDecision('create', ['Use PostgreSQL'], { path: dir });
    expect(created).toBe(ExitCode.SUCCESS);

    logSpy.mockClear();
    const listed = await handleDecision('list', [], { path: dir });
    expect(listed).toBe(ExitCode.SUCCESS);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('Use PostgreSQL');
    expect(printed).not.toContain('No ADRs found');
  });

  it('decision ids increment across separate invocations', async () => {
    await handleDecision('create', ['First'], { path: dir });
    logSpy.mockClear();
    await handleDecision('create', ['Second'], { path: dir });
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('ADR-002');
  });
});
