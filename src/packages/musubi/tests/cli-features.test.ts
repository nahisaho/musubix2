import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseArgs,
  showHelp,
  CLIDispatcher,
  createCLIDispatcher,
  handleInit,
  handleTasksValidate,
  handleTasksList,
  handleTasksStats,
  parseTaskFile,
  type CLIConfig,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// ── REQ-ARC-003: parseArgs ─────────────────────────────────────────────────

describe('REQ-ARC-003: parseArgs', () => {
  it('parses command only', () => {
    const result = parseArgs(['init']);
    expect(result.command).toBe('init');
    expect(result.subcommand).toBeUndefined();
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('parses command with subcommand', () => {
    const result = parseArgs(['tasks', 'validate']);
    expect(result.command).toBe('tasks');
    expect(result.subcommand).toBe('validate');
  });

  it('parses --flag as boolean true', () => {
    const result = parseArgs(['init', '--force']);
    expect(result.flags['force']).toBe(true);
  });

  it('parses --key value pairs', () => {
    const result = parseArgs(['init', '--name', 'myproject']);
    expect(result.flags['name']).toBe('myproject');
  });

  it('parses -h as boolean flag', () => {
    const result = parseArgs(['init', '-h']);
    expect(result.flags['h']).toBe(true);
  });

  it('parses --help as boolean flag', () => {
    const result = parseArgs(['init', '--help']);
    expect(result.flags['help']).toBe(true);
  });

  it('parses init --name myproject correctly', () => {
    const result = parseArgs(['init', '--name', 'myproject']);
    expect(result.command).toBe('init');
    expect(result.flags['name']).toBe('myproject');
  });

  it('parses init with path and --force correctly', () => {
    const result = parseArgs(['init', '/some/test', '--force']);
    expect(result.command).toBe('init');
    expect(result.subcommand).toBe('/some/test');
    expect(result.flags['force']).toBe(true);
  });

  it('parses tasks validate with file argument', () => {
    const result = parseArgs(['tasks', 'validate', 'tasks.md']);
    expect(result.command).toBe('tasks');
    expect(result.subcommand).toBe('validate');
    expect(result.args).toEqual(['tasks.md']);
  });

  it('parses tasks list --file path', () => {
    const result = parseArgs(['tasks', 'list', '--file', 'storage/tasks.md']);
    expect(result.command).toBe('tasks');
    expect(result.subcommand).toBe('list');
    expect(result.flags['file']).toBe('storage/tasks.md');
  });

  it('handles empty argv', () => {
    const result = parseArgs([]);
    expect(result.command).toBe('');
    expect(result.subcommand).toBeUndefined();
    expect(result.args).toEqual([]);
  });

  it('handles -- separator for positional args', () => {
    const result = parseArgs(['run', '--', '--not-a-flag']);
    expect(result.args).toEqual(['--not-a-flag']);
    expect(result.flags).toEqual({});
  });

  it('treats multiple positional tokens after subcommand as args', () => {
    const result = parseArgs(['codegen', 'sub', 'a', 'b', 'c']);
    expect(result.command).toBe('codegen');
    expect(result.subcommand).toBe('sub');
    expect(result.args).toEqual(['a', 'b', 'c']);
  });

  it('parses short flag with value', () => {
    const result = parseArgs(['tasks', 'list', '-f', 'file.md']);
    expect(result.flags['f']).toBe('file.md');
  });
});

// ── REQ-ARC-003: showHelp ──────────────────────────────────────────────────

describe('REQ-ARC-003: showHelp', () => {
  it('returns root-level help with all commands', () => {
    const help = showHelp();
    expect(help).toContain('MUSUBIX2 — Specification Driven Development System');
    expect(help).toContain('使い方: musubix <command> [options]');
    expect(help).toContain('コマンド:');
    expect(help).toContain('init');
    expect(help).toContain('tasks');
    expect(help).toContain('design');
    expect(help).toContain('requirements');
    expect(help).toContain('codegen');
    expect(help).toContain('trace');
    expect(help).toContain('workflow');
    expect(help).toContain('status');
    expect(help).toContain('policy');
  });

  it('returns subcommand help for init', () => {
    const help = showHelp('init');
    expect(help).toContain('MUSUBIX2 — init');
    expect(help).toContain('musubix init');
    expect(help).toContain('--name');
    expect(help).toContain('--force');
  });

  it('returns subcommand help for tasks', () => {
    const help = showHelp('tasks');
    expect(help).toContain('MUSUBIX2 — tasks');
    expect(help).toContain('validate');
    expect(help).toContain('list');
    expect(help).toContain('stats');
  });

  it('falls back to root help for unknown command', () => {
    const help = showHelp('nonexistent');
    expect(help).toContain('MUSUBIX2 — Specification Driven Development System');
  });
});

// ── REQ-ARC-003: CLIDispatcher.run and ExitCode ────────────────────────────

describe('REQ-ARC-003: CLIDispatcher.run', () => {
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

  it('--help at root shows help and returns SUCCESS', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['--help']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('MUSUBIX2'));
  });

  it('-h at root shows help and returns SUCCESS', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['-h']);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('empty argv shows help and returns SUCCESS', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run([]);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('dispatches valid command and returns SUCCESS', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['req:wizard']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Requirements Creation Wizard'));
  });

  it('unknown command returns GENERAL_ERROR', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['nonexistent']);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(errSpy).toHaveBeenCalled();
  });
});

// ── REQ-SDD-004: Tasks CLI ─────────────────────────────────────────────────

describe('REQ-SDD-004: parseTaskFile', () => {
  it('parses markdown task lines', () => {
    const content = [
      '- [ ] T-001 | Design API | high | complex',
      '- [x] T-002 | Write README | low | simple',
    ].join('\n');
    const tasks = parseTaskFile(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe('T-001');
    expect(tasks[0].title).toBe('Design API');
    expect(tasks[0].priority).toBe('high');
    expect(tasks[0].status).toBe('pending');
    expect(tasks[0].estimatedComplexity).toBe('complex');
    expect(tasks[1].id).toBe('T-002');
    expect(tasks[1].status).toBe('done');
  });

  it('ignores non-task lines', () => {
    const content = '# Tasks\n\nSome text\n- [ ] T-001 | Build | medium | medium\n';
    const tasks = parseTaskFile(content);
    expect(tasks).toHaveLength(1);
  });

  it('returns empty array for empty content', () => {
    expect(parseTaskFile('')).toEqual([]);
  });
});

describe('REQ-SDD-004: Tasks CLI handlers', () => {
  const fixtureDir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_tasks');
  const fixtureFile = join(fixtureDir, 'test-tasks.md');
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      fixtureFile,
      [
        '# Tasks',
        '- [ ] T-001 | Design API | high | complex',
        '- [x] T-002 | Write docs | low | simple',
        '- [ ] T-003 | Implement | medium | medium',
      ].join('\n'),
    );
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('tasks validate succeeds for valid file', async () => {
    const code = await handleTasksValidate(fixtureFile);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3 tasks parsed'));
  });

  it('tasks validate returns VALIDATION_ERROR for missing file', async () => {
    const code = await handleTasksValidate('/nonexistent/path.md');
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
    expect(errSpy).toHaveBeenCalled();
  });

  it('tasks list outputs markdown table', async () => {
    const code = await handleTasksList(fixtureFile);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('T-001'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('T-002'));
  });

  it('tasks list returns GENERAL_ERROR without --file', async () => {
    const code = await handleTasksList();
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('--file'));
  });

  it('tasks stats shows breakdown', async () => {
    const code = await handleTasksStats(fixtureFile);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total:     3'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Completed: 1'));
  });

  it('tasks stats returns GENERAL_ERROR without --file', async () => {
    const code = await handleTasksStats();
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });
});

describe('REQ-SDD-004: Tasks dispatch via CLI', () => {
  const fixtureDir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_tasks2');
  const fixtureFile = join(fixtureDir, 'tasks.md');
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(fixtureFile, '- [ ] T-001 | Task | medium | simple\n');
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('tasks command dispatches validate subcommand', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('tasks', {
      subcommand: 'validate',
      args: [fixtureFile],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('1 tasks parsed'));
  });

  it('tasks command dispatches list subcommand', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('tasks', {
      subcommand: 'list',
      file: fixtureFile,
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('T-001'));
  });

  it('tasks command shows help when no subcommand', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('tasks', {});
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('tasks'));
  });
});

// ── REQ-SDD-005: Init CLI ──────────────────────────────────────────────────

describe('REQ-SDD-005: Init CLI', () => {
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

  it('parseArgs parses init --name myproject', () => {
    const parsed = parseArgs(['init', '--name', 'myproject']);
    expect(parsed.command).toBe('init');
    expect(parsed.flags['name']).toBe('myproject');
  });

  it('parseArgs parses init /some/test --force', () => {
    const parsed = parseArgs(['init', '/some/test', '--force']);
    expect(parsed.command).toBe('init');
    expect(parsed.subcommand).toBe('/some/test');
    expect(parsed.flags['force']).toBe(true);
  });

  it('parseArgs parses init with both name and path', () => {
    const parsed = parseArgs(['init', 'mydir', '--name', 'myproject', '--force']);
    expect(parsed.command).toBe('init');
    expect(parsed.subcommand).toBe('mydir');
    expect(parsed.flags['name']).toBe('myproject');
    expect(parsed.flags['force']).toBe(true);
  });

  it('handleInit returns SUCCESS for valid project', async () => {
    const code = await handleInit('.', 'test-project');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test-project'));
  });

  it('handleInit returns VALIDATION_ERROR for invalid name', async () => {
    const code = await handleInit('.', '123-bad-name');
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
    expect(errSpy).toHaveBeenCalled();
  });

  it('handleInit uses default project name when none given', async () => {
    const code = await handleInit();
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-project'));
  });

  it('handleInit uses default path "."', async () => {
    const code = await handleInit(undefined, 'my-app');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-app'));
  });

  it('init dispatch via CLI dispatcher works with --name', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('init', { name: 'proj-x' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('proj-x'));
  });

  it('init dispatch via CLI dispatcher uses --force flag', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('init', { name: 'my-app', force: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-app'));
  });

  it('init --help shows init help text', async () => {
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('init', { help: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('musubix init'));
  });
});
