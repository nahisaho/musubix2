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

  it('skills create returns SUCCESS with name', async () => {
    const code = await handleSkills('create', ['my-skill']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-skill'));
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

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('scaffold project returns SUCCESS with name', async () => {
    const code = await handleScaffold('project', ['my-project']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-project'));
  });

  it('scaffold package returns SUCCESS with name', async () => {
    const code = await handleScaffold('package', ['my-pkg']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-pkg'));
  });

  it('scaffold skill returns SUCCESS with name', async () => {
    const code = await handleScaffold('skill', ['my-skill']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-skill'));
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

  it('synthesis dsl returns SUCCESS with input', async () => {
    const code = await handleSynthesis('dsl', ['map x => x + 1']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DSL output'));
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

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
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
