/**
 * MUSUBIX2 CLI Entry Point — DES-PKG-001
 *
 * Unified CLI for all MUSUBIX2 commands.
 * Lightweight dispatcher with argument parsing, --help support,
 * and wired-up handlers for tasks / init commands.
 *
 * @see REQ-ARC-003, REQ-SDD-004, REQ-SDD-005
 */

import { ExitCode, type ExitCodeValue } from '@musubix2/core';

// ── Argument parsing ───────────────────────────────────────────────────────

export interface ParsedArgs {
  command: string;
  subcommand?: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Parse raw argv tokens into a structured ParsedArgs object.
 * Supports `--flag`, `--key value`, `-h`, and positional args.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? '';
  let subcommand: string | undefined;
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let i = 1;

  // Detect subcommand: first non-flag token after command
  if (i < argv.length && !argv[i].startsWith('-')) {
    subcommand = argv[i];
    i++;
  }

  while (i < argv.length) {
    const token = argv[i];
    if (token === '--') {
      // Everything after `--` is positional
      i++;
      while (i < argv.length) {
        args.push(argv[i]);
        i++;
      }
      break;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2);
      // Peek at next token to decide boolean vs string
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (token.startsWith('-') && token.length === 2) {
      const key = token.slice(1);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      args.push(token);
      i++;
    }
  }

  return { command, subcommand, args, flags };
}

// ── Help text ──────────────────────────────────────────────────────────────

/** Command descriptions used by showHelp */
const COMMAND_HELP: Record<string, { usage: string; description: string }> = {
  init: {
    usage: 'musubix init [path] [--name <name>] [--force]',
    description: 'プロジェクト初期化',
  },
  requirements: {
    usage: 'musubix requirements <analyze|validate> <file>',
    description: '要件分析',
  },
  design: {
    usage: 'musubix design <generate|verify> [options]',
    description: '設計生成',
  },
  codegen: {
    usage: 'musubix codegen [options]',
    description: 'コード生成',
  },
  tasks: {
    usage: 'musubix tasks <validate|list|stats> [--file <path>]',
    description: 'タスク管理',
  },
  trace: {
    usage: 'musubix trace [--verify]',
    description: 'トレーサビリティ',
  },
  policy: {
    usage: 'musubix policy [options]',
    description: 'ポリシー検証',
  },
  workflow: {
    usage: 'musubix workflow [options]',
    description: 'ワークフロー管理',
  },
  status: {
    usage: 'musubix status',
    description: 'プロジェクト状況',
  },
};

/**
 * Return formatted help text. If `command` is given, return subcommand help;
 * otherwise return root-level help listing all commands.
 */
export function showHelp(command?: string): string {
  if (command && COMMAND_HELP[command]) {
    const info = COMMAND_HELP[command];
    return [
      `MUSUBIX2 — ${command}`,
      '',
      `使い方: ${info.usage}`,
      '',
      info.description,
    ].join('\n');
  }

  const lines = [
    'MUSUBIX2 — Specification Driven Development System',
    '',
    '使い方: musubix <command> [options]',
    '',
    'コマンド:',
  ];
  for (const [name, info] of Object.entries(COMMAND_HELP)) {
    lines.push(`  ${name.padEnd(14)}${info.description}`);
  }
  return lines.join('\n');
}

// ── CLI Command / Config types ─────────────────────────────────────────────

export interface CLICommand {
  name: string;
  description: string;
  options?: Array<{ flag: string; description: string; default?: unknown }>;
  action: (args: Record<string, unknown>) => Promise<void>;
}

export interface CLIConfig {
  name: string;
  version: string;
  description: string;
  commands: CLICommand[];
}

// ── CLI Dispatcher ─────────────────────────────────────────────────────────

export class CLIDispatcher {
  private commands: Map<string, CLICommand> = new Map();
  private config: CLIConfig;

  constructor(config: CLIConfig) {
    this.config = config;
  }

  register(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  registerBatch(commands: CLICommand[]): void {
    for (const cmd of commands) {
      this.register(cmd);
    }
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  listCommands(): CLICommand[] {
    return [...this.commands.values()];
  }

  async dispatch(commandName: string, args: Record<string, unknown> = {}): Promise<void> {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(
        `Unknown command: ${commandName}. Available: ${[...this.commands.keys()].join(', ')}`,
      );
    }
    await command.action(args);
  }

  getHelp(): string {
    const lines = [
      `${this.config.name} v${this.config.version}`,
      this.config.description,
      '',
      'Commands:',
    ];
    for (const cmd of this.commands.values()) {
      lines.push(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
    }
    return lines.join('\n');
  }

  getVersion(): string {
    return this.config.version;
  }

  /**
   * High-level entry: parse argv, handle --help / -h, dispatch command,
   * and return an ExitCode value.
   */
  async run(argv: string[]): Promise<ExitCodeValue> {
    // Root-level --help / -h (before any command)
    if (
      argv.length === 0 ||
      argv.includes('--help') && !argv[0]?.match(/^[a-z]/) ||
      argv.includes('-h') && !argv[0]?.match(/^[a-z]/)
    ) {
      if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
        console.log(showHelp());
        return ExitCode.SUCCESS;
      }
    }

    const parsed = parseArgs(argv);

    // Per-command --help
    if (parsed.flags['help'] === true || parsed.flags['h'] === true) {
      console.log(showHelp(parsed.command));
      return ExitCode.SUCCESS;
    }

    if (!parsed.command) {
      console.log(showHelp());
      return ExitCode.SUCCESS;
    }

    try {
      await this.dispatch(parsed.command, {
        subcommand: parsed.subcommand,
        args: parsed.args,
        ...parsed.flags,
      });
      return ExitCode.SUCCESS;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message);
      return ExitCode.GENERAL_ERROR;
    }
  }
}

// ── Tasks handler (REQ-SDD-004) ────────────────────────────────────────────

import {
  TaskBreakdownManager,
  createTaskBreakdownManager,
  type TaskInfo,
} from '@musubix2/workflow-engine';
import { readFileSync } from 'node:fs';

/**
 * Parse a simple markdown task file into TaskInfo objects.
 * Expected format — one task per line: `- [status] id | title | priority | complexity`
 */
export function parseTaskFile(content: string): TaskInfo[] {
  const tasks: TaskInfo[] = [];
  for (const line of content.split('\n')) {
    const m = line.match(
      /^-\s*\[(x| )\]\s*(\S+)\s*\|\s*(.+?)\s*\|\s*(critical|high|medium|low)\s*\|\s*(simple|medium|complex)/i,
    );
    if (m) {
      tasks.push({
        id: m[2],
        title: m[3].trim(),
        description: '',
        priority: m[4].toLowerCase() as TaskInfo['priority'],
        status: m[1] === 'x' ? 'done' : 'pending',
        dependencies: [],
        estimatedComplexity: m[5].toLowerCase() as TaskInfo['estimatedComplexity'],
      });
    }
  }
  return tasks;
}

function loadManagerFromFile(filePath: string): TaskBreakdownManager {
  const content = readFileSync(filePath, 'utf-8');
  const manager = createTaskBreakdownManager();
  for (const task of parseTaskFile(content)) {
    manager.addTask(task);
  }
  return manager;
}

export async function handleTasksValidate(filePath: string): Promise<ExitCodeValue> {
  try {
    const manager = loadManagerFromFile(filePath);
    const breakdown = manager.getBreakdown();
    console.log(`✅ ${filePath}: ${breakdown.totalTasks} tasks parsed successfully`);
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Validation failed: ${msg}`);
    return ExitCode.VALIDATION_ERROR;
  }
}

export async function handleTasksList(filePath?: string): Promise<ExitCodeValue> {
  try {
    if (!filePath) {
      console.error('❌ --file <path> is required');
      return ExitCode.GENERAL_ERROR;
    }
    const manager = loadManagerFromFile(filePath);
    console.log(manager.toMarkdown());
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export async function handleTasksStats(filePath?: string): Promise<ExitCodeValue> {
  try {
    if (!filePath) {
      console.error('❌ --file <path> is required');
      return ExitCode.GENERAL_ERROR;
    }
    const manager = loadManagerFromFile(filePath);
    const b = manager.getBreakdown();
    console.log(
      [
        `Total:     ${b.totalTasks}`,
        `Completed: ${b.completedTasks}`,
        `Blocked:   ${b.blockedTasks}`,
        `Pending:   ${b.totalTasks - b.completedTasks - b.blockedTasks}`,
      ].join('\n'),
    );
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

// ── Init handler (REQ-SDD-005) ─────────────────────────────────────────────

import { createProjectInitializer } from '@musubix2/core';

export async function handleInit(
  targetPath: string = '.',
  name?: string,
  force?: boolean,
): Promise<ExitCodeValue> {
  const initializer = createProjectInitializer();
  const projectName = name ?? 'my-project';
  const result = initializer.init({
    projectName,
    template: 'default',
    outputDir: targetPath,
    overwrite: force,
  });

  if (!result.success) {
    for (const err of result.errors) {
      console.error(`❌ ${err}`);
    }
    return ExitCode.VALIDATION_ERROR;
  }

  console.log(`✅ Initialized project "${projectName}" at ${targetPath}`);
  for (const f of result.createdFiles) {
    console.log(`  ${f}`);
  }
  return ExitCode.SUCCESS;
}

// ── Default commands ───────────────────────────────────────────────────────

export function getDefaultCommands(): CLICommand[] {
  return [
    {
      name: 'init',
      description: 'Initialize a new MUSUBIX2 project',
      options: [
        { flag: '--name <name>', description: 'Project name' },
        { flag: '--force', description: 'Overwrite existing files' },
      ],
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('init'));
          return;
        }
        const targetPath = (args['subcommand'] as string) ?? (args['args'] as string[] | undefined)?.[0] ?? '.';
        await handleInit(
          targetPath,
          args['name'] as string | undefined,
          args['force'] === true,
        );
      },
    },
    {
      name: 'tasks',
      description: 'Task management (validate, list, stats)',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('tasks'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['file'] as string | undefined) ?? positionalArgs[0];

        switch (sub) {
          case 'validate':
            if (!filePath) {
              console.error('❌ Usage: musubix tasks validate <file>');
              return;
            }
            await handleTasksValidate(filePath);
            break;
          case 'list':
            await handleTasksList(filePath);
            break;
          case 'stats':
            await handleTasksStats(filePath);
            break;
          default:
            console.log(showHelp('tasks'));
        }
      },
    },
    {
      name: 'req',
      description: 'Analyze requirements (EARS validation)',
      action: async () => {
        console.log('musubix req — use EARSValidator');
      },
    },
    {
      name: 'req:wizard',
      description: 'Interactive requirements creation wizard',
      action: async () => {
        console.log('musubix req:wizard — use RequirementWizard');
      },
    },
    {
      name: 'design',
      description: 'Generate design documents',
      action: async () => {
        console.log('musubix design — use DesignGenerator');
      },
    },
    {
      name: 'design:c4',
      description: 'Generate C4 architecture diagrams',
      action: async () => {
        console.log('musubix design:c4 — use C4ModelGenerator');
      },
    },
    {
      name: 'design:verify',
      description: 'Verify design with SOLID analysis',
      action: async () => {
        console.log('musubix design:verify — use SOLIDValidator');
      },
    },
    {
      name: 'codegen',
      description: 'Generate code from design',
      action: async () => {
        console.log('musubix codegen — use CodeGenerator');
      },
    },
    {
      name: 'test:gen',
      description: 'Generate test skeletons',
      action: async () => {
        console.log('musubix test:gen — use UnitTestGenerator');
      },
    },
    {
      name: 'trace',
      description: 'Show traceability matrix',
      action: async () => {
        console.log('musubix trace — use TraceabilityManager');
      },
    },
    {
      name: 'trace:verify',
      description: 'Verify traceability coverage',
      action: async () => {
        console.log('musubix trace:verify — use TraceabilityValidator');
      },
    },
    {
      name: 'policy',
      description: 'Run constitution policy checks',
      action: async () => {
        console.log('musubix policy — use PolicyEngine');
      },
    },
    {
      name: 'ontology',
      description: 'Manage SDD ontology',
      action: async () => {
        console.log('musubix ontology — use N3Store');
      },
    },
    {
      name: 'cg',
      description: 'Code graph analysis',
      action: async () => {
        console.log('musubix cg — use GraphEngine');
      },
    },
    {
      name: 'security',
      description: 'Run security scan',
      action: async () => {
        console.log('musubix security — use SecurityScanner');
      },
    },
    {
      name: 'workflow',
      description: 'Show workflow phase status',
      action: async () => {
        console.log('musubix workflow — use PhaseController');
      },
    },
    {
      name: 'status',
      description: 'Show project status dashboard',
      action: async () => {
        console.log('musubix status — project overview');
      },
    },
  ];
}

export function createCLIDispatcher(): CLIDispatcher {
  const dispatcher = new CLIDispatcher({
    name: 'musubix',
    version: '2.0.0',
    description: 'MUSUBIX2 — Specification Driven Development System',
    commands: [],
  });
  dispatcher.registerBatch(getDefaultCommands());
  return dispatcher;
}
