/**
 * REPL Engine
 *
 * Interactive Read-Eval-Print Loop with tab completion,
 * history, session management, and output formatting.
 *
 * @module repl
 * @see DES-CLI-001 — REPL Engine
 */

export interface ReplCommand {
  name: string;
  description: string;
  aliases?: string[];
  execute: (args: string[], session: ReplSession) => Promise<string>;
  complete?: (partial: string) => string[];
}

export interface ReplSession {
  id: string;
  history: string[];
  variables: Map<string, unknown>;
  startedAt: Date;
}

export interface ReplOptions {
  prompt?: string;
  commands?: ReplCommand[];
  maxHistory?: number;
  welcomeMessage?: string;
}

export interface ReplFormatter {
  formatResult(value: unknown): string;
  formatError(error: Error): string;
  formatHelp(commands: ReplCommand[]): string;
}

export class DefaultReplFormatter implements ReplFormatter {
  formatResult(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  }

  formatError(error: Error): string {
    return `❌ ${error.message}`;
  }

  formatHelp(commands: ReplCommand[]): string {
    const lines = ['Available commands:', ''];
    for (const cmd of commands) {
      const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
      lines.push(`  ${cmd.name}${aliases} — ${cmd.description}`);
    }
    return lines.join('\n');
  }
}

export class ReplEngine {
  private commands: Map<string, ReplCommand> = new Map();
  private session: ReplSession;
  private formatter: ReplFormatter;
  private prompt: string;
  private maxHistory: number;
  private running = false;

  constructor(options?: ReplOptions) {
    this.prompt = options?.prompt ?? 'musubix> ';
    this.maxHistory = options?.maxHistory ?? 1000;
    this.formatter = new DefaultReplFormatter();

    this.session = {
      id: `repl-${Date.now()}`,
      history: [],
      variables: new Map(),
      startedAt: new Date(),
    };

    // Register built-in commands
    this.registerBuiltIns();

    // Register user commands
    if (options?.commands) {
      for (const cmd of options.commands) {
        this.register(cmd);
      }
    }
  }

  register(command: ReplCommand): void {
    this.commands.set(command.name, command);
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }
  }

  async eval(input: string): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed) {
      return '';
    }

    // Add to history
    this.session.history.push(trimmed);
    if (this.session.history.length > this.maxHistory) {
      this.session.history.shift();
    }

    const [commandName, ...args] = trimmed.split(/\s+/);
    const command = this.commands.get(commandName);

    if (!command) {
      return this.formatter.formatError(
        new Error(`Unknown command: ${commandName}. Type "help" for available commands.`),
      );
    }

    try {
      const result = await command.execute(args, this.session);
      return this.formatter.formatResult(result);
    } catch (error) {
      return this.formatter.formatError(error as Error);
    }
  }

  complete(partial: string): string[] {
    if (!partial) {
      return [...new Set([...this.commands.keys()])];
    }

    const [commandPart, ...rest] = partial.split(/\s+/);

    // Complete command name
    if (rest.length === 0) {
      const names = [...new Set([...this.commands.keys()])];
      return names.filter((n) => n.startsWith(commandPart));
    }

    // Delegate to command's completer
    const command = this.commands.get(commandPart);
    if (command?.complete) {
      return command.complete(rest.join(' '));
    }

    return [];
  }

  getSession(): ReplSession {
    return this.session;
  }

  getHistory(): string[] {
    return [...this.session.history];
  }

  getPrompt(): string {
    return this.prompt;
  }

  isRunning(): boolean {
    return this.running;
  }

  stop(): void {
    this.running = false;
  }

  private registerBuiltIns(): void {
    this.register({
      name: 'help',
      description: 'Show available commands',
      aliases: ['?'],
      execute: async () => {
        const uniqueCommands = [
          ...new Map([...this.commands.entries()].map(([_, cmd]) => [cmd.name, cmd])).values(),
        ];
        return this.formatter.formatHelp(uniqueCommands);
      },
    });

    this.register({
      name: 'history',
      description: 'Show command history',
      execute: async () => {
        return this.session.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n');
      },
    });

    this.register({
      name: 'clear',
      description: 'Clear history',
      execute: async () => {
        this.session.history = [];
        return 'History cleared';
      },
    });

    this.register({
      name: 'exit',
      description: 'Exit REPL',
      aliases: ['quit', 'q'],
      execute: async () => {
        this.running = false;
        return 'Goodbye';
      },
    });
  }
}
