import { describe, it, expect, vi } from 'vitest';
import {
  CLIDispatcher,
  createCLIDispatcher,
  getDefaultCommands,
  type CLICommand,
  type CLIConfig,
} from '../src/cli.js';

describe('CLIDispatcher', () => {
  function makeConfig(overrides?: Partial<CLIConfig>): CLIConfig {
    return {
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI',
      commands: [],
      ...overrides,
    };
  }

  it('createCLIDispatcher creates with default commands', () => {
    const dispatcher = createCLIDispatcher();
    const commands = dispatcher.listCommands();
    expect(commands.length).toBeGreaterThanOrEqual(16);
    const names = commands.map((c) => c.name);
    expect(names).toContain('init');
    expect(names).toContain('req');
    expect(names).toContain('design');
    expect(names).toContain('codegen');
    expect(names).toContain('trace');
    expect(names).toContain('policy');
    expect(names).toContain('workflow');
    expect(names).toContain('status');
  });

  it('listCommands returns all registered commands', () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    dispatcher.register({ name: 'a', description: 'A', action: async () => {} });
    dispatcher.register({ name: 'b', description: 'B', action: async () => {} });
    const list = dispatcher.listCommands();
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('dispatch executes command action', async () => {
    const action = vi.fn();
    const dispatcher = new CLIDispatcher(makeConfig());
    dispatcher.register({ name: 'run', description: 'Run', action });
    await dispatcher.dispatch('run', { flag: true });
    expect(action).toHaveBeenCalledWith({ flag: true });
  });

  it('dispatch throws for unknown command', async () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    await expect(dispatcher.dispatch('nonexistent')).rejects.toThrow(
      /Unknown command: nonexistent/,
    );
  });

  it('getHelp returns formatted help text', () => {
    const dispatcher = new CLIDispatcher(makeConfig({ name: 'myapp', version: '3.2.1', description: 'My App' }));
    dispatcher.register({ name: 'hello', description: 'Say hello', action: async () => {} });
    const help = dispatcher.getHelp();
    expect(help).toContain('myapp v3.2.1');
    expect(help).toContain('My App');
    expect(help).toContain('Commands:');
    expect(help).toContain('hello');
    expect(help).toContain('Say hello');
  });

  it('getVersion returns version', () => {
    const dispatcher = createCLIDispatcher();
    expect(dispatcher.getVersion()).toBe('2.0.0');
  });

  it('register adds new command', () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    expect(dispatcher.listCommands()).toHaveLength(0);
    dispatcher.register({ name: 'custom', description: 'Custom cmd', action: async () => {} });
    expect(dispatcher.listCommands()).toHaveLength(1);
    expect(dispatcher.listCommands()[0].name).toBe('custom');
  });

  it('getCommand finds registered command', () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    const cmd: CLICommand = { name: 'find-me', description: 'Findable', action: async () => {} };
    dispatcher.register(cmd);
    expect(dispatcher.getCommand('find-me')).toBe(cmd);
  });

  it('getCommand returns undefined for missing command', () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    expect(dispatcher.getCommand('missing')).toBeUndefined();
  });

  it('registerBatch registers multiple commands at once', () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    dispatcher.registerBatch([
      { name: 'x', description: 'X', action: async () => {} },
      { name: 'y', description: 'Y', action: async () => {} },
      { name: 'z', description: 'Z', action: async () => {} },
    ]);
    expect(dispatcher.listCommands()).toHaveLength(3);
  });

  it('getDefaultCommands returns non-empty array of CLICommand objects', () => {
    const defaults = getDefaultCommands();
    expect(defaults.length).toBeGreaterThanOrEqual(16);
    for (const cmd of defaults) {
      expect(cmd.name).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.action).toBe('function');
    }
  });

  it('default command stubs log expected messages', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dispatcher = createCLIDispatcher();
    await dispatcher.dispatch('init');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Initialized project'));
    await dispatcher.dispatch('req');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('EARSValidator'));
    logSpy.mockRestore();
  });

  it('dispatch passes args correctly to action', async () => {
    const dispatcher = new CLIDispatcher(makeConfig());
    let captured: Record<string, unknown> = {};
    dispatcher.register({
      name: 'capture',
      description: 'Capture args',
      action: async (args) => { captured = args; },
    });
    await dispatcher.dispatch('capture', { file: 'test.ts', verbose: true });
    expect(captured).toEqual({ file: 'test.ts', verbose: true });
  });
});
