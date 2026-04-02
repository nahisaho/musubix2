import { describe, it, expect } from 'vitest';
import { ReplEngine, DefaultReplFormatter } from '../../src/repl/index.js';
import type { ReplCommand } from '../../src/repl/index.js';

describe('REQ-CLI-001: ReplEngine', () => {
  it('should eval built-in help command', async () => {
    const repl = new ReplEngine();
    const result = await repl.eval('help');
    expect(result).toContain('Available commands');
    expect(result).toContain('help');
    expect(result).toContain('exit');
  });

  it('should eval help alias', async () => {
    const repl = new ReplEngine();
    const result = await repl.eval('?');
    expect(result).toContain('Available commands');
  });

  it('should return error for unknown command', async () => {
    const repl = new ReplEngine();
    const result = await repl.eval('nonexistent');
    expect(result).toContain('Unknown command');
  });

  it('should return empty for blank input', async () => {
    const repl = new ReplEngine();
    expect(await repl.eval('')).toBe('');
    expect(await repl.eval('   ')).toBe('');
  });

  it('should register custom commands', async () => {
    const cmd: ReplCommand = {
      name: 'greet',
      description: 'Say hello',
      execute: async (args) => `Hello ${args[0] ?? 'world'}`,
    };
    const repl = new ReplEngine({ commands: [cmd] });
    const result = await repl.eval('greet Alice');
    expect(result).toBe('Hello Alice');
  });

  it('should track history', async () => {
    const repl = new ReplEngine();
    await repl.eval('help');
    await repl.eval('history');
    const history = repl.getHistory();
    expect(history).toContain('help');
    expect(history).toContain('history');
  });

  it('should show history via command', async () => {
    const repl = new ReplEngine();
    await repl.eval('help');
    const result = await repl.eval('history');
    expect(result).toContain('help');
  });

  it('should clear history', async () => {
    const repl = new ReplEngine();
    await repl.eval('help');
    expect(repl.getHistory()).toContain('help');
    await repl.eval('clear');
    // clear command empties session history
    expect(repl.getSession().history).toEqual([]);
  });

  it('should complete command names', () => {
    const repl = new ReplEngine();
    const completions = repl.complete('he');
    expect(completions).toContain('help');
  });

  it('should complete all commands for empty input', () => {
    const repl = new ReplEngine();
    const completions = repl.complete('');
    expect(completions.length).toBeGreaterThan(0);
  });

  it('should delegate completion to command', () => {
    const cmd: ReplCommand = {
      name: 'test',
      description: 'Test',
      execute: async () => 'ok',
      complete: (partial) => ['foo', 'bar'].filter((s) => s.startsWith(partial)),
    };
    const repl = new ReplEngine({ commands: [cmd] });
    const completions = repl.complete('test f');
    expect(completions).toContain('foo');
  });

  it('should exit via command', async () => {
    const repl = new ReplEngine();
    await repl.eval('exit');
    expect(repl.isRunning()).toBe(false);
  });

  it('should have session info', () => {
    const repl = new ReplEngine();
    const session = repl.getSession();
    expect(session.id).toMatch(/^repl-/);
    expect(session.startedAt).toBeInstanceOf(Date);
  });

  it('should use custom prompt', () => {
    const repl = new ReplEngine({ prompt: 'sdd> ' });
    expect(repl.getPrompt()).toBe('sdd> ');
  });
});

describe('REQ-CLI-001: DefaultReplFormatter', () => {
  const fmt = new DefaultReplFormatter();

  it('should format string result', () => {
    expect(fmt.formatResult('hello')).toBe('hello');
  });

  it('should format object as JSON', () => {
    const result = fmt.formatResult({ key: 'val' });
    expect(result).toContain('"key"');
  });

  it('should format null/undefined as empty', () => {
    expect(fmt.formatResult(null)).toBe('');
    expect(fmt.formatResult(undefined)).toBe('');
  });

  it('should format error', () => {
    expect(fmt.formatError(new Error('boom'))).toContain('boom');
  });
});
