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
import type { EntityType, RelationType } from '@musubix2/knowledge';
import {
  createMatrixGenerator,
  createImpactAnalyzer,
} from '@musubix2/core';
import {
  PolicyEngine,
  CONSTITUTION_ARTICLES,
  type PolicyContext,
} from '@musubix2/policy';
import {
  createOntologyStore,
  createConsistencyValidator,
} from '@musubix2/ontology-mcp';
import {
  createGraphEngine,
  createASTParser,
  GraphRAGSearch,
  type SupportedLanguage,
} from '@musubix2/codegraph';
import {
  createSecretDetector,
  TaintAnalyzer,
  TaintDataflowAnalyzer,
  DependencyScanner,
  type SecurityFinding,
  type Severity,
} from '@musubix2/security';

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
    usage: 'musubix init [path] [--name <name>] [--force] [--platform auto|copilot|claude|both] [--dry-run] [--update]',
    description: 'プロジェクト初期化 / デュアルプラットフォームセットアップ',
  },
  requirements: {
    usage: 'musubix requirements <analyze|validate> <file>',
    description: '要件分析',
  },
  design: {
    usage: 'musubix design generate <requirements.md> [--out <design.json>] | musubix design verify <design.json>',
    description: '設計生成 (--out で再利用可能な JSON 成果物を書き出し design:verify / design:c4 へ連携)',
  },
  codegen: {
    usage: 'musubix codegen [generate] <name> [--type class|interface|function|...]',
    description: 'コード生成',
  },
  tasks: {
    usage: 'musubix tasks <validate|list|stats> [--file <path>]',
    description: 'タスク管理',
  },
  trace: {
    usage: 'musubix trace <matrix|validate|impact> [--specs <file>] [--src <dir>]',
    description: 'トレーサビリティ（要件 → コードの REQ-ID 参照を解析）',
  },
  'trace:verify': {
    usage: 'musubix trace:verify [--specs <file>] [--src <dir>] [--strict]',
    description: 'トレーサビリティ検証（未参照要件を検出）',
  },
  policy: {
    usage: 'musubix policy <validate|list|info> [args]',
    description: 'ポリシー検証',
  },
  workflow: {
    usage: 'musubix workflow <status|approve|transition> [phase]',
    description: 'ワークフロー管理',
  },
  status: {
    usage: 'musubix status',
    description: 'プロジェクト状況',
  },
  ontology: {
    usage: 'musubix ontology <add|list|validate|stats> [args]',
    description: 'オントロジー管理',
  },
  cg: {
    usage: 'musubix cg <index|search|stats|deps|impact|path|candidates|cycles|gate|export|diff|languages> [args]',
    description: 'コードグラフ分析 (impact 影響、path 依存経路、candidates 候補、cycles 循環、gate CI ゲート、export、diff)',
  },
  security: {
    usage: 'musubix security <path> [--fail-on critical|high|medium|low|info] [--exclude-tests]',
    description: 'セキュリティスキャン（ファイル/ディレクトリ対応）',
  },
  skills: {
    usage: 'musubix skills <list|validate|create> [args]',
    description: 'スキル管理',
  },
  knowledge: {
    usage: 'musubix knowledge <get|put|delete|link|query|traverse|search|stats> [args]',
    description: 'ナレッジグラフ操作',
  },
  decision: {
    usage: 'musubix decision <create|list|get|accept|deprecate|search|index> [args]',
    description: 'ADR管理',
  },
  'deep-research': {
    usage: 'musubix deep-research <query|iterative|evidence> [args]',
    description: 'ディープリサーチ',
  },
  repl: {
    usage: 'musubix repl',
    description: 'インタラクティブREPL',
  },
  scaffold: {
    usage: 'musubix scaffold <project|package|skill> <name>',
    description: 'プロジェクトスキャフォールド',
  },
  explain: {
    usage: 'musubix explain <file-or-snippet>',
    description: 'コード説明',
  },
  learn: {
    usage: 'musubix learn <analyze|patterns|suggest> [args]',
    description: 'ライブラリ学習',
  },
  synthesis: {
    usage: 'musubix synthesis <fromExamples|dsl|version-space> [args]',
    description: 'プログラム合成',
  },
  watch: {
    usage: 'musubix watch <glob-pattern>',
    description: 'ファイル監視',
  },
  mcp: {
    usage: 'musubix2 mcp [--transport stdio|sse] [--port 3100]',
    description: 'MCP サーバー起動',
  },
  search: {
    usage: 'musubix search <query> [--corpus <dir>] [--top <n>]',
    description: 'TF-IDF セマンティック検索（コーパス内の文書をランク付け）',
  },
  verify: {
    usage: 'musubix verify <requirements.md>',
    description: 'EARS 要件を SMT に変換し論理整合性を検証（formal-verify）',
  },
  dfg: {
    usage: 'musubix dfg <file> [--unused]',
    description: 'データフロー解析（定義・使用・到達定義、未使用変数の検出）',
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
  action: (args: Record<string, unknown>) => Promise<ExitCodeValue | void>;
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

  async dispatch(
    commandName: string,
    args: Record<string, unknown> = {},
  ): Promise<ExitCodeValue | void> {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(
        `Unknown command: ${commandName}. Available: ${[...this.commands.keys()].join(', ')}`,
      );
    }
    return await command.action(args);
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

    // Per-command --help (and per-subcommand for `cg`).
    if (parsed.flags['help'] === true || parsed.flags['h'] === true) {
      if (parsed.command === 'cg') {
        console.log(cgSubcommandHelp(parsed.subcommand));
      } else {
        console.log(showHelp(parsed.command));
      }
      return ExitCode.SUCCESS;
    }

    if (!parsed.command) {
      console.log(showHelp());
      return ExitCode.SUCCESS;
    }

    try {
      const result = await this.dispatch(parsed.command, {
        subcommand: parsed.subcommand,
        args: parsed.args,
        ...parsed.flags,
      });
      // Actions may return an explicit ExitCode; default to SUCCESS when they return void.
      return result ?? ExitCode.SUCCESS;
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
  createPhaseController,
  createStateTracker,
  type WorkflowPhase,
  PHASE_ORDER,
} from '@musubix2/workflow-engine';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync, mkdirSync, type Dirent } from 'node:fs';
import { join as joinPath, dirname as dirnamePath } from 'node:path';

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

  // Copy .github/skills and copilot-instructions from the installed package
  try {
    const { cpSync, existsSync, mkdirSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    // Find the package's .github directory (relative to this module)
    const thisDir = typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
    const pkgGithub = resolve(thisDir, '..', '.github');
    const destGithub = resolve(targetPath, '.github');

    if (existsSync(pkgGithub)) {
      mkdirSync(destGithub, { recursive: true });

      // Copy skills
      const skillsSrc = resolve(pkgGithub, 'skills');
      if (existsSync(skillsSrc)) {
        cpSync(skillsSrc, resolve(destGithub, 'skills'), { recursive: true });
        console.log('  .github/skills/ (SDD skills)');
      }

      // Copy copilot-instructions
      const instrSrc = resolve(pkgGithub, 'copilot-instructions.md');
      if (existsSync(instrSrc)) {
        cpSync(instrSrc, resolve(destGithub, 'copilot-instructions.md'));
        console.log('  .github/copilot-instructions.md');
      }
    }
  } catch {
    // Non-critical — skills copy is best-effort
  }

  return ExitCode.SUCCESS;
}

// ── Trace handler ──────────────────────────────────────────────────────────

/** Matches a MUSUBIX requirement id such as REQ-AUT-001. */
const REQ_ID_RE = /REQ-[A-Z]{2,6}-\d{3}/g;

interface CodeTraceData {
  requirementIds: string[];
  fileIds: string[];
  links: Array<{ source: string; target: string; verified: boolean }>;
  refsByReq: Map<string, string[]>;
}

/**
 * Build real traceability data by parsing requirement ids from the specs file
 * and scanning source files for `REQ-XXX-NNN` references. A requirement is
 * "covered" when at least one source file references it.
 */
export function buildCodeTraceData(specsFile: string, srcDir: string): CodeTraceData {
  const reqIds: string[] = [];
  if (existsSync(specsFile)) {
    const content = readFileSync(specsFile, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^#{1,4}\s+(REQ-[A-Z]{2,6}-\d{3})\b/);
      if (m) {reqIds.push(m[1]);}
    }
    if (reqIds.length === 0) {
      // Fallback: any requirement id anywhere in the specs document.
      for (const m of content.matchAll(REQ_ID_RE)) {reqIds.push(m[0]);}
    }
  }
  const requirementIds = [...new Set(reqIds)];
  const reqSet = new Set(requirementIds);

  const refsByReq = new Map<string, string[]>();
  const fileSet = new Set<string>();
  const links: CodeTraceData['links'] = [];
  if (existsSync(srcDir)) {
    for (const file of collectFiles(srcDir, (ext) => ext in EXT_TO_LANG)) {
      // The file may vanish between listing and reading (concurrent cleanup);
      // skip unreadable files instead of aborting the whole trace.
      let code: string;
      try {
        code = readFileSync(file, 'utf-8');
      } catch {
        continue;
      }
      const refs = new Set<string>();
      for (const m of code.matchAll(REQ_ID_RE)) {
        if (reqSet.has(m[0])) {refs.add(m[0]);}
      }
      for (const reqId of refs) {
        fileSet.add(file);
        links.push({ source: reqId, target: file, verified: false });
        const arr = refsByReq.get(reqId) ?? [];
        arr.push(file);
        refsByReq.set(reqId, arr);
      }
    }
  }
  return { requirementIds, fileIds: [...fileSet].sort(), links, refsByReq };
}

const DECL_RE =
  /(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)|(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)|(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/;

/**
 * Build symbol-level traceability links for impact analysis: each requirement
 * is linked to the specific class/function that implements it (resolved from a
 * preceding `// Implements: REQ-…` comment or an in-body reference), rather than
 * to the whole file. This stops requirements that merely share a file from being
 * reported as impacting one another. Falls back to a file-level link when no
 * enclosing symbol can be resolved.
 */
export function buildSymbolTraceLinks(
  specsFile: string,
  srcDir: string,
): Array<{ source: string; target: string }> {
  const reqSet = new Set(buildCodeTraceData(specsFile, srcDir).requirementIds);
  if (reqSet.size === 0 || !existsSync(srcDir)) {return [];}

  const links: Array<{ source: string; target: string }> = [];
  const seen = new Set<string>();
  const addLink = (source: string, target: string): void => {
    const key = `${source}\t${target}`;
    if (!seen.has(key)) { seen.add(key); links.push({ source, target }); }
  };

  for (const file of collectFiles(srcDir, (ext) => ext in EXT_TO_LANG)) {
    let code: string;
    try {
      code = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const lines = code.split('\n');
    let currentSymbol: string | null = null;
    let pending: string[] = []; // req ids from comments awaiting the next declaration
    for (const raw of lines) {
      const line = raw.trim();
      const idsHere = [...raw.matchAll(REQ_ID_RE)].map((m) => m[0]).filter((id) => reqSet.has(id));
      const decl = DECL_RE.exec(raw);
      if (decl) {
        const symbol = `${file}::${decl[1] ?? decl[2] ?? decl[3]}`;
        currentSymbol = symbol;
        for (const id of [...pending, ...idsHere]) {addLink(id, symbol);}
        pending = [];
        continue;
      }
      if (idsHere.length === 0) {continue;}
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
        // A comment reference attaches to the declaration that follows it.
        pending.push(...idsHere);
      } else if (currentSymbol) {
        for (const id of idsHere) {addLink(id, currentSymbol);}
      } else {
        for (const id of idsHere) {addLink(id, file);}
      }
    }
    // Any comment refs with no following declaration fall back to the file.
    for (const id of pending) {addLink(id, file);}
  }
  return links;
}

function resolveTraceInputs(flags: Record<string, unknown>): { specsFile: string; srcDir: string } {
  return {
    specsFile: (flags['specs'] as string | undefined) ?? 'storage/specs/requirements.md',
    srcDir: (flags['src'] as string | undefined) ?? (existsSync('src') ? 'src' : '.'),
  };
}

export async function handleTrace(
  sub: string | undefined,
  args: string[],
  flags: Record<string, unknown> = {},
): Promise<ExitCodeValue> {
  switch (sub) {
    case 'matrix': {
      const { specsFile, srcDir } = resolveTraceInputs(flags);
      const data = buildCodeTraceData(specsFile, srcDir);
      if (data.requirementIds.length === 0) {
        console.log(`No requirements found in ${specsFile} — nothing to trace.`);
        console.log('ℹ Pass --specs <file> to point at your requirements document.');
        return ExitCode.SUCCESS;
      }
      const generator = createMatrixGenerator();
      const report = generator.generate(data.requirementIds, data.fileIds, data.links);
      console.log(generator.toMarkdown(report));
      const covered = data.requirementIds.filter((r) => (data.refsByReq.get(r)?.length ?? 0) > 0);
      const pct = Math.round((covered.length / data.requirementIds.length) * 100);
      console.log(
        `\nRequirements: ${data.requirementIds.length}, referenced in code: ${covered.length} ` +
          `(${pct}%), source files: ${data.fileIds.length} (scanned ${srcDir}).`,
      );
      return ExitCode.SUCCESS;
    }
    case 'validate': {
      // Validate that every requirement is traced to code. `--strict` fails
      // (non-zero exit) when any requirement is uncovered — useful in CI.
      const { specsFile, srcDir } = resolveTraceInputs(flags);
      const data = buildCodeTraceData(specsFile, srcDir);
      if (data.requirementIds.length === 0) {
        console.log(`No requirements found in ${specsFile} — nothing to validate.`);
        console.log('ℹ Pass --specs <file> to point at your requirements document.');
        return ExitCode.SUCCESS;
      }
      const uncovered = data.requirementIds.filter((r) => (data.refsByReq.get(r)?.length ?? 0) === 0);
      const covered = data.requirementIds.length - uncovered.length;
      console.log(`Traceability validation (${specsFile}):`);
      console.log(
        `  Requirements: ${data.requirementIds.length}, covered: ${covered}, uncovered: ${uncovered.length}`,
      );
      if (uncovered.length > 0) {
        console.log('\n  Uncovered requirements (no code reference):');
        for (const r of uncovered) {console.log(`    ✗ ${r}`);}
        const strict = flags['strict'] === true;
        console.log(
          strict
            ? '\n❌ Traceability incomplete.'
            : '\n⚠ Traceability incomplete (use --strict to fail the command).',
        );
        return strict ? ExitCode.GENERAL_ERROR : ExitCode.SUCCESS;
      }
      console.log('\n✅ All requirements are traced to code.');
      return ExitCode.SUCCESS;
    }
    case 'impact': {
      const targetId = args[0];
      if (!targetId) {
        console.error('❌ Usage: musubix trace impact <target-id> [--specs <file>] [--src <dir>]');
        return ExitCode.GENERAL_ERROR;
      }
      // Build symbol-level traceability links (requirement ↔ implementing
      // class/function) so impact analysis reflects what actually shares code,
      // not merely what shares a file.
      const { specsFile, srcDir } = resolveTraceInputs(flags);
      const links = buildSymbolTraceLinks(specsFile, srcDir);
      const analyzer = createImpactAnalyzer();
      const result = analyzer.analyze(targetId, links);
      // Separate the affected symbols (files) from affected requirements.
      const affectedReqs = result.affectedIds.filter((id) => /^REQ-[A-Z]{2,6}-\d{3}$/.test(id));
      const affectedSymbols = result.affectedIds.filter((id) => !/^REQ-[A-Z]{2,6}-\d{3}$/.test(id));
      console.log(`Impact analysis for ${targetId}:`);
      console.log(`  Level: ${result.level}`);
      console.log(`  Affected: ${result.affectedIds.length} item(s)` +
        ` (${affectedSymbols.length} symbol(s), ${affectedReqs.length} requirement(s))`);
      if (affectedSymbols.length > 0) {
        console.log('  Implementing code:');
        for (const s of affectedSymbols) {console.log(`    - ${s}`);}
      }
      if (affectedReqs.length > 0) {
        console.log('  Coupled requirements (share implementing code):');
        for (const r of affectedReqs) {console.log(`    - ${r}`);}
      }
      if (result.affectedIds.length === 0) {
        console.log(`  ℹ No trace links for '${targetId}' in ${specsFile} / ${srcDir}.`);
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log(showHelp('trace'));
      return ExitCode.SUCCESS;
  }
}

// ── Trace:verify handler ───────────────────────────────────────────────────

export async function handleTraceVerify(
  flags: Record<string, unknown> = {},
): Promise<ExitCodeValue> {
  const { specsFile, srcDir } = resolveTraceInputs(flags);
  const data = buildCodeTraceData(specsFile, srcDir);
  if (data.requirementIds.length === 0) {
    // Avoid the misleading "100% / No gaps" on an empty dataset.
    console.log(`No requirements found in ${specsFile} — nothing to verify.`);
    console.log('ℹ Coverage cannot be computed with 0 requirements (reported as N/A).');
    return ExitCode.SUCCESS;
  }
  const covered = data.requirementIds.filter((r) => (data.refsByReq.get(r)?.length ?? 0) > 0);
  const gaps = data.requirementIds.filter((r) => (data.refsByReq.get(r)?.length ?? 0) === 0);
  const pct = Math.round((covered.length / data.requirementIds.length) * 100);
  console.log(`Coverage: ${pct}%`);
  console.log(`Requirements: ${covered.length}/${data.requirementIds.length} referenced in ${srcDir}`);
  if (gaps.length > 0) {
    console.log('Gaps (requirements not referenced in code):');
    for (const id of gaps) {console.log(`  - ${id}`);}
    // `--strict` turns uncovered requirements into a failing quality gate.
    if (flags['strict'] === true) {return ExitCode.VALIDATION_ERROR;}
  } else {
    console.log('No gaps found — every requirement is referenced in code.');
  }
  return ExitCode.SUCCESS;
}

// ── Policy handler ─────────────────────────────────────────────────────────

export async function handlePolicy(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  switch (sub) {
    case 'validate': {
      const engine = new PolicyEngine();
      const context: PolicyContext = { projectPath: process.cwd() };
      const report = await engine.validateAll(context);
      console.log(`Overall: ${report.overallPass ? '✅ PASS' : '❌ FAIL'}`);
      for (const art of report.articles) {
        const icon = art.pass ? '✅' : '❌';
        console.log(`  ${icon} Article ${art.article}: ${art.name} — ${art.details}`);
      }
      if (report.violations.length > 0) {
        console.log(`Violations: ${report.violations.length}`);
      }
      return ExitCode.SUCCESS;
    }
    case 'list': {
      console.log('Constitution Articles:');
      for (const art of CONSTITUTION_ARTICLES) {
        console.log(`  Article ${art.article}: ${art.name} — ${art.description}`);
      }
      return ExitCode.SUCCESS;
    }
    case 'info': {
      const articleNum = parseInt(args[0], 10);
      if (isNaN(articleNum)) {
        console.error('❌ Usage: musubix policy info <article-number>');
        return ExitCode.GENERAL_ERROR;
      }
      const article = CONSTITUTION_ARTICLES.find((a) => a.article === articleNum);
      if (!article) {
        console.error(`❌ Unknown article: ${articleNum}`);
        return ExitCode.GENERAL_ERROR;
      }
      console.log(`Article ${article.article}: ${article.name}`);
      console.log(`  Policy ID: ${article.policyId}`);
      console.log(`  ${article.description}`);
      return ExitCode.SUCCESS;
    }
    default:
      console.log(showHelp('policy'));
      return ExitCode.SUCCESS;
  }
}

// ── Ontology handler ───────────────────────────────────────────────────────

const ONTOLOGY_STATE_FILE = '.musubix/ontology.json';

interface StoredTriple {
  subject: string;
  predicate: string;
  object: string;
}

/** Load persisted triples into a fresh store so state survives across runs. */
function loadOntologyStore(): ReturnType<typeof createOntologyStore> {
  const store = createOntologyStore();
  try {
    if (existsSync(ONTOLOGY_STATE_FILE)) {
      const triples = JSON.parse(readFileSync(ONTOLOGY_STATE_FILE, 'utf-8')) as StoredTriple[];
      store.addTriples(triples);
    }
  } catch {
    // Corrupt/unreadable — start empty.
  }
  return store;
}

function saveOntologyStore(store: ReturnType<typeof createOntologyStore>): void {
  mkdirSync(dirnamePath(ONTOLOGY_STATE_FILE), { recursive: true });
  writeFileSync(ONTOLOGY_STATE_FILE, JSON.stringify(store.getAll(), null, 2), 'utf-8');
}

export async function handleOntology(
  sub: string | undefined,
  args: string[] = [],
): Promise<ExitCodeValue> {
  switch (sub) {
    case 'add': {
      const [subject, predicate, object] = args;
      if (!subject || !predicate || !object) {
        console.error('❌ Usage: musubix ontology add <subject> <predicate> <object>');
        return ExitCode.VALIDATION_ERROR;
      }
      const store = loadOntologyStore();
      store.addTriple({ subject, predicate, object });
      saveOntologyStore(store);
      console.log(`✅ Added triple: ${subject} —[${predicate}]→ ${object}`);
      console.log(`   Total triples: ${store.size()}`);
      return ExitCode.SUCCESS;
    }
    case 'list': {
      const store = loadOntologyStore();
      const triples = store.getAll();
      if (triples.length === 0) {
        console.log('No triples stored yet. Add one with: musubix ontology add <s> <p> <o>');
      } else {
        console.log(`Triples (${triples.length}):`);
        for (const t of triples) {
          console.log(`  ${t.subject} —[${t.predicate}]→ ${t.object}`);
        }
      }
      return ExitCode.SUCCESS;
    }
    case 'validate': {
      const store = loadOntologyStore();
      const validator = createConsistencyValidator();
      const result = validator.validate(store);
      if (store.size() === 0) {
        console.log('No triples stored — nothing to validate.');
        return ExitCode.SUCCESS;
      }
      console.log(`Consistent: ${result.consistent ? '✅' : '❌'} (${store.size()} triples)`);
      if (result.violations.length > 0) {
        console.log('Violations:');
        for (const v of result.violations) {
          console.log(`  - ${JSON.stringify(v)}`);
        }
        return ExitCode.VALIDATION_ERROR;
      }
      return ExitCode.SUCCESS;
    }
    case 'stats': {
      const store = loadOntologyStore();
      console.log(`Triples: ${store.size()}`);
      return ExitCode.SUCCESS;
    }
    default:
      console.log(showHelp('ontology'));
      return ExitCode.SUCCESS;
  }
}

// ── Codegraph handler ──────────────────────────────────────────────────────

const EXT_TO_LANG: Record<string, SupportedLanguage> = {
  ts: 'typescript', js: 'javascript', py: 'python',
  java: 'java', go: 'go', rs: 'rust',
  c: 'c', cpp: 'cpp', cs: 'csharp',
  rb: 'ruby', php: 'php', swift: 'swift',
  kt: 'kotlin', scala: 'scala', hs: 'haskell', lua: 'lua',
};

const WALK_IGNORE = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', 'build']);

/**
 * Collect files from a path. A file returns itself; a directory is walked
 * recursively (skipping common vendor/build dirs). Optionally filter by
 * extension. Used by `cg index` and `security` so a directory argument works.
 */
export function collectFiles(target: string, extFilter?: (ext: string) => boolean): string[] {
  const stat = statSync(target);
  if (stat.isFile()) {return [target];}
  const out: string[] = [];
  const walk = (dir: string): void => {
    // A directory can disappear mid-scan (e.g. a temp dir removed by another
    // process); skip it rather than crashing the whole command.
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') {continue;}
      if (WALK_IGNORE.has(entry.name)) {continue;}
      const full = joinPath(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop() ?? '';
        if (!extFilter || extFilter(ext)) {out.push(full);}
      }
    }
  };
  walk(target);
  return out;
}

/**
 * Write a set of files under a base directory, creating parent dirs. Refuses to
 * overwrite the base directory if it already exists. Returns created paths.
 */
export function writeScaffold(baseDir: string, files: Record<string, string>): string[] {
  if (existsSync(baseDir)) {
    throw new Error(`Target already exists: ${baseDir}`);
  }
  const created: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const full = joinPath(baseDir, rel);
    mkdirSync(dirnamePath(full), { recursive: true });
    writeFileSync(full, content, 'utf-8');
    created.push(full);
  }
  return created;
}

/** Convert an arbitrary name into a valid JS identifier. */
export function toIdentifier(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) =>
    c ? c.toUpperCase() : '',
  );
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

const CODEGRAPH_STATE_FILE = '.musubix/codegraph.json';

/** Load a persisted code graph into a fresh engine (empty if none saved). */
function loadCodeGraph(): ReturnType<typeof createGraphEngine> {
  const engine = createGraphEngine();
  try {
    if (existsSync(CODEGRAPH_STATE_FILE)) {
      const data = JSON.parse(readFileSync(CODEGRAPH_STATE_FILE, 'utf-8')) as {
        nodes?: Array<Parameters<typeof engine.addNode>[0]>;
        edges?: Array<Parameters<typeof engine.addEdge>[0]>;
      };
      for (const node of data.nodes ?? []) {engine.addNode(node);}
      for (const edge of data.edges ?? []) {engine.addEdge(edge);}
    }
  } catch {
    // Corrupt/unreadable — start empty.
  }
  return engine;
}

function saveCodeGraph(
  nodes: Array<Parameters<ReturnType<typeof createGraphEngine>['addNode']>[0]>,
  edges: Array<Parameters<ReturnType<typeof createGraphEngine>['addEdge']>[0]> = [],
): void {
  mkdirSync(dirnamePath(CODEGRAPH_STATE_FILE), { recursive: true });
  writeFileSync(CODEGRAPH_STATE_FILE, JSON.stringify({ nodes, edges }, null, 2), 'utf-8');
}

interface StoredGraphNode {
  id: string;
  name: string;
  kind: string;
  filePath: string;
  /** For functions: true if defined with internal linkage (`static`). */
  isStatic?: boolean;
}
interface StoredGraphEdge {
  from: string;
  to: string;
  kind: string;
}

/** Read the persisted graph ({nodes, edges}) for `cg deps` / `cg impact`. */
function loadCodeGraphData(): { nodes: StoredGraphNode[]; edges: StoredGraphEdge[] } {
  try {
    if (existsSync(CODEGRAPH_STATE_FILE)) {
      const data = JSON.parse(readFileSync(CODEGRAPH_STATE_FILE, 'utf-8')) as {
        nodes?: StoredGraphNode[];
        edges?: StoredGraphEdge[];
      };
      return { nodes: data.nodes ?? [], edges: data.edges ?? [] };
    }
  } catch {
    // Corrupt/unreadable — empty graph.
  }
  return { nodes: [], edges: [] };
}

function loadCodeGraphEdges(): StoredGraphEdge[] {
  return loadCodeGraphData().edges;
}

/**
 * Resolve an import target (e.g. `auth_db\privacy\provider`) to the indexed
 * file(s) that define it. Matches by the final name segment (the parser only
 * captures short class names), then — when several files define that name —
 * prefers candidates whose path contains the import's namespace segments, so
 * common class names like `provider` are disambiguated where possible.
 * This is a heuristic: for colliding short names it may still over-match.
 */
/**
 * Standard-library method/global names that collide with user-defined names and
 * would otherwise capture every stdlib call (e.g. a lone `def super` in Django
 * absorbing every `super()`). Scoped PER CALLER LANGUAGE so a name that is a
 * builtin in one language (Rust `as_bytes`) does not suppress a genuine method
 * of the same name in another (a Python `as_bytes` helper). Resolution uses the
 * calling file's language, so C — which has no bucket — is never affected.
 */
const JS_BUILTINS = new Set<string>([
  // Array / iterable
  'map', 'filter', 'forEach', 'reduce', 'reduceRight', 'find', 'findIndex', 'some', 'every',
  'includes', 'indexOf', 'lastIndexOf', 'slice', 'splice', 'concat', 'join', 'push', 'pop',
  'shift', 'unshift', 'sort', 'reverse', 'flat', 'flatMap', 'fill', 'copyWithin', 'at',
  // Map / Set
  'set', 'get', 'has', 'add', 'delete', 'clear', 'keys', 'values', 'entries',
  // Promise
  'then', 'catch', 'finally', 'resolve', 'reject', 'all', 'allSettled', 'race', 'any',
  // String
  'split', 'replace', 'replaceAll', 'trim', 'trimStart', 'trimEnd', 'padStart', 'padEnd',
  'startsWith', 'endsWith', 'charAt', 'charCodeAt', 'codePointAt', 'substring', 'substr',
  'toUpperCase', 'toLowerCase', 'match', 'matchAll', 'search', 'repeat', 'normalize',
  // Object / function / misc
  'toString', 'valueOf', 'hasOwnProperty', 'call', 'apply', 'bind', 'assign', 'freeze',
  'stringify', 'parse', 'now', 'test', 'exec',
  // console / logging + ES class
  'log', 'error', 'warn', 'info', 'debug', 'trace', 'assert', 'super',
]);
const PY_BUILTINS = new Set<string>([
  // container / string methods
  'append', 'extend', 'insert', 'remove', 'count', 'update', 'items', 'keys', 'values',
  'get', 'pop', 'setdefault', 'strip', 'lstrip', 'rstrip', 'format', 'encode', 'decode',
  'join', 'split', 'replace', 'add', 'clear',
  // global built-in functions
  'super', 'type', 'len', 'str', 'int', 'float', 'bool', 'dict', 'list', 'set',
  'tuple', 'frozenset', 'bytes', 'bytearray', 'complex', 'object', 'range',
  'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr', 'delattr',
  'property', 'staticmethod', 'classmethod', 'repr', 'print', 'input',
  'enumerate', 'zip', 'sorted', 'reversed', 'min', 'max', 'sum', 'abs',
  'round', 'iter', 'vars', 'dir', 'hash', 'callable', 'any', 'all',
  'chr', 'ord', 'hex', 'oct', 'bin', 'divmod', 'pow', 'globals', 'locals', 'map', 'filter',
  // str/bytes methods (lowercase)
  'upper', 'lower', 'title', 'capitalize', 'swapcase', 'casefold',
  'startswith', 'endswith', 'splitlines', 'zfill', 'ljust', 'rjust', 'center',
  'expandtabs', 'translate', 'partition', 'rpartition', 'rsplit', 'rfind',
  'rindex', 'isdigit', 'isalpha', 'isalnum', 'isspace', 'islower', 'isupper',
  'istitle', 'isidentifier', 'isnumeric', 'isdecimal', 'find',
]);
const RUST_BUILTINS = new Set<string>([
  // trait / conversion / Option-Result methods. With #[derive(...)] an explicit
  // `fn clone`/`as_ref` is rare, so it resolves uniquely and captures every
  // `.clone()`/`.as_ref()` call (13% of ripgrep's edges).
  'clone', 'clone_from', 'as_ref', 'as_mut', 'as_str', 'as_bytes', 'as_slice',
  'as_path', 'as_os_str', 'to_string', 'to_owned', 'to_vec', 'into', 'into_iter',
  'unwrap', 'unwrap_or', 'unwrap_or_else', 'unwrap_or_default', 'expect',
  'borrow', 'borrow_mut', 'deref', 'deref_mut', 'collect', 'iter', 'iter_mut',
  'contains', 'contains_key', 'starts_with', 'ends_with', 'is_empty', 'len',
  'push', 'pop', 'insert', 'remove', 'get', 'get_mut', 'trim', 'trim_start', 'trim_end',
]);
const BUILTINS_BY_LANG: Record<string, Set<string>> = {
  javascript: JS_BUILTINS,
  typescript: JS_BUILTINS,
  python: PY_BUILTINS,
  rust: RUST_BUILTINS,
};

/**
 * Build the symbol→file resolution maps used by impact/export/cycles:
 *  - defFiles: resolvable symbol name → defining files (static functions have
 *    internal linkage and are excluded as cross-file targets)
 *  - filesByBasename: file basename → paths (for path-style imports)
 */
function buildResolutionMaps(
  nodes: StoredGraphNode[],
): { defFiles: Map<string, Set<string>>; filesByBasename: Map<string, Set<string>> } {
  const defFiles = new Map<string, Set<string>>();
  const filesByBasename = new Map<string, Set<string>>();
  for (const n of nodes) {
    const isResolvable =
      n.kind === 'class' ||
      n.kind === 'interface' ||
      n.kind === 'method' ||
      (n.kind === 'function' && !n.isStatic);
    if (isResolvable) {
      const set = defFiles.get(n.name) ?? new Set<string>();
      set.add(n.filePath);
      defFiles.set(n.name, set);
    }
    const base = (n.filePath.split(/[\\/]/).pop() ?? '').replace(/\.[a-z]+$/i, '');
    if (base) {
      const set = filesByBasename.get(base) ?? new Set<string>();
      set.add(n.filePath);
      filesByBasename.set(base, set);
    }
  }
  return { defFiles, filesByBasename };
}

function resolveImportToFiles(
  moduleName: string,
  defFilesByName: Map<string, Set<string>>,
  filesByBasename?: Map<string, Set<string>>,
): string[] {
  const segs = moduleName.split(/[\\/]/).filter(Boolean);
  const last = segs[segs.length - 1] ?? moduleName;
  const candidates = [...(defFilesByName.get(last) ?? defFilesByName.get(moduleName) ?? [])];
  if (candidates.length === 0 && filesByBasename) {
    // Fall back to path-style imports (e.g. `./mid`, `../auth`) whose last
    // segment names a file rather than a defined symbol.
    return [...(filesByBasename.get(last.replace(/\.[a-z]+$/i, '')) ?? [])];
  }
  if (candidates.length <= 1) {return candidates;}
  const middle = segs.slice(0, -1).map((s) => s.toLowerCase());
  if (middle.length === 0) {return candidates;}
  const scored = candidates.map((f) => {
    const parts = f.toLowerCase().split(/[\\/]/);
    const score = middle.filter((m) => parts.some((p) => p === m || p.includes(m) || m.includes(p))).length;
    return { f, score };
  });
  const max = Math.max(...scored.map((s) => s.score));
  return max > 0 ? scored.filter((s) => s.score === max).map((s) => s.f) : candidates;
}

/**
 * Resolve symbol-level edges to a deduped set of file → file dependency edges,
 * keyed `from\tto\tkind`. Shared by cg export and cg diff.
 */
function resolveFileEdges(
  nodes: StoredGraphNode[],
  edges: StoredGraphEdge[],
): Map<string, { from: string; to: string; kind: string }> {
  const { defFiles, filesByBasename } = buildResolutionMaps(nodes);
  const fileEdges = new Map<string, { from: string; to: string; kind: string }>();
  for (const e of edges) {
    for (const to of resolveImportToFiles(e.to, defFiles, filesByBasename)) {
      if (to === e.from) {continue;}
      fileEdges.set(`${e.from}\t${to}\t${e.kind}`, { from: e.from, to, kind: e.kind });
    }
  }
  return fileEdges;
}

/**
 * Find circular file dependencies: strongly-connected components (size > 1) of
 * the file-level dependency graph, via iterative Tarjan. Sorted largest-first.
 */
function findDependencyCycles(
  nodes: StoredGraphNode[],
  edges: StoredGraphEdge[],
): string[][] {
  const { defFiles, filesByBasename } = buildResolutionMaps(nodes);
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    for (const to of resolveImportToFiles(e.to, defFiles, filesByBasename)) {
      if (to === e.from) {continue;}
      const set = adj.get(e.from) ?? new Set<string>();
      set.add(to);
      adj.set(e.from, set);
    }
  }
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let idx = 0;
  const allNodes = new Set<string>([...adj.keys()]);
  for (const set of adj.values()) {for (const t of set) {allNodes.add(t);}}
  for (const start of allNodes) {
    if (index.has(start)) {continue;}
    const work: Array<{ v: string; it: Iterator<string> }> = [];
    const pushNode = (v: string) => {
      index.set(v, idx);
      low.set(v, idx);
      idx++;
      stack.push(v);
      onStack.add(v);
      work.push({ v, it: (adj.get(v) ?? new Set<string>()).values() });
    };
    pushNode(start);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const next = frame.it.next();
      if (!next.done) {
        const w = next.value;
        if (!index.has(w)) {
          pushNode(w);
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v)!, index.get(w)!));
        }
      } else {
        if (low.get(frame.v) === index.get(frame.v)) {
          const comp: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== frame.v);
          if (comp.length > 1) {sccs.push(comp);}
        }
        work.pop();
        const parent = work[work.length - 1];
        if (parent) {low.set(parent.v, Math.min(low.get(parent.v)!, low.get(frame.v)!));}
      }
    }
  }
  return sccs.sort((a, b) => b.length - a.length);
}

/** Load a persisted code graph from an arbitrary path (for cg diff). */
function loadGraphFromPath(
  path: string,
): { nodes: StoredGraphNode[]; edges: StoredGraphEdge[] } | null {
  try {
    if (!existsSync(path)) {return null;}
    const data = JSON.parse(readFileSync(path, 'utf-8')) as {
      nodes?: StoredGraphNode[];
      edges?: StoredGraphEdge[];
    };
    return { nodes: data.nodes ?? [], edges: data.edges ?? [] };
  } catch {
    return null;
  }
}

/** Detailed per-subcommand help for `cg`. */
const CG_SUBCOMMAND_HELP: Record<string, string> = {
  index:
    'musubix cg index <path>\n' +
    '  Index a file or directory into the code graph (.musubix/codegraph.json).\n' +
    '  Extracts functions, structs/classes, imports and cross-file call edges.',
  search:
    'musubix cg search <query>\n' +
    '  Find indexed symbols whose name contains <query> (case-insensitive).',
  stats:
    'musubix cg stats\n' +
    '  Summary of the indexed graph: node/edge counts, kind breakdowns, file\n' +
    '  count, and the most-called functions.',
  deps:
    'musubix cg deps [path-fragment]\n' +
    '  List outgoing dependencies (→ #include targets and function calls) per\n' +
    '  file. Call edges are annotated `name() [call]`.',
  impact:
    'musubix cg impact <path-fragment> [--direct] [--depth N] [--json]\n' +
    '  Reverse reachability: which files are affected if the target changes.\n' +
    '  Splits direct (depth-1) from indirect dependents.\n' +
    '    --direct     show only immediate (depth-1) dependents\n' +
    '    --depth N    limit transitive expansion to N hops\n' +
    '    --json       machine-readable output (for CI/automation)',
  candidates:
    'musubix cg candidates [N] [--json]\n' +
    '  Rank files by suitability for an isolated rewrite (e.g. to Rust):\n' +
    '  score = (functions + dependents) / (1 + external deps). Test files are\n' +
    '  excluded. N limits the number of rows (default 15). --json for automation.',
  path:
    'musubix cg path <from-fragment> <to-fragment> [--all] [--json]\n' +
    '  Show the shortest dependency chain from a file matching <from> to one\n' +
    '  matching <to> (over depends-on edges). Answers "why does A need B?".\n' +
    '    --all    list all shortest paths (up to 20), not just one\n' +
    '    --json   machine-readable output',
  cycles:
    'musubix cg cycles [path-fragment] [N] [--json]\n' +
    '  Detect circular file dependencies (strongly-connected components of the\n' +
    '  file-level graph with >1 member). N limits the number of cycles shown\n' +
    '  (default 20); a path-fragment restricts to cycles touching those files.\n' +
    '  --json for machine-readable output.',
  export:
    'musubix cg export [path-fragment] [--format dot|json] [--out <file>] [--cluster]\n' +
    '  Export the file-level dependency graph (symbol edges resolved to\n' +
    '  file → file). Default format dot (Graphviz), or json. Writes to <file>\n' +
    '  with --out, else stdout. A path-fragment limits it to a subgraph.\n' +
    '    --cluster    (dot only) group nodes into a subgraph per directory',
  gate:
    'musubix cg gate [--max-cycles N] [--forbid A:B[,C:D]] [--json]\n' +
    '  CI quality gate: check architectural rules against the current graph and\n' +
    '  exit non-zero on any violation.\n' +
    '    --max-cycles N   fail if dependency cycles exceed N\n' +
    "    --forbid A:B     fail if any file matching 'A' depends on one matching 'B'\n" +
    '                     (comma-separate multiple rules); --json for automation',
  diff:
    'musubix cg diff <baseline.json> [current.json] [--json]\n' +
    '  Compare two persisted graphs (.musubix/codegraph.json format) and report\n' +
    '  files and file-level dependency edges added/removed. current defaults to\n' +
    '  the working graph .musubix/codegraph.json. Useful for change-impact review.\n' +
    '  --json for machine-readable output.',
  languages:
    'musubix cg languages\n' +
    '  List the source languages the parser supports.',
};

/** Help text for `cg` — subcommand-specific when a known sub is given. */
export function cgSubcommandHelp(sub: string | undefined): string {
  if (sub && CG_SUBCOMMAND_HELP[sub]) {return CG_SUBCOMMAND_HELP[sub];}
  return (
    showHelp('cg') +
    '\n\nSubcommands: ' +
    Object.keys(CG_SUBCOMMAND_HELP).join(', ') +
    '\nRun `musubix cg <subcommand> --help` for details.'
  );
}

export async function handleCodegraph(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  switch (sub) {
    case 'index': {
      const targetPath = args[0];
      if (!targetPath) {
        console.error('❌ Usage: musubix cg index <path>');
        return ExitCode.GENERAL_ERROR;
      }
      try {
        if (!existsSync(targetPath)) {
          console.error(`❌ Path not found: ${targetPath}`);
          return ExitCode.GENERAL_ERROR;
        }
        const parser = createASTParser();
        const engine = createGraphEngine();
        // Accept a single file or a directory (recursively indexed).
        const files = collectFiles(targetPath, (ext) => ext in EXT_TO_LANG);
        if (files.length === 0) {
          console.error(`❌ No indexable source files found under: ${targetPath}`);
          return ExitCode.GENERAL_ERROR;
        }
        const savedNodes: Array<Parameters<typeof engine.addNode>[0]> = [];
        const savedEdges: Array<Parameters<typeof engine.addEdge>[0]> = [];
        // For building the cross-file call graph in a second phase, once every
        // function definition across the corpus is known.
        const fileCalls: Array<{ file: string; lang: string; calls: string[] }> = [];
        // Global (external-linkage) function name → defining files.
        const globalFnToFiles = new Map<string, Set<string>>();
        // Every function name a file defines (static or global) — a call to such
        // a name binds locally in C and must not create a cross-file edge.
        const fileDefines = new Map<string, Set<string>>();
        let indexedFiles = 0;
        for (const file of files) {
          const ext = file.split('.').pop() ?? '';
          const lang = EXT_TO_LANG[ext];
          if (!lang) {continue;}
          const content = readFileSync(file, 'utf-8');
          const nodes = parser.parse(content, lang);
          for (const node of nodes) {
            const isStatic = node.metadata?.static === true;
            const entry = {
              id: `${file}:${node.name}`,
              name: node.name,
              kind: node.kind,
              filePath: file,
              language: lang,
              startLine: node.startLine ?? 0,
              endLine: node.endLine ?? 0,
              ...(node.kind === 'function' ? { isStatic } : {}),
            };
            engine.addNode(entry);
            savedNodes.push(entry);
            if (node.kind === 'function' && node.name) {
              const defined = fileDefines.get(file) ?? new Set<string>();
              defined.add(node.name);
              fileDefines.set(file, defined);
              if (!isStatic) {
                const set = globalFnToFiles.get(node.name) ?? new Set<string>();
                set.add(file);
                globalFnToFiles.set(node.name, set);
              }
            }
            // Dependency edge: this file imports/uses the named module.
            if (node.kind === 'import' && node.name) {
              const edge = { from: file, to: node.name, kind: 'imports' as const };
              engine.addEdge(edge);
              savedEdges.push(edge);
            }
            // Flatten class method children into the graph so `obj.method()`
            // calls can resolve (methods are parsed as children of the class).
            for (const child of node.children ?? []) {
              if (child.kind !== 'method' || !child.name) {continue;}
              const mEntry = {
                id: `${file}:${node.name}.${child.name}`,
                name: child.name,
                kind: 'method' as const,
                filePath: file,
                language: lang,
                startLine: child.startLine ?? 0,
                endLine: child.endLine ?? 0,
              };
              engine.addNode(mEntry);
              savedNodes.push(mEntry);
              const defined = fileDefines.get(file) ?? new Set<string>();
              defined.add(child.name);
              fileDefines.set(file, defined);
              const set = globalFnToFiles.get(child.name) ?? new Set<string>();
              set.add(file);
              globalFnToFiles.set(child.name, set);
            }
          }
          fileCalls.push({ file, lang, calls: parser.extractCalls(content, lang) });
          indexedFiles++;
        }
        // Phase 2 — call-graph edges, resolved with C linkage rules:
        //  • a call to a name the caller itself defines binds locally (skip);
        //  • otherwise it must reach a function with external linkage — emit an
        //    edge only when exactly ONE *global* (non-static) definition exists.
        // This binds file-local `static` homonyms correctly AND still captures
        // calls to unique globals that a static homonym elsewhere used to hide.
        for (const { file, lang, calls } of fileCalls) {
          const localDefs = fileDefines.get(file);
          // Standard-library names for the CALLER's language never resolve to a
          // same-named user def (avoids `.clone()`/`super()`/`.map()` capture).
          // Languages without a bucket (C/Go/Java) are unaffected.
          const denylist = BUILTINS_BY_LANG[lang];
          for (const name of calls) {
            if (denylist?.has(name)) {continue;}
            if (localDefs?.has(name)) {continue;} // local binding (static/own def)
            const defs = globalFnToFiles.get(name);
            if (!defs || defs.size !== 1) {continue;} // undefined or ambiguous global
            const target = [...defs][0];
            if (target === file) {continue;}
            const edge = { from: file, to: name, kind: 'calls' as const };
            engine.addEdge(edge);
            savedEdges.push(edge);
          }
        }
        // Persist so `cg search` / `cg stats` / `cg deps` operate on the graph.
        // Dedupe by node id / edge triple so the reported counts match exactly
        // what is persisted (the engine dedupes by id, savedNodes did not).
        const uniqueNodes = Array.from(
          new Map(savedNodes.map((n) => [n.id, n])).values(),
        );
        const uniqueEdges = Array.from(
          new Map(savedEdges.map((e) => [`${e.from}	${e.to}	${e.kind}`, e])).values(),
        );
        saveCodeGraph(uniqueNodes, uniqueEdges);
        console.log(
          `✅ Indexed ${targetPath}: ${indexedFiles} file(s), ${uniqueNodes.length} nodes, ${uniqueEdges.length} edges`,
        );
        console.log(`   Saved to ${CODEGRAPH_STATE_FILE}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ ${msg}`);
        return ExitCode.GENERAL_ERROR;
      }
      return ExitCode.SUCCESS;
    }
    case 'search': {
      const query = args[0];
      if (!query) {
        console.error('❌ Usage: musubix cg search <query>');
        return ExitCode.GENERAL_ERROR;
      }
      const engine = loadCodeGraph();
      const search = new GraphRAGSearch(engine);
      const results = search.globalSearch(query);
      console.log(`Results for "${query}": ${results.length} found`);
      for (const r of results.slice(0, 20)) {
        const node = (r as { node?: { name?: string; filePath?: string } }).node ?? (r as { name?: string; filePath?: string });
        if (node?.name) {console.log(`  ${node.name}${node.filePath ? ` (${node.filePath})` : ''}`);}
      }
      return ExitCode.SUCCESS;
    }
    case 'stats': {
      const engine = loadCodeGraph();
      const stats = engine.getStats();
      const { nodes, edges } = loadCodeGraphData();
      console.log(`Nodes: ${stats.nodeCount}`);
      console.log(`Edges: ${stats.edgeCount}`);
      console.log(`Languages: ${[...stats.languages].join(', ') || 'none'}`);

      // Node-kind and edge-kind breakdowns.
      const nodeKinds = new Map<string, number>();
      const files = new Set<string>();
      for (const n of nodes) {
        nodeKinds.set(n.kind, (nodeKinds.get(n.kind) ?? 0) + 1);
        files.add(n.filePath);
      }
      const edgeKinds = new Map<string, number>();
      for (const e of edges) {edgeKinds.set(e.kind, (edgeKinds.get(e.kind) ?? 0) + 1);}
      console.log(`Files: ${files.size}`);
      if (nodeKinds.size > 0) {
        const parts = [...nodeKinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`);
        console.log(`Node kinds: ${parts.join(', ')}`);
      }
      if (edgeKinds.size > 0) {
        const parts = [...edgeKinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`);
        console.log(`Edge kinds: ${parts.join(', ')}`);
      }

      // Top-5 most-called functions (in-degree over `calls` edges).
      const callInDegree = new Map<string, number>();
      for (const e of edges) {
        if (e.kind === 'calls') {callInDegree.set(e.to, (callInDegree.get(e.to) ?? 0) + 1);}
      }
      const top = [...callInDegree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length > 0) {
        console.log('Top called functions:');
        for (const [name, deg] of top) {console.log(`  ${name} — ${deg} caller(s)`);}
      }
      return ExitCode.SUCCESS;
    }
    case 'candidates': {
      // Rank files by suitability for an isolated rewrite (e.g. to Rust):
      // substantive logic (functions) with few *external* dependencies to port.
      const limit = Number(args.find((a) => /^\d+$/.test(a))) || 15;
      const { nodes, edges } = loadCodeGraphData();
      if (nodes.length === 0) {
        console.log('No indexed graph. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      // Per-file metrics.
      const fnCount = new Map<string, number>();
      for (const n of nodes) {
        if (n.kind === 'function') {fnCount.set(n.filePath, (fnCount.get(n.filePath) ?? 0) + 1);}
      }
      // External dependencies = distinct call/import edges leaving the file.
      const extDeps = new Map<string, Set<string>>();
      for (const e of edges) {
        if (e.kind === 'calls' || e.kind === 'imports') {
          const set = extDeps.get(e.from) ?? new Set<string>();
          set.add(`${e.kind}:${e.to}`);
          extDeps.set(e.from, set);
        }
      }
      // Dependents = files that call functions/methods defined in this file.
      const { defFiles } = buildResolutionMaps(nodes);
      const dependents = new Map<string, Set<string>>();
      for (const e of edges) {
        if (e.kind !== 'calls') {continue;}
        const defs = defFiles.get(e.to);
        if (!defs || defs.size !== 1) {continue;}
        const target = [...defs][0];
        if (target === e.from) {continue;}
        const set = dependents.get(target) ?? new Set<string>();
        set.add(e.from);
        dependents.set(target, set);
      }
      // A file tangled in a dependency cycle is harder to extract in isolation.
      // Map each cyclic file → (its SCC size − 1) as an extraction penalty.
      const cyclePenalty = new Map<string, number>();
      for (const scc of findDependencyCycles(nodes, edges)) {
        for (const f of scc) {cyclePenalty.set(f, scc.length - 1);}
      }
      // Score: reward logic (functions) and being depended-upon; penalise the
      // external deps you would also have to port and any cycle entanglement.
      type Cand = { file: string; fns: number; deps: number; users: number; cycle: number; score: number };
      const cands: Cand[] = [];
      for (const [file, fns] of fnCount) {
        if (fns < 1 || isTestFile(file)) {continue;} // skip test/fixture files
        const deps = extDeps.get(file)?.size ?? 0;
        const users = dependents.get(file)?.size ?? 0;
        const cycle = cyclePenalty.get(file) ?? 0;
        // Self-contained + substantive + used ⇒ higher; cycle entanglement lowers.
        const score = (fns + users) / (1 + deps + cycle);
        cands.push({ file, fns, deps, users, cycle, score });
      }
      cands.sort((a, b) => b.score - a.score);
      if (args.includes('--json')) {
        console.log(JSON.stringify({
          total: cands.length,
          candidates: cands.slice(0, limit).map((c) => ({
            file: c.file, functions: c.fns, externalDeps: c.deps, dependents: c.users,
            cyclePenalty: c.cycle, score: Number(c.score.toFixed(3)),
          })),
        }, null, 2));
        return ExitCode.SUCCESS;
      }
      console.log(`Rewrite candidates (top ${Math.min(limit, cands.length)} of ${cands.length}, by self-containment × usage, minus cycle entanglement):`);
      console.log(`  ${'score'.padStart(7)}  ${'fns'.padStart(4)}  ${'deps'.padStart(4)}  ${'users'.padStart(5)}  ${'cyc'.padStart(4)}  file`);
      for (const c of cands.slice(0, limit)) {
        console.log(
          `  ${c.score.toFixed(1).padStart(7)}  ${String(c.fns).padStart(4)}  ${String(c.deps).padStart(4)}  ${String(c.users).padStart(5)}  ${String(c.cycle).padStart(4)}  ${c.file}`,
        );
      }
      return ExitCode.SUCCESS;
    }
    case 'deps': {
      // Show file → imported-module dependency edges from the persisted graph.
      const filter = args[0];
      const edges = loadCodeGraphEdges();
      if (edges.length === 0) {
        console.log('No dependency edges. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      const matched = filter ? edges.filter((e) => e.from.includes(filter)) : edges;
      if (matched.length === 0) {
        console.log(`No dependencies found${filter ? ` for '${filter}'` : ''}.`);
        return ExitCode.SUCCESS;
      }
      const byFile = new Map<string, string[]>();
      for (const e of matched) {
        const arr = byFile.get(e.from) ?? [];
        // Annotate call-graph edges so they are distinguishable from #include.
        arr.push(e.kind === 'calls' ? `${e.to}() [call]` : e.to);
        byFile.set(e.from, arr);
      }
      console.log(`Dependencies (${matched.length} edges across ${byFile.size} file(s)):`);
      for (const [file, targets] of byFile) {
        console.log(`  ${file}`);
        for (const t of [...new Set(targets)].sort()) {console.log(`    → ${t}`);}
      }
      return ExitCode.SUCCESS;
    }
    case 'impact': {
      // Transitive reverse reachability: which files are (in)directly affected
      // if the target file changes / is compromised. `--direct` limits output to
      // depth-1 (immediate) dependents, which is the actionable set for core
      // utilities whose transitive closure spans most of the codebase.
      let directOnly = args.includes('--direct');
      let maxDepth = Infinity;
      let filter: string | undefined;
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--direct') {continue;}
        if (a === '--depth') {
          const v = Number(args[++i]);
          if (Number.isFinite(v) && v >= 1) {maxDepth = Math.floor(v);}
          continue;
        }
        if (!a.startsWith('--') && filter === undefined) {filter = a;}
      }
      if (maxDepth === 1) {directOnly = true;} // depth 1 == direct
      if (!filter) {
        console.error('❌ Usage: musubix cg impact <path-fragment> [--direct] [--depth N]');
        return ExitCode.VALIDATION_ERROR;
      }
      const { nodes, edges } = loadCodeGraphData();
      if (nodes.length === 0) {
        console.log('No indexed graph. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      // Map a defined symbol name → the file(s) that define it, and each file's
      // basename → its path (for path-style imports like `./mid`).
      const { defFiles, filesByBasename } = buildResolutionMaps(nodes);
      // Reverse adjacency: definingFile → files that import it (its dependents).
      const dependents = new Map<string, Set<string>>();
      for (const e of edges) {
        for (const defFile of resolveImportToFiles(e.to, defFiles, filesByBasename)) {
          if (defFile === e.from) {continue;}
          const set = dependents.get(defFile) ?? new Set<string>();
          set.add(e.from);
          dependents.set(defFile, set);
        }
      }
      const seeds = [...new Set(nodes.map((n) => n.filePath))].filter((f) => f.includes(filter));
      if (seeds.length === 0) {
        console.log(`No indexed file matches '${filter}'.`);
        return ExitCode.SUCCESS;
      }
      const seedSet = new Set(seeds);
      // Depth-1 dependents (immediate callers/importers of the seed files).
      const direct = new Set<string>();
      for (const s of seeds) {
        for (const dep of dependents.get(s) ?? []) {
          if (!seedSet.has(dep)) {direct.add(dep);}
        }
      }
      // BFS over reverse edges, bounded by --depth (default: unbounded). Each
      // hop increases depth by one; seeds are depth 0, direct dependents depth 1.
      const affected = new Set<string>();
      const seen = new Set<string>(seeds);
      const queue: Array<[string, number]> = seeds.map((s) => [s, 0]);
      while (queue.length > 0) {
        const [f, d] = queue.shift()!;
        if (d >= maxDepth) {continue;} // do not expand past the depth limit
        for (const dep of dependents.get(f) ?? []) {
          if (seedSet.has(dep)) {continue;}
          affected.add(dep);
          if (!seen.has(dep)) {
            seen.add(dep);
            queue.push([dep, d + 1]);
          }
        }
      }
      // Indirect = transitively affected but not a direct dependent.
      const indirect = [...affected].filter((f) => !direct.has(f));

      if (args.includes('--json')) {
        console.log(JSON.stringify({
          filter,
          depth: Number.isFinite(maxDepth) ? maxDepth : null,
          seeds,
          direct: [...direct].sort(),
          indirect: directOnly ? undefined : indirect.sort(),
          total: affected.size,
          counts: { direct: direct.size, indirect: indirect.length },
        }, null, 2));
        return ExitCode.SUCCESS;
      }

      console.log(`Impact of ${seeds.length} file(s) matching '${filter}':`);
      for (const s of seeds) {console.log(`  ⦿ ${s}`);}
      if (affected.size === 0) {
        console.log('  No other indexed files depend on these (no transitive impact found).');
        return ExitCode.SUCCESS;
      }
      console.log(`\n  ${direct.size} direct dependent(s):`);
      for (const a of [...direct].sort()) {console.log(`    ← ${a}`);}
      if (directOnly) {
        if (indirect.length > 0) {
          console.log(`\n  (+${indirect.length} indirect; omitted — run without --direct to list)`);
        }
      } else if (indirect.length > 0) {
        const depthNote = Number.isFinite(maxDepth) ? ` (within depth ${maxDepth})` : '';
        console.log(`\n  ${indirect.length} indirect (transitive) dependent(s)${depthNote}:`);
        for (const a of indirect.sort()) {console.log(`    ← ${a}`);}
      }
      const scope = Number.isFinite(maxDepth) ? ` within depth ${maxDepth}` : '';
      console.log(
        `\n  Total: ${affected.size} file(s) affected${scope} (${direct.size} direct, ${indirect.length} indirect).`,
      );
      return ExitCode.SUCCESS;
    }
    case 'path': {
      // Shortest dependency chain from a file matching <from> to one matching
      // <to>, over forward (depends-on) file edges. Answers "why does A need B?"
      const asJson = args.includes('--json');
      const showAll = args.includes('--all');
      const positional = args.filter((a) => !a.startsWith('--'));
      const fromFrag = positional[0];
      const toFrag = positional[1];
      if (!fromFrag || !toFrag) {
        console.error('❌ Usage: musubix cg path <from-fragment> <to-fragment> [--all] [--json]');
        return ExitCode.VALIDATION_ERROR;
      }
      const { nodes, edges } = loadCodeGraphData();
      if (nodes.length === 0) {
        console.log('No indexed graph. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      const rels = [...resolveFileEdges(nodes, edges).values()];
      const adj = new Map<string, Set<string>>();
      for (const r of rels) {
        const set = adj.get(r.from) ?? new Set<string>();
        set.add(r.to);
        adj.set(r.from, set);
      }
      const allFiles = [...new Set(nodes.map((n) => n.filePath))];
      const froms = allFiles.filter((f) => f.includes(fromFrag));
      const isTarget = (f: string) => f.includes(toFrag);
      if (froms.length === 0) {
        console.log(`No indexed file matches '${fromFrag}'.`);
        return ExitCode.SUCCESS;
      }
      // Multi-source BFS recording distance and ALL shortest predecessors.
      const dist = new Map<string, number>();
      const preds = new Map<string, string[]>();
      const queue: string[] = [];
      for (const f of froms) { dist.set(f, 0); preds.set(f, []); queue.push(f); }
      while (queue.length > 0) {
        const f = queue.shift()!;
        const d = dist.get(f)!;
        for (const dep of adj.get(f) ?? []) {
          if (!dist.has(dep)) {
            dist.set(dep, d + 1);
            preds.set(dep, [f]);
            queue.push(dep);
          } else if (dist.get(dep) === d + 1) {
            preds.get(dep)!.push(f); // another shortest path into dep
          }
        }
      }
      // Nearest target(s) at the minimum reachable distance.
      const targets = allFiles.filter((f) => isTarget(f) && dist.has(f));
      const minDist = targets.length ? Math.min(...targets.map((f) => dist.get(f)!)) : Infinity;
      const nearest = targets.filter((f) => dist.get(f) === minDist);
      if (nearest.length === 0) {
        if (asJson) {console.log(JSON.stringify({ from: fromFrag, to: toFrag, paths: [] }, null, 2));}
        else {console.log(`No dependency path from '${fromFrag}' to '${toFrag}'.`);}
        return ExitCode.SUCCESS;
      }
      // Reconstruct shortest paths (all if --all, else one), capped.
      const CAP = showAll ? 20 : 1;
      const paths: string[][] = [];
      const build = (node: string, tail: string[]) => {
        if (paths.length >= CAP) {return;}
        const chain = [node, ...tail];
        const ps = preds.get(node) ?? [];
        if (ps.length === 0) { paths.push(chain); return; }
        for (const p of ps) {
          if (paths.length >= CAP) {return;}
          build(p, chain);
        }
      };
      for (const t of nearest) {
        if (paths.length >= CAP) {break;}
        build(t, []);
      }
      if (asJson) {
        console.log(JSON.stringify({
          from: fromFrag, to: toFrag, hops: minDist,
          paths: showAll ? paths : undefined,
          path: showAll ? undefined : paths[0],
        }, null, 2));
      } else if (showAll) {
        console.log(`${paths.length} shortest dependency path(s) (${minDist} hop(s) each):`);
        paths.forEach((p, i) => {
          console.log(`\n  Path ${i + 1}:`);
          p.forEach((f, j) => console.log(`    ${j === 0 ? '◉' : '→'} ${f}`));
        });
      } else {
        console.log(`Dependency path (${minDist} hop(s)):`);
        paths[0].forEach((f, i) => console.log(`  ${i === 0 ? '◉' : '→'} ${f}`));
      }
      return ExitCode.SUCCESS;
    }
    case 'cycles': {
      // Detect circular file dependencies: strongly-connected components of the
      // file-level graph with more than one member (Tarjan's algorithm).
      let limit = 20;
      let filter: string | undefined;
      for (const a of args) {
        if (/^\d+$/.test(a)) {limit = Number(a);}
        else if (!a.startsWith('--') && filter === undefined) {filter = a;}
      }
      const { nodes, edges } = loadCodeGraphData();
      if (nodes.length === 0) {
        console.log('No indexed graph. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      let cycles = findDependencyCycles(nodes, edges);
      if (filter) {cycles = cycles.filter((c) => c.some((f) => f.includes(filter!)));}
      if (args.includes('--json')) {
        console.log(JSON.stringify({
          count: cycles.length,
          cycles: cycles.slice(0, limit).map((c) => [...c].sort()),
        }, null, 2));
        return ExitCode.SUCCESS;
      }
      if (cycles.length === 0) {
        console.log(`No circular file dependencies found${filter ? ` matching '${filter}'` : ''}. ✅`);
        return ExitCode.SUCCESS;
      }
      const shown = cycles.slice(0, limit);
      const PER_CYCLE = 15; // cap files listed per cycle to keep output readable
      console.log(`Found ${cycles.length} dependency cycle(s)${cycles.length > shown.length ? ` (showing ${shown.length})` : ''}:`);
      shown.forEach((c, i) => {
        const sorted = [...c].sort();
        console.log(`\n  Cycle ${i + 1} (${c.length} files):`);
        for (const f of sorted.slice(0, PER_CYCLE)) {console.log(`    ↻ ${f}`);}
        if (sorted.length > PER_CYCLE) {console.log(`    … and ${sorted.length - PER_CYCLE} more`);}
      });
      return ExitCode.SUCCESS;
    }
    case 'gate': {
      // CI quality gate: evaluate architectural rules against the current graph
      // and exit non-zero on any violation.
      const asJson = args.includes('--json');
      let maxCycles: number | null = null;
      const forbidRules: Array<{ from: string; to: string }> = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--max-cycles') {
          const v = Number(args[++i]);
          if (Number.isFinite(v) && v >= 0) {maxCycles = Math.floor(v);}
        } else if (a === '--forbid') {
          for (const spec of (args[++i] ?? '').split(',')) {
            const [from, to] = spec.split(':');
            if (from && to) {forbidRules.push({ from: from.trim(), to: to.trim() });}
          }
        }
      }
      if (maxCycles === null && forbidRules.length === 0) {
        console.error('❌ Usage: musubix cg gate [--max-cycles N] [--forbid A:B[,C:D]] [--json]');
        return ExitCode.VALIDATION_ERROR;
      }
      const { nodes, edges } = loadCodeGraphData();
      if (nodes.length === 0) {
        console.log('No indexed graph. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      type Check = { rule: string; pass: boolean; detail: string; offenders?: string[] };
      const checks: Check[] = [];

      if (maxCycles !== null) {
        const cycles = findDependencyCycles(nodes, edges);
        checks.push({
          rule: `cycles ≤ ${maxCycles}`,
          pass: cycles.length <= maxCycles,
          detail: `${cycles.length} dependency cycle(s)`,
          offenders: cycles.slice(0, 5).map((c) => `[${c.length}] ${[...c].sort()[0]}, …`),
        });
      }
      if (forbidRules.length > 0) {
        const rels = [...resolveFileEdges(nodes, edges).values()];
        for (const rule of forbidRules) {
          const hits = rels.filter((e) => e.from.includes(rule.from) && e.to.includes(rule.to));
          checks.push({
            rule: `forbid ${rule.from} → ${rule.to}`,
            pass: hits.length === 0,
            detail: `${hits.length} forbidden edge(s)`,
            offenders: hits.slice(0, 10).map((e) => `${e.from} → ${e.to}`),
          });
        }
      }

      const failed = checks.filter((c) => !c.pass);
      if (asJson) {
        console.log(JSON.stringify({ passed: failed.length === 0, checks }, null, 2));
      } else {
        for (const c of checks) {
          console.log(`  ${c.pass ? '✅' : '❌'} ${c.rule} — ${c.detail}`);
          if (!c.pass) {for (const o of c.offenders ?? []) {console.log(`       ${o}`);}}
        }
        console.log(
          failed.length === 0
            ? `\n✅ Gate passed (${checks.length} check(s)).`
            : `\n❌ Gate failed: ${failed.length}/${checks.length} check(s) violated.`,
        );
      }
      return failed.length === 0 ? ExitCode.SUCCESS : ExitCode.GENERAL_ERROR;
    }
    case 'diff': {
      // Compare two persisted graphs and report file/dependency changes.
      const positional = args.filter((a) => !a.startsWith('--'));
      const baselinePath = positional[0];
      const currentPath = positional[1];
      if (!baselinePath) {
        console.error('❌ Usage: musubix cg diff <baseline.json> [current.json]');
        return ExitCode.VALIDATION_ERROR;
      }
      const baseline = loadGraphFromPath(baselinePath);
      if (!baseline) {
        console.error(`❌ Baseline graph not found or unreadable: ${baselinePath}`);
        return ExitCode.GENERAL_ERROR;
      }
      const current = currentPath ? loadGraphFromPath(currentPath) : loadCodeGraphData();
      if (!current) {
        console.error(`❌ Current graph not found or unreadable: ${currentPath}`);
        return ExitCode.GENERAL_ERROR;
      }
      if (current.nodes.length === 0) {
        console.log('Current graph is empty. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      const baseFiles = new Set(baseline.nodes.map((n) => n.filePath));
      const curFiles = new Set(current.nodes.map((n) => n.filePath));
      const filesAdded = [...curFiles].filter((f) => !baseFiles.has(f)).sort();
      const filesRemoved = [...baseFiles].filter((f) => !curFiles.has(f)).sort();

      const baseEdges = resolveFileEdges(baseline.nodes, baseline.edges);
      const curEdges = resolveFileEdges(current.nodes, current.edges);
      const fmt = (r: { from: string; to: string; kind: string }) =>
        `${r.from} → ${r.to}${r.kind === 'calls' ? ' [call]' : ''}`;
      const edgesAdded = [...curEdges.entries()].filter(([k]) => !baseEdges.has(k)).map(([, v]) => v);
      const edgesRemoved = [...baseEdges.entries()].filter(([k]) => !curEdges.has(k)).map(([, v]) => v);

      if (args.includes('--json')) {
        console.log(JSON.stringify({
          baseline: baselinePath,
          current: currentPath ?? CODEGRAPH_STATE_FILE,
          filesAdded,
          filesRemoved,
          edgesAdded,
          edgesRemoved,
          counts: {
            filesAdded: filesAdded.length,
            filesRemoved: filesRemoved.length,
            edgesAdded: edgesAdded.length,
            edgesRemoved: edgesRemoved.length,
          },
        }, null, 2));
        return ExitCode.SUCCESS;
      }

      const CAP = 25;
      const list = (label: string, items: string[]) => {
        if (items.length === 0) {return;}
        console.log(`\n  ${label} (${items.length}):`);
        for (const s of items.slice(0, CAP)) {console.log(`    ${s}`);}
        if (items.length > CAP) {console.log(`    … and ${items.length - CAP} more`);}
      };

      console.log(`Diff ${baselinePath} → ${currentPath ?? '.musubix/codegraph.json'}`);
      console.log(
        `  Files: +${filesAdded.length} / -${filesRemoved.length}` +
        `   Dependency edges: +${edgesAdded.length} / -${edgesRemoved.length}`,
      );
      list('Files added', filesAdded);
      list('Files removed', filesRemoved);
      list('Dependencies added', edgesAdded.map(fmt).sort());
      list('Dependencies removed', edgesRemoved.map(fmt).sort());
      if (
        filesAdded.length === 0 && filesRemoved.length === 0 &&
        edgesAdded.length === 0 && edgesRemoved.length === 0
      ) {
        console.log('\n  No differences. ✅');
      }
      return ExitCode.SUCCESS;
    }
    case 'export': {
      // Export a file-level dependency graph (symbol edges resolved to
      // file → file) as Graphviz DOT or JSON, to stdout or a file.
      let format = 'dot';
      let outPath: string | undefined;
      let filter: string | undefined;
      const cluster = args.includes('--cluster');
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--format') { format = (args[++i] ?? 'dot').toLowerCase(); continue; }
        if (a === '--out') { outPath = args[++i]; continue; }
        if (!a.startsWith('--') && filter === undefined) {filter = a;}
      }
      if (format !== 'dot' && format !== 'json') {
        console.error(`❌ Unknown format '${format}'. Use dot or json.`);
        return ExitCode.VALIDATION_ERROR;
      }
      const { nodes, edges } = loadCodeGraphData();
      if (nodes.length === 0) {
        console.log('No indexed graph. Run `musubix cg index <path>` first.');
        return ExitCode.SUCCESS;
      }
      // Resolution maps (same rules as `cg impact`).
      const { defFiles, filesByBasename } = buildResolutionMaps(nodes);
      // Resolve symbol edges to unique file → file edges.
      const fileEdges = new Map<string, { from: string; to: string; kind: string }>();
      for (const e of edges) {
        for (const to of resolveImportToFiles(e.to, defFiles, filesByBasename)) {
          if (to === e.from) {continue;}
          if (filter && !e.from.includes(filter) && !to.includes(filter)) {continue;}
          fileEdges.set(`${e.from}	${to}	${e.kind}`, { from: e.from, to, kind: e.kind });
        }
      }
      const rels = [...fileEdges.values()];
      const fileSet = new Set<string>();
      for (const r of rels) { fileSet.add(r.from); fileSet.add(r.to); }

      let output: string;
      if (format === 'json') {
        output = JSON.stringify({ files: [...fileSet].sort(), edges: rels }, null, 2);
      } else {
        const label = (f: string) => (f.split(/[\\/]/).pop() ?? f).replace(/"/g, '');
        const dirOf = (f: string) => {
          const i = f.replace(/\\/g, '/').lastIndexOf('/');
          return i >= 0 ? f.replace(/\\/g, '/').slice(0, i) : '.';
        };
        const lines = ['digraph codegraph {', '  rankdir=LR;', '  node [shape=box, fontsize=10];'];
        if (cluster) {
          // Group file nodes into a subgraph per directory for readability.
          const byDir = new Map<string, string[]>();
          for (const f of [...fileSet].sort()) {
            const d = dirOf(f);
            (byDir.get(d) ?? byDir.set(d, []).get(d)!).push(f);
          }
          let ci = 0;
          for (const [dir, files] of [...byDir.entries()].sort()) {
            lines.push(`  subgraph "cluster_${ci++}" {`);
            lines.push(`    label="${dir.replace(/"/g, '')}";`);
            lines.push('    style=rounded; color="#999999";');
            for (const f of files) {lines.push(`    "${f}" [label="${label(f)}"];`);}
            lines.push('  }');
          }
        } else {
          for (const f of [...fileSet].sort()) {lines.push(`  "${f}" [label="${label(f)}"];`);}
        }
        for (const r of rels) {
          const style = r.kind === 'imports' ? ' [style=dashed]' : '';
          lines.push(`  "${r.from}" -> "${r.to}"${style};`);
        }
        lines.push('}');
        output = lines.join('\n');
      }

      if (outPath) {
        writeFileSync(outPath, output, 'utf-8');
        console.log(
          `✅ Exported ${fileSet.size} file(s), ${rels.length} edge(s) as ${format} to ${outPath}`,
        );
      } else {
        console.log(output);
      }
      return ExitCode.SUCCESS;
    }
    case 'languages': {
      const parser = createASTParser();
      const langs = parser.getSupportedLanguages();
      console.log('Supported languages:');
      for (const lang of langs) {
        console.log(`  - ${lang}`);
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log(cgSubcommandHelp(sub));
      return ExitCode.SUCCESS;
  }
}

// ── Security handler ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

/** Heuristic: does this path look like test / fixture code rather than production? */
export function isTestFile(file: string): boolean {
  const p = file.replace(/\\/g, '/').toLowerCase();
  return (
    /(^|\/)(tests?|__tests__|spec|specs|fixtures?|phpunit|behat)(\/|$)/.test(p) ||
    /(\.|_)(test|spec)\.[a-z]+$/.test(p) ||
    /(^|\/)[a-z0-9_-]*_test\.[a-z]+$/.test(p) ||
    /(^|\/)test[a-z0-9_-]*\.[a-z]+$/.test(p)
  );
}

/** Third-party / generated files that shouldn't be audited as the user's code. */
export function isVendorOrMinified(file: string): boolean {
  const p = file.replace(/\\/g, '/').toLowerCase();
  return (
    /\.min\.(js|css|mjs)$/.test(p) ||
    /\.bundle\.(js|css)$/.test(p) ||
    /(^|\/)(node_modules|vendor|third_party|third-party|bower_components|dist|build)(\/)/.test(p)
  );
}

export async function handleSecurity(
  filePath: string,
  failOn?: string,
  excludeTests?: boolean,
): Promise<ExitCodeValue> {
  try {
    if (!existsSync(filePath)) {
      console.error(`❌ Path not found: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const secrets = createSecretDetector();
    const taint = new TaintAnalyzer();
    const dataflow = new TaintDataflowAnalyzer();
    const deps = new DependencyScanner();

    // Accept a single file or a directory (recursively scanned). Vendored and
    // minified third-party files are always skipped (they aren't the user's code
    // and dominate the noise, e.g. bundled jquery/select2).
    const allFiles = collectFiles(filePath, (ext) => ext in EXT_TO_LANG)
      .filter((f) => !isVendorOrMinified(f));
    const files = excludeTests ? allFiles.filter((f) => !isTestFile(f)) : allFiles;
    const skipped = allFiles.length - files.length;
    const rawFindings: SecurityFinding[] = [];
    for (const file of files) {
      const code = readFileSync(file, 'utf-8');
      rawFindings.push(
        ...secrets.scan(code, file),
        ...taint.analyze(code, file),
        ...dataflow.analyze(code, file),
        ...deps.scan(code, file),
      );
    }

    // Several detectors can flag the same issue (e.g. the taint and dataflow
    // analysers both report one SQL injection). Collapse duplicates by
    // (file, line, type), keeping the highest-confidence finding.
    const dedup = new Map<string, SecurityFinding>();
    for (const f of rawFindings) {
      const key = `${f.location.file}:${f.location.line ?? 0}:${f.type}`;
      const prev = dedup.get(key);
      if (!prev || f.confidence > prev.confidence) {dedup.set(key, f);}
    }
    const findings = [...dedup.values()];

    const bySeverity = new Map<Severity, SecurityFinding[]>();
    for (const f of findings) {
      const list = bySeverity.get(f.severity) ?? [];
      list.push(f);
      bySeverity.set(f.severity, list);
    }

    console.log(
      `Security scan: ${filePath} (${files.length} file(s)` +
        (skipped > 0 ? `, ${skipped} test file(s) skipped` : '') + ')',
    );
    console.log(`Total findings: ${findings.length}`);

    for (const sev of SEVERITY_ORDER) {
      const items = bySeverity.get(sev);
      if (items && items.length > 0) {
        console.log(`\n  ${sev.toUpperCase()} (${items.length}):`);
        for (const f of items) {
          console.log(`    - ${f.description} (${f.location.file}:${f.location.line})`);
        }
      }
    }

    // Opt-in quality gate: fail when findings at/above the threshold exist.
    if (failOn) {
      const threshold = failOn.toLowerCase() as Severity;
      if (!SEVERITY_ORDER.includes(threshold)) {
        console.error(`❌ Invalid --fail-on severity: ${failOn} (use critical|high|medium|low|info)`);
        return ExitCode.VALIDATION_ERROR;
      }
      const maxIdx = SEVERITY_ORDER.indexOf(threshold);
      const gating = findings.filter((f) => SEVERITY_ORDER.indexOf(f.severity) <= maxIdx);
      if (gating.length > 0) {
        console.error(`\n❌ ${gating.length} finding(s) at or above "${threshold}" — failing.`);
        return ExitCode.VALIDATION_ERROR;
      }
    }

    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

// ── Workflow handler ───────────────────────────────────────────────────────

const WORKFLOW_STATE_FILE = '.musubix/workflow-state.json';

/** Load persisted workflow state into a tracker (no-op if none saved). */
function loadWorkflowState(tracker: ReturnType<typeof createStateTracker>): void {
  try {
    if (existsSync(WORKFLOW_STATE_FILE)) {
      tracker.restore(JSON.parse(readFileSync(WORKFLOW_STATE_FILE, 'utf-8')));
    }
  } catch {
    // Corrupt/unreadable state — start fresh.
  }
}

/** Persist workflow state so approvals/transitions survive across invocations. */
function saveWorkflowState(tracker: ReturnType<typeof createStateTracker>): void {
  mkdirSync(dirnamePath(WORKFLOW_STATE_FILE), { recursive: true });
  writeFileSync(WORKFLOW_STATE_FILE, JSON.stringify(tracker.toJSON(), null, 2), 'utf-8');
}

export async function handleWorkflow(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  const tracker = createStateTracker();
  loadWorkflowState(tracker);
  const controller = createPhaseController(tracker);

  switch (sub) {
    case 'status': {
      const state = tracker.getState();
      console.log(`Current phase: ${state.currentPhase}`);
      console.log('Phase approvals:');
      for (const phase of PHASE_ORDER) {
        const approved = tracker.isApproved(phase);
        const icon = approved ? '✅' : '⬜';
        console.log(`  ${icon} ${phase}`);
      }
      return ExitCode.SUCCESS;
    }
    case 'approve': {
      const phase = args[0] as WorkflowPhase;
      if (!phase) {
        console.error('❌ Usage: musubix workflow approve <phase>');
        return ExitCode.GENERAL_ERROR;
      }
      tracker.approve(phase);
      saveWorkflowState(tracker);
      console.log(`✅ Approved: ${phase}`);
      return ExitCode.SUCCESS;
    }
    case 'transition': {
      const phase = args[0] as WorkflowPhase;
      if (!phase) {
        console.error('❌ Usage: musubix workflow transition <phase>');
        return ExitCode.GENERAL_ERROR;
      }
      const result = await controller.transitionTo(phase);
      if (result.success) {
        saveWorkflowState(tracker);
        console.log(`✅ Transitioned: ${result.fromPhase} → ${result.toPhase}`);
      } else {
        console.error(`❌ Transition failed: ${result.errors.join(', ')}`);
        return ExitCode.PHASE_BLOCKED;
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log(showHelp('workflow'));
      return ExitCode.SUCCESS;
  }
}

// ── Status handler ─────────────────────────────────────────────────────────

export async function handleStatus(): Promise<ExitCodeValue> {
  const tracker = createStateTracker();
  loadWorkflowState(tracker);
  const controller = createPhaseController(tracker);

  console.log('=== MUSUBIX2 Project Status ===\n');

  const currentPhase = controller.getCurrentPhase();
  const nextPhase = controller.getNextPhase();
  console.log(`Workflow: ${currentPhase}${nextPhase ? ` → next: ${nextPhase}` : ' (final)'}`);

  console.log(`\nConstitution: ${CONSTITUTION_ARTICLES.length} articles`);
  for (const art of CONSTITUTION_ARTICLES) {
    console.log(`  Article ${art.article}: ${art.name}`);
  }

  return ExitCode.SUCCESS;
}

// ── Requirements / Design / Codegen handlers (Group A) ─────────────────────

import {
  createEARSValidator,
  MarkdownEARSParser,
  createRequirementWizard,
  createDesignGenerator,
  createC4ModelGenerator,
  createSOLIDValidator,
  createCodeGenerator,
  createUnitTestGenerator,
  createRequirementsInterviewer,
  createRequirementsDocGenerator,
  deriveMethodSignature,
  type RequirementsInterviewer as RequirementsInterviewerType,
} from '@musubix2/core';

export async function handleReqValidate(filePath: string): Promise<ExitCodeValue> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parser = new MarkdownEARSParser();
    const requirements = parser.parse(content);
    const validator = createEARSValidator();

    let hasIssues = false;
    for (const req of requirements) {
      const analysis = validator.analyze(req.text);
      const validation = validator.validate(req.text);
      console.log(`${req.id}: pattern=${analysis.pattern}, confidence=${analysis.confidence.toFixed(2)}`);
      if (!validation.valid) {
        hasIssues = true;
        for (const issue of validation.issues) {
          console.log(`  ⚠ ${issue}`);
        }
      }
    }

    if (requirements.length === 0) {
      console.log('No requirements found in file');
      // Diagnose the common cause: REQ- tokens present but not in the required
      // heading form. Silent failure here is a frequent first-run pitfall.
      if (/REQ-/i.test(content)) {
        const headingLike = /^#{1,4}\s+REQ-[A-Z]{2,6}-\d{3}:/m.test(content);
        console.error(
          '⚠ Found "REQ-" text but no parseable requirements. ' +
            'Requirements must be Markdown headings shaped like:',
        );
        console.error('    ## REQ-XXX-000: <title>   (XXX = 2–6 letter domain code)');
        console.error('    **要件**:');
        console.error('    THE システム SHALL ...');
        if (!headingLike) {
          console.error(
            'ℹ Hint: list items (e.g. "- REQ-001: ...") and IDs without a ' +
              '2–6 letter domain code are not recognized.',
          );
        }
        return ExitCode.VALIDATION_ERROR;
      }
    }
    return hasIssues ? ExitCode.VALIDATION_ERROR : ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export async function handleReqWizard(): Promise<ExitCodeValue> {
  try {
    const wizard = createRequirementWizard();
    const steps = wizard.getSteps();
    console.log('🧙 Requirements Creation Wizard');
    console.log('Interactive mode — follow these steps to create a requirement:\n');
    for (let i = 0; i < steps.length; i++) {
      console.log(`  ${i + 1}. ${steps[i].prompt}`);
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

// Singleton interviewer for session persistence across CLI calls
let _interviewer: RequirementsInterviewerType | null = null;
function getInterviewer(): RequirementsInterviewerType {
  if (!_interviewer) {_interviewer = createRequirementsInterviewer();}
  return _interviewer;
}

export async function handleReqInterview(args: Record<string, unknown>): Promise<ExitCodeValue> {
  try {
    const interviewer = getInterviewer();

    // --reset: Reset interview state
    if (args['reset'] === true) {
      _interviewer = createRequirementsInterviewer();
      console.log('🔄 Interview state reset.');
      return ExitCode.SUCCESS;
    }

    // --state: Show current state
    if (args['state'] === true) {
      const state = interviewer.getState();
      console.log('📋 Interview State:');
      console.log(`  Completion: ${state.completionPercentage}%`);
      console.log(`  Complete: ${state.isComplete}`);
      console.log(`  Answered: ${state.answeredQuestions.length} questions`);
      if (state.missingRequired.length > 0) {
        console.log(`  Missing required: ${state.missingRequired.join(', ')}`);
      }
      if (state.currentQuestion) {
        console.log(`  Current question: ${state.currentQuestion.question}`);
      }
      return ExitCode.SUCCESS;
    }

    // --generate: Force generate from current state
    if (args['generate'] === true) {
      const state = interviewer.getState();
      const generator = createRequirementsDocGenerator();
      const doc = generator.generate(state.context);
      console.log(doc.markdown);
      return ExitCode.SUCCESS;
    }

    // --answer <question-id> <response>: Answer a question
    if (args['answer'] === true || typeof args['answer'] === 'string') {
      const positionalArgs = (args['args'] as string[] | undefined) ?? [];
      const questionId = typeof args['answer'] === 'string'
        ? args['answer']
        : (args['subcommand'] as string | undefined) ?? positionalArgs[0];
      const response = typeof args['answer'] === 'string'
        ? positionalArgs.join(' ')
        : positionalArgs.slice(1).join(' ');

      if (!questionId || !response) {
        console.error('❌ Usage: musubix req:interview --answer <question-id> <response>');
        return ExitCode.GENERAL_ERROR;
      }

      const result = interviewer.answer(questionId, response);
      if (result.status === 'complete') {
        console.log('✅ Interview complete! All required info gathered.');
        console.log('   Run `musubix req:interview --generate` to generate the spec.');
      } else {
        console.log(`📝 Next question (${result.state.completionPercentage}% complete):`);
        console.log(`   ${result.question.question}`);
        if (result.question.hint) {
          console.log(`   💡 ${result.question.hint}`);
        }
      }
      return ExitCode.SUCCESS;
    }

    // Default: analyze input text and start interview
    const positionalArgs = (args['args'] as string[] | undefined) ?? [];
    const inputText = (args['subcommand'] as string | undefined)
      ? [(args['subcommand'] as string), ...positionalArgs].join(' ')
      : positionalArgs.join(' ');

    if (!inputText) {
      console.log('🎤 Requirements Interview (1問1答)');
      console.log('');
      console.log('Usage:');
      console.log('  musubix req:interview <input-text>             Analyze input, get first question');
      console.log('  musubix req:interview --answer <id> <response> Answer a question');
      console.log('  musubix req:interview --state                  Show interview state');
      console.log('  musubix req:interview --generate               Generate requirements doc');
      console.log('  musubix req:interview --reset                  Reset interview');
      return ExitCode.SUCCESS;
    }

    const result = interviewer.analyzeInput(inputText);
    if (result.status === 'complete') {
      console.log('✅ Sufficient info gathered! Generating requirements...');
      const generator = createRequirementsDocGenerator();
      const doc = generator.generate(result.context);
      console.log(doc.markdown);
    } else {
      console.log(`📝 Question (${result.state.completionPercentage}% complete):`);
      console.log(`   ${result.question.question}`);
      if (result.question.hint) {
        console.log(`   💡 ${result.question.hint}`);
      }
      if (result.question.choices) {
        console.log(`   選択肢: ${result.question.choices.join(' | ')}`);
      }
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export async function handleDesignGenerate(
  filePath: string,
  outPath?: string,
): Promise<ExitCodeValue> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parser = new MarkdownEARSParser();
    const requirements = parser.parse(content);
    const generator = createDesignGenerator();
    const mapped = requirements.map((r) => ({
      id: r.id,
      title: r.title,
      text: r.text,
      pattern: r.pattern ?? 'ubiquitous',
    }));
    const design = generator.generate(mapped);
    if (outPath) {
      // Write a reusable JSON design artifact. It carries the DesignDocument
      // (`sections`, consumed by `design:verify`) plus a derived C4 model
      // (`elements`/`relationships`, consumed by `design:c4`), so the SDD
      // pipeline can flow requirements → design → verify/c4.
      const c4 = deriveC4FromRequirements(content);
      const artifact = { ...design, elements: c4.elements, relationships: c4.relationships };
      writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n', 'utf-8');
      console.log(`✅ Wrote design artifact: ${outPath} (${design.sections.length} section(s))`);
      console.log(`   Next: musubix design:verify ${outPath}  |  musubix design:c4 ${outPath}`);
      return ExitCode.SUCCESS;
    }
    console.log(`Design: ${design.title} (v${design.version})`);
    for (const section of design.sections) {
      console.log(`\n## ${section.title}`);
      console.log(`Requirements: ${section.requirementIds.join(', ')}`);
      if (section.responsibilities.length > 0) {
        console.log('\nResponsibilities:');
        for (const r of section.responsibilities) {console.log(`  - ${r}`);}
      }
      if (section.components.length > 0) {
        console.log('\nComponents:');
        for (const c of section.components) {
          const sigs = c.methods.map((m) => `${m.name}(${m.params}): ${m.returnType}`).join(', ');
          console.log(`  - ${c.name} — ${c.responsibility}`);
          if (sigs) {console.log(`      methods: ${sigs}`);}
        }
      }
      if (section.interfaces.length > 0) {
        console.log(`\nInterfaces: ${section.interfaces.join(', ')}`);
      }
      if (section.patterns.length > 0) {
        console.log(`Patterns: ${section.patterns.join(', ')}`);
      }
      if (section.dataEntities.length > 0) {
        console.log(`Data entities: ${section.dataEntities.join(', ')}`);
      }
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

/** Derive a plausible C4 model from a Markdown EARS requirements document. */
function deriveC4FromRequirements(content: string): {
  title: string;
  elements: Array<Record<string, unknown>>;
  relationships: Array<Record<string, unknown>>;
} {
  const reqRe = /^#{1,4}\s+(REQ-([A-Z]{2,6})-\d{3}):\s*(.*)$/gm;
  const reqs: Array<{ id: string; domain: string; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = reqRe.exec(content)) !== null) {
    reqs.push({ id: m[1], domain: m[2], title: m[3].trim() });
  }
  const domains = [...new Set(reqs.map((r) => r.domain))];
  const elements: Array<Record<string, unknown>> = [
    { id: 'user', name: 'User', type: 'person', description: 'A user of the system' },
    { id: 'system', name: 'System', type: 'system', description: `Covers ${reqs.length} requirement(s)` },
  ];
  const relationships: Array<Record<string, unknown>> = [
    { from: 'user', to: 'system', description: 'Uses' },
  ];
  for (const d of domains) {
    elements.push({ id: d, name: `${d} Service`, type: 'container', description: `Handles ${d} requirements` });
    relationships.push({ from: 'system', to: d, description: 'contains' });
  }
  for (const r of reqs) {
    elements.push({ id: r.id, name: r.title || r.id, type: 'component', description: r.id });
    relationships.push({ from: r.domain, to: r.id, description: 'implements' });
  }
  return { title: 'System Architecture', elements, relationships };
}

export async function handleDesignC4(
  filePath: string,
  level: string = 'context',
): Promise<ExitCodeValue> {
  try {
    if (!existsSync(filePath)) {
      console.error(`❌ Path not found: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const content = readFileSync(filePath, 'utf-8');
    let data: {
      title?: string;
      elements?: Array<Record<string, unknown>>;
      relationships?: Array<Record<string, unknown>>;
    };
    if (content.trimStart().startsWith('{')) {
      data = JSON.parse(content); // explicit C4 model JSON
    } else if (/^#{1,4}\s+REQ-[A-Z]{2,6}-\d{3}/m.test(content)) {
      data = deriveC4FromRequirements(content); // Markdown requirements → C4 model
    } else {
      console.error(
        '❌ design:c4 expects a JSON C4 model {title, elements, relationships} ' +
        'or a Markdown requirements file (## REQ-XXX-000: …).',
      );
      return ExitCode.VALIDATION_ERROR;
    }
    const generator = createC4ModelGenerator();

    for (const el of data.elements ?? []) {
      generator.addElement(el as unknown as Parameters<typeof generator.addElement>[0]);
    }
    for (const rel of data.relationships ?? []) {
      generator.addRelationship(rel as unknown as Parameters<typeof generator.addRelationship>[0]);
    }

    const c4Level = level as 'context' | 'container' | 'component' | 'code';
    const diagram = generator.generateDiagram(c4Level, data.title ?? 'System');
    const mermaid = generator.toMermaid(diagram);
    console.log(mermaid);
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export async function handleDesignVerify(filePath: string): Promise<ExitCodeValue> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const design = JSON.parse(content) as Parameters<
      ReturnType<typeof createSOLIDValidator>['validate']
    >[0];
    const validator = createSOLIDValidator();
    const report = validator.validate(design);

    if (report.violations.length === 0) {
      console.log('✅ All SOLID principles satisfied');
      console.log(`Score: ${report.score}/100`);
      return ExitCode.SUCCESS;
    }

    console.log(`SOLID score: ${report.score}/100`);
    for (const v of report.violations) {
      console.log(`  ⚠ [${v.principle}] ${v.message}`);
    }
    return ExitCode.VALIDATION_ERROR;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

/** Turn an arbitrary string into a PascalCase identifier suitable for a type. */
function toPascalCase(s: string): string {
  const parts = s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal || 'Component';
}

/**
 * Extract code-generation targets from a design artifact or requirements file:
 *  - a design JSON with `elements` → one class per component/container element
 *  - a Markdown requirements doc → one class per requirement (named from title)
 */
interface CodegenMethod {
  name: string;
  params: string;
  returnType: string;
}
interface CodegenTarget {
  name: string;
  type: string;
  methods: CodegenMethod[];
  /** Requirement IDs this target realises, emitted as a traceability comment. */
  requirementIds: string[];
  /** Design patterns (from the section) to scaffold into the generated class. */
  patterns: string[];
  /** State names inferred from WHILE clauses (for a State-pattern enum). */
  states: string[];
}

function extractCodegenTargets(content: string): CodegenTarget[] {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(content) as {
        elements?: Array<{ id?: string; name?: string; type?: string; description?: string }>;
        sections?: Array<{
          id?: string;
          title?: string;
          requirementIds?: string[];
          patterns?: string[];
          components?: Array<{ name?: string; methods?: CodegenMethod[]; requirementIds?: string[]; states?: string[] }>;
        }>;
      };
      // Prefer the design document's components — they carry method signatures
      // derived from the requirements, plus the section's detected design
      // patterns, so the skeleton reflects the intended structure.
      const comps = (data.sections ?? []).flatMap((s) =>
        (s.components ?? []).map((c) => ({ c, patterns: s.patterns ?? [] })),
      );
      if (comps.length > 0) {
        return comps.map(({ c, patterns }) => ({
          name: toPascalCase(c.name ?? 'Component'),
          type: 'class',
          methods: c.methods ?? [],
          requirementIds: c.requirementIds ?? [],
          patterns,
          states: c.states ?? [],
        }));
      }
      const els = (data.elements ?? []).filter((e) => e.type === 'component' || e.type === 'container');
      if (els.length > 0) {
        return els.map((e) => ({
          name: toPascalCase(e.name ?? e.id ?? 'Component'),
          type: 'class',
          methods: [],
          // A C4 component whose id is a requirement id carries its own trace.
          requirementIds: /^REQ-[A-Z]{2,6}-\d{3}$/.test(e.id ?? '') ? [e.id as string] : [],
          patterns: [],
          states: [],
        }));
      }
      if (data.sections?.length) {
        return data.sections.map((s) => ({
          name: toPascalCase(s.title ?? s.id ?? 'Section'),
          type: 'class',
          methods: [],
          requirementIds: s.requirementIds ?? [],
          patterns: s.patterns ?? [],
          states: [],
        }));
      }
    } catch {
      /* fall through */
    }
    return [];
  }
  // Markdown requirements → one class per requirement, with a method derived
  // from the requirement's SHALL clause (e.g. "SHALL create a user account"
  // → createUserAccount()).
  const parser = new MarkdownEARSParser();
  const targets: CodegenTarget[] = [];
  for (const req of parser.parse(content)) {
    targets.push({
      name: toPascalCase(req.title || req.id),
      type: 'class',
      methods: [deriveMethodSignature(req.text, req.title)],
      requirementIds: [req.id],
      patterns: [],
      states: [],
    });
  }
  return targets;
}

/** TypeScript builtins / library types that never need a generated declaration. */
const BUILTIN_RETURN_TYPES = new Set([
  'void', 'boolean', 'string', 'number', 'bigint', 'symbol', 'unknown', 'any',
  'never', 'object', 'undefined', 'null', 'Date', 'Promise', 'Array',
]);

/** Emit placeholder `interface` declarations for inferred entity return types. */
function renderEntityTypeStubs(targets: CodegenTarget[]): string[] {
  const types = new Set<string>();
  for (const t of targets) {
    for (const m of t.methods) {
      const base = m.returnType.replace(/\[\]$/, '').trim();
      if (/^[A-Z][A-Za-z0-9]*$/.test(base) && !BUILTIN_RETURN_TYPES.has(base)) {
        types.add(base);
      }
    }
  }
  return [...types].sort().map((t) => `export interface ${t} {\n  // TODO: define the ${t} shape\n}`);
}

export async function handleCodegen(
  nameOrFile: string,
  type: string = 'class',
  outPath?: string,
): Promise<ExitCodeValue> {
  try {
    const generator = createCodeGenerator();
    // A design artifact / requirements file → generate a skeleton per component.
    if (existsSync(nameOrFile) && statSync(nameOrFile).isFile()) {
      const content = readFileSync(nameOrFile, 'utf-8');
      const targets = extractCodegenTargets(content);
      if (targets.length === 0) {
        console.error(
          `❌ No components or requirements found in ${nameOrFile}. ` +
          'Pass a design JSON (with elements/sections) or a Markdown requirements file.',
        );
        return ExitCode.VALIDATION_ERROR;
      }
      const blocks: string[] = [];
      for (const t of targets) {
        const result = generator.generate({
          templateType: t.type as Parameters<typeof generator.generate>[0]['templateType'],
          name: t.name,
          methods: t.methods.length > 0 ? t.methods : undefined,
          patterns: t.patterns.length > 0 ? t.patterns : undefined,
          states: t.states.length > 0 ? t.states : undefined,
          // Extract an interface only for a cohesive multi-operation service;
          // a single-method class stays concrete (Anti-Abstraction, Article VIII).
          interfaceName: t.methods.length >= 2 ? `I${t.name}` : undefined,
        });
        // Emit a traceability comment (Article V) so `trace matrix` can link the
        // generated code back to the requirement(s) it implements.
        const trace = t.requirementIds.length > 0
          ? `// Implements: ${t.requirementIds.join(', ')}\n`
          : '';
        blocks.push(trace + result.code);
      }
      // Declare placeholder types for inferred entity return types (e.g. a
      // "SHALL issue a session token" → `issue(): SessionToken`) so the emitted
      // file type-checks instead of referencing undeclared names.
      const entityDecls = renderEntityTypeStubs(targets);
      const code = [...entityDecls, ...blocks].join('\n\n');
      if (outPath) {
        // Write a single source file so it can be fed straight into `test:gen`.
        writeFileSync(outPath, code + '\n', 'utf-8');
        console.error(`✅ Wrote ${targets.length} skeleton(s) to ${outPath}`);
        console.error(`   Next: musubix test:gen ${outPath}`);
        return ExitCode.SUCCESS;
      }
      for (const block of blocks) {
        console.log(block);
        console.log('');
      }
      console.error(`✅ Generated ${targets.length} skeleton(s) from ${nameOrFile}`);
      return ExitCode.SUCCESS;
    }
    // A plain identifier → one skeleton (kept as-is if already valid).
    const safeName = /^[A-Za-z_$][\w$]*$/.test(nameOrFile) ? nameOrFile : toPascalCase(nameOrFile);
    const result = generator.generate({
      templateType: type as Parameters<typeof generator.generate>[0]['templateType'],
      name: safeName,
    });
    if (outPath) {
      writeFileSync(outPath, result.code + '\n', 'utf-8');
      console.error(`✅ Wrote skeleton to ${outPath}`);
      console.error(`   Next: musubix test:gen ${outPath}`);
      return ExitCode.SUCCESS;
    }
    console.log(result.code);
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export async function handleTestGen(filePath: string): Promise<ExitCodeValue> {
  try {
    if (!existsSync(filePath)) {
      console.error(`❌ Path not found: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const generator = createUnitTestGenerator();
    // Accept a single file or a directory (skeletons generated per file).
    const files = collectFiles(filePath, (ext) => ext in EXT_TO_LANG);
    if (files.length === 0) {
      console.error(`❌ No source files found under: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const single = files.length === 1;
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const suite = generator.generate(content, 'unit');
      if (!single) {console.log(`// ── ${file} ──────────────────────────────`);}
      console.log(suite.code);
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

// ── Skills handler ─────────────────────────────────────────────────────────

export async function handleSkills(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  const { createSkillManager } = await import('@musubix2/skill-manager');
  const manager = createSkillManager();

  switch (sub) {
    case 'list': {
      const skills = manager.getAvailableSkills();
      if (skills.length === 0) {
        console.log('No skills registered');
      } else {
        console.log('Registered skills:');
        for (const skill of skills) {
          console.log(`  ${skill.metadata.name}`);
        }
      }
      return ExitCode.SUCCESS;
    }
    case 'validate': {
      const path = args[0];
      if (!path) {
        console.error('❌ Usage: musubix skills validate <path>');
        return ExitCode.GENERAL_ERROR;
      }
      try {
        const content = readFileSync(path, 'utf-8');
        const definition = JSON.parse(content) as Record<string, unknown>;
        const errors: string[] = [];
        if (!definition['name']) {errors.push('Missing required field: name');}
        if (!definition['description']) {errors.push('Missing required field: description');}
        if (!definition['action']) {errors.push('Missing required field: action');}
        if (errors.length > 0) {
          for (const e of errors) {console.error(`  ❌ ${e}`);}
          return ExitCode.VALIDATION_ERROR;
        }
        console.log(`✅ Skill definition valid: ${definition['name']}`);
        return ExitCode.SUCCESS;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ ${msg}`);
        return ExitCode.GENERAL_ERROR;
      }
    }
    case 'create': {
      const name = args[0];
      if (!name) {
        console.error('❌ Usage: musubix skills create <name>');
        return ExitCode.GENERAL_ERROR;
      }
      // Actually write the scaffold to disk (previously only printed a tree).
      const dir = name;
      if (existsSync(dir)) {
        console.error(`❌ '${dir}' already exists.`);
        return ExitCode.GENERAL_ERROR;
      }
      mkdirSync(joinPath(dir, 'tests'), { recursive: true });
      const skillJson = {
        name,
        description: `TODO: describe the ${name} skill`,
        action: 'run',
        version: '0.1.0',
      };
      writeFileSync(joinPath(dir, 'skill.json'), JSON.stringify(skillJson, null, 2) + '\n', 'utf-8');
      writeFileSync(
        joinPath(dir, 'index.ts'),
        `export const ${toIdentifier(name)} = {\n` +
          `  name: ${JSON.stringify(name)},\n` +
          '  run(): void {\n    // TODO: implement\n  },\n};\n',
        'utf-8',
      );
      writeFileSync(
        joinPath(dir, 'tests', 'index.test.ts'),
        'import { describe, it, expect } from \'vitest\';\n\n' +
          `describe(${JSON.stringify(name)}, () => {\n` +
          '  it(\'is a placeholder\', () => {\n    expect(true).toBe(true);\n  });\n});\n',
        'utf-8',
      );
      console.log(`✅ Scaffolded skill at ${dir}/`);
      console.log(`  ${dir}/skill.json, ${dir}/index.ts, ${dir}/tests/index.test.ts`);
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix skills <list|validate|create> [args]');
      return ExitCode.SUCCESS;
  }
}


// ── Knowledge handler ──────────────────────────────────────────────────────

export async function handleKnowledge(
  sub: string | undefined,
  args: string[],
  flags: Record<string, unknown>,
): Promise<ExitCodeValue> {
  const { createKnowledgeStore } = await import('@musubix2/knowledge');
  const basePath = (flags['path'] as string | undefined) ?? '.knowledge';
  const store = createKnowledgeStore(basePath);
  // Load persisted graph so state survives across separate CLI invocations.
  await store.load();

  switch (sub) {
    case 'get': {
      const id = args[0];
      if (!id) {
        console.error('❌ Usage: musubix knowledge get <id>');
        return ExitCode.GENERAL_ERROR;
      }
      const entity = await store.getEntity(id);
      if (!entity) {
        console.error(`❌ Entity not found: ${id}`);
        return ExitCode.GENERAL_ERROR;
      }
      console.log(JSON.stringify(entity, null, 2));
      return ExitCode.SUCCESS;
    }
    case 'put': {
      const id = args[0];
      const type = args[1];
      const name = args[2];
      if (!id || !type) {
        console.error('❌ Usage: musubix knowledge put <id> <type> [name]');
        return ExitCode.GENERAL_ERROR;
      }
      // Store a well-formed entity (name defaults to id, tags default to []),
      // so full-text `search` and `query` work without crashing.
      await store.putEntity({
        id,
        name: name ?? id,
        type: type as EntityType,
        properties: {},
        tags: [],
      } as any);
      await store.save();
      console.log(`✅ Stored entity: ${id} (${type})`);
      return ExitCode.SUCCESS;
    }
    case 'delete': {
      const id = args[0];
      if (!id) {
        console.error('❌ Usage: musubix knowledge delete <id>');
        return ExitCode.GENERAL_ERROR;
      }
      await store.deleteEntity(id);
      await store.save();
      console.log(`✅ Deleted entity: ${id}`);
      return ExitCode.SUCCESS;
    }
    case 'link': {
      const from = args[0];
      const rel = args[1];
      const to = args[2];
      if (!from || !rel || !to) {
        console.error('❌ Usage: musubix knowledge link <from> <rel> <to>');
        return ExitCode.GENERAL_ERROR;
      }
      await store.addRelation({ from, to, type: rel as RelationType } as any);
      await store.save();
      console.log(`✅ Linked: ${from} —[${rel}]→ ${to}`);
      return ExitCode.SUCCESS;
    }
    case 'query': {
      const filter = args[0];
      if (!filter) {
        console.error('❌ Usage: musubix knowledge query <filter>');
        return ExitCode.GENERAL_ERROR;
      }
      // Match on exact type OR a text substring of name/description, and also
      // on the entity id — so `query user` finds an entity named/ided "user".
      const byType = await store.query({ type: filter as EntityType });
      const byText = await store.query({ text: filter });
      const merged = new Map<string, (typeof byType)[number]>();
      for (const e of [...byType, ...byText]) {merged.set(e.id, e);}
      for (const e of await store.query({})) {
        if (e.id.toLowerCase().includes(filter.toLowerCase())) {merged.set(e.id, e);}
      }
      const results = [...merged.values()];
      console.log(`Results: ${results.length} entities`);
      for (const e of results) {
        console.log(`  ${e.id} (${e.type})`);
      }
      return ExitCode.SUCCESS;
    }
    case 'traverse': {
      const startId = args[0];
      if (!startId) {
        console.error('❌ Usage: musubix knowledge traverse <startId>');
        return ExitCode.GENERAL_ERROR;
      }
      const traversed = await store.traverse(startId);
      console.log(`Traversal from ${startId}: ${traversed.length} nodes`);
      for (const node of traversed) {
        console.log(`  ${node.id} (${node.type})`);
      }
      return ExitCode.SUCCESS;
    }
    case 'search': {
      const term = args[0];
      if (!term) {
        console.error('❌ Usage: musubix knowledge search <term>');
        return ExitCode.GENERAL_ERROR;
      }
      const results = await store.search(term);
      console.log(`Search "${term}": ${results.length} results`);
      for (const e of results) {
        console.log(`  ${e.id} (${e.type})`);
      }
      return ExitCode.SUCCESS;
    }
    case 'stats': {
      const stats = store.getStats();
      console.log(`Entities: ${stats.entityCount}`);
      console.log(`Relations: ${stats.relationCount}`);
      console.log(`Types: ${Object.keys(stats.types).join(', ') || 'none'}`);
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix knowledge <get|put|delete|link|query|traverse|search|stats> [args]');
      return ExitCode.SUCCESS;
  }
}

// ── Decision handler ───────────────────────────────────────────────────────

export async function handleDecision(
  sub: string | undefined,
  args: string[],
  flags: Record<string, unknown>,
): Promise<ExitCodeValue> {
  const { createDecisionManager } = await import('@musubix2/decisions');
  const basePath = (flags['path'] as string | undefined) ?? '.decisions';
  const manager = createDecisionManager(basePath);
  // Load persisted ADRs so state survives across separate CLI invocations.
  await manager.load();

  switch (sub) {
    case 'create': {
      const title = args[0];
      if (!title) {
        console.error('❌ Usage: musubix decision create <title> [--context …] [--decision …] [--consequences …]');
        return ExitCode.GENERAL_ERROR;
      }
      // Populate the ADR body from flags (previously always empty).
      const adr = await manager.create({
        title,
        context: (flags['context'] as string | undefined) ?? '',
        decision: (flags['decision'] as string | undefined) ?? '',
        consequences: (flags['consequences'] as string | undefined) ?? '',
      });
      console.log(`✅ Created ADR: ${adr.id} — ${adr.title}`);
      return ExitCode.SUCCESS;
    }
    case 'list': {
      const adrs = await manager.list();
      if (adrs.length === 0) {
        console.log('No ADRs found');
      } else {
        console.log('Architecture Decision Records:');
        for (const adr of adrs) {
          console.log(`  ${adr.id}: ${adr.title} [${adr.status}]`);
        }
      }
      return ExitCode.SUCCESS;
    }
    case 'get': {
      const id = args[0];
      if (!id) {
        console.error('❌ Usage: musubix decision get <id>');
        return ExitCode.GENERAL_ERROR;
      }
      const adr = await manager.get(id);
      if (!adr) {
        console.error(`❌ ADR not found: ${id}`);
        return ExitCode.GENERAL_ERROR;
      }
      console.log(`${adr.id}: ${adr.title}`);
      console.log(`Status: ${adr.status}`);
      console.log(`Context: ${adr.context}`);
      console.log(`Decision: ${adr.decision}`);
      return ExitCode.SUCCESS;
    }
    case 'accept': {
      const id = args[0];
      if (!id) {
        console.error('❌ Usage: musubix decision accept <id>');
        return ExitCode.GENERAL_ERROR;
      }
      await manager.accept(id);
      console.log(`✅ Accepted: ${id}`);
      return ExitCode.SUCCESS;
    }
    case 'deprecate': {
      const id = args[0];
      if (!id) {
        console.error('❌ Usage: musubix decision deprecate <id>');
        return ExitCode.GENERAL_ERROR;
      }
      await manager.deprecate(id);
      console.log(`✅ Deprecated: ${id}`);
      return ExitCode.SUCCESS;
    }
    case 'search': {
      const query = args[0];
      if (!query) {
        console.error('❌ Usage: musubix decision search <query>');
        return ExitCode.GENERAL_ERROR;
      }
      const results = await manager.search(query);
      console.log(`Search "${query}": ${results.length} results`);
      for (const adr of results) {
        console.log(`  ${adr.id}: ${adr.title} [${adr.status}]`);
      }
      return ExitCode.SUCCESS;
    }
    case 'index': {
      const index = await manager.generateIndex();
      console.log(index);
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix decision <create|list|get|accept|deprecate|search|index> [args]');
      return ExitCode.SUCCESS;
  }
}

// ── Deep Research handler ──────────────────────────────────────────────────

/**
 * Pull entities from the local knowledge graph that match a topic and adapt them
 * into research sources, so `deep-research` can reason over project knowledge.
 */
async function knowledgeSourcesForTopic(
  topic: string,
  basePath = '.knowledge',
): Promise<Array<{ title: string; type: 'documentation'; relevance: number; content: string }>> {
  try {
    const { createKnowledgeStore } = await import('@musubix2/knowledge');
    const store = createKnowledgeStore(basePath);
    if ('load' in store && typeof (store as { load?: unknown }).load === 'function') {
      await (store as unknown as { load: () => Promise<void> }).load();
    }
    const byText = await store.query({ text: topic });
    const bySearch = await store.search(topic);
    const merged = new Map<string, (typeof byText)[number]>();
    for (const e of [...byText, ...bySearch]) {merged.set(e.id, e);}
    return [...merged.values()].map((e) => ({
      title: e.name ?? e.id,
      type: 'documentation' as const,
      relevance: 0.85,
      content: `${e.name ?? e.id} (${e.type}): ${e.description ?? ''}`.trim(),
    }));
  } catch {
    return [];
  }
}

export async function handleDeepResearch(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  const { createResearchEngine } = await import('@musubix2/deep-research');
  const engine = createResearchEngine();

  switch (sub) {
    case 'query': {
      const question = args[0];
      if (!question) {
        console.error('❌ Usage: musubix deep-research query <question>');
        return ExitCode.GENERAL_ERROR;
      }
      const sources = await knowledgeSourcesForTopic(question);
      const result = engine.research({ topic: question, depth: 'medium' }, sources);
      console.log(`Question: ${question}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Sources: ${result.sources.length}${sources.length ? ' (from knowledge graph)' : ''}`);
      console.log(`Answer: ${result.summary}`);
      return ExitCode.SUCCESS;
    }
    case 'iterative': {
      const question = args[0];
      if (!question) {
        console.error('❌ Usage: musubix deep-research iterative <question>');
        return ExitCode.GENERAL_ERROR;
      }
      const sources = await knowledgeSourcesForTopic(question);
      const result = engine.researchIterative(
        { topic: question, depth: 'medium' },
        () => sources,
      );
      console.log(`Iterative research: ${question}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Answer: ${result.summary}`);
      return ExitCode.SUCCESS;
    }
    case 'evidence': {
      const topic = args[0];
      if (!topic) {
        console.error('❌ Usage: musubix deep-research evidence <topic>');
        return ExitCode.GENERAL_ERROR;
      }
      // Seed the engine's accumulator from the knowledge graph, then build the
      // evidence chain (generateEvidenceChain reads prior research results).
      const sources = await knowledgeSourcesForTopic(topic);
      engine.research({ topic, depth: 'medium' }, sources);
      const evidence = engine.generateEvidenceChain(topic);
      console.log(`Evidence for "${topic}": ${evidence.length} items`);
      for (const e of evidence) {
        console.log(`  - ${e.claim} (confidence ${e.confidence.toFixed(2)}, ${e.sources.length} source(s))`);
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix deep-research <query|iterative|evidence> [args]');
      return ExitCode.SUCCESS;
  }
}

// ── REPL handler ───────────────────────────────────────────────────────────

export async function handleRepl(): Promise<ExitCodeValue> {
  const { ReplEngine } = await import('@musubix2/core');
  const repl = new ReplEngine();
  console.log('MUSUBIX2 Interactive REPL');
  console.log('Type "help" for commands, "exit" to quit.\n');
  console.log(repl.getPrompt());
  return ExitCode.SUCCESS;
}

// ── Scaffold handler ───────────────────────────────────────────────────────

export async function handleScaffold(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  const { createProjectInitializer } = await import('@musubix2/core');
  const initializer = createProjectInitializer();

  switch (sub) {
    case 'project': {
      const name = args[0];
      if (!name) {
        console.error('❌ Usage: musubix scaffold project <name>');
        return ExitCode.GENERAL_ERROR;
      }
      const result = initializer.init({
        projectName: name,
        template: 'default',
        outputDir: '.',
      });
      if (result.success) {
        console.log(`✅ Scaffolded project: ${name}`);
        for (const f of result.createdFiles) {
          console.log(`  ${f}`);
        }
      } else {
        for (const e of result.errors) {console.error(`❌ ${e}`);}
        return ExitCode.GENERAL_ERROR;
      }
      return ExitCode.SUCCESS;
    }
    case 'package': {
      const name = args[0];
      if (!name) {
        console.error('❌ Usage: musubix scaffold package <name>');
        return ExitCode.GENERAL_ERROR;
      }
      try {
        const created = writeScaffold(`packages/${name}`, {
          'package.json': JSON.stringify(
            {
              name: `@musubix2/${name}`,
              version: '0.1.0',
              type: 'module',
              main: 'dist/index.js',
              scripts: { build: 'tsc -p tsconfig.json', test: 'vitest run' },
            },
            null,
            2,
          ) + '\n',
          'tsconfig.json': JSON.stringify(
            { extends: '../../tsconfig.base.json', compilerOptions: { outDir: 'dist', rootDir: 'src' }, include: ['src'] },
            null,
            2,
          ) + '\n',
          'src/index.ts': `/**\n * @musubix2/${name}\n */\nexport const name = '${name}';\n`,
          'tests/index.test.ts': `import { describe, it, expect } from 'vitest';\nimport { name } from '../src/index.js';\n\ndescribe('${name}', () => {\n  it('exports its name', () => {\n    expect(name).toBe('${name}');\n  });\n});\n`,
        });
        console.log(`✅ Scaffolded package: ${name}`);
        for (const f of created) {console.log(`  ${f}`);}
      } catch (err) {
        console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
        return ExitCode.GENERAL_ERROR;
      }
      return ExitCode.SUCCESS;
    }
    case 'skill': {
      const name = args[0];
      if (!name) {
        console.error('❌ Usage: musubix scaffold skill <name>');
        return ExitCode.GENERAL_ERROR;
      }
      try {
        const created = writeScaffold(`skills/${name}`, {
          'skill.json': JSON.stringify(
            { name, description: `${name} skill`, version: '0.1.0' },
            null,
            2,
          ) + '\n',
          'index.ts': `/**\n * ${name} skill\n */\nexport function ${toIdentifier(name)}(): string {\n  return '${name}';\n}\n`,
          'tests/index.test.ts': `import { describe, it, expect } from 'vitest';\nimport { ${toIdentifier(name)} } from '../index.js';\n\ndescribe('${name}', () => {\n  it('runs', () => {\n    expect(${toIdentifier(name)}()).toBe('${name}');\n  });\n});\n`,
        });
        console.log(`✅ Scaffolded skill: ${name}`);
        for (const f of created) {console.log(`  ${f}`);}
      } catch (err) {
        console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
        return ExitCode.GENERAL_ERROR;
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix scaffold <project|package|skill> <name>');
      return ExitCode.SUCCESS;
  }
}

// ── Explain handler ────────────────────────────────────────────────────────

export async function handleExplain(
  input: string | undefined,
): Promise<ExitCodeValue> {
  const { ExplanationGenerator, ReasoningChainRecorder } = await import('@musubix2/core');

  if (!input) {
    console.error('❌ Usage: musubix explain <file-or-snippet>');
    return ExitCode.GENERAL_ERROR;
  }

  const recorder = new ReasoningChainRecorder();
  const generator = new ExplanationGenerator();

  let code: string;
  if (existsSync(input)) {
    if (statSync(input).isDirectory()) {
      console.error(`❌ explain expects a file or code snippet, not a directory: ${input}`);
      return ExitCode.GENERAL_ERROR;
    }
    code = readFileSync(input, 'utf-8');
  } else {
    code = input;
  }

  recorder.startChain('Code Explanation');
  recorder.addStep(`Analyzing: ${code.substring(0, 80)}...`, ['source code'], 0.8);
  recorder.addStep('Explanation generated', ['analysis complete'], 0.9);
  const chain = recorder.conclude('Analysis complete');

  const explanation = generator.generate(chain);

  console.log('=== Code Explanation ===\n');
  console.log(explanation);
  return ExitCode.SUCCESS;
}

// ── Learn handler ──────────────────────────────────────────────────────────

export async function handleLearn(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  const { createLibraryLearner } = await import('@musubix2/library-learner');
  const learner = createLibraryLearner();

  switch (sub) {
    case 'analyze': {
      const path = args[0];
      if (!path) {
        console.error('❌ Usage: musubix learn analyze <path>');
        return ExitCode.GENERAL_ERROR;
      }
      try {
        if (!existsSync(path)) {
          console.error(`❌ Path not found: ${path}`);
          return ExitCode.GENERAL_ERROR;
        }
        // Accept a single file or a directory (recursively analyzed).
        const files = collectFiles(path, (ext) => ext in EXT_TO_LANG);
        if (files.length === 0) {
          console.error(`❌ No analyzable source files found under: ${path}`);
          return ExitCode.GENERAL_ERROR;
        }
        const contents = files.map((f) => readFileSync(f, 'utf-8'));
        const patterns = learner.learn(contents);
        console.log(`Analyzed: ${path} (${files.length} file(s))`);
        console.log(`Patterns found: ${patterns.length}`);
        for (const p of patterns) {
          console.log(`  - ${p.name}: ${p.abstraction}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ ${msg}`);
        return ExitCode.GENERAL_ERROR;
      }
      return ExitCode.SUCCESS;
    }
    case 'patterns': {
      const patterns = learner.getPatterns();
      if (patterns.length === 0) {
        console.log('No patterns learned yet');
      } else {
        console.log('Learned patterns:');
        for (const p of patterns) {
          console.log(`  - ${p.name}: ${p.abstraction}`);
        }
      }
      return ExitCode.SUCCESS;
    }
    case 'suggest': {
      const code = args[0] ?? '';
      const suggestions = learner.suggest(code);
      if (suggestions.length === 0) {
        console.log('No suggestions available');
      } else {
        console.log('Suggestions:');
        for (const s of suggestions) {
          console.log(`  - ${s.name}: ${s.abstraction}`);
        }
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix learn <analyze|patterns|suggest> [args]');
      return ExitCode.SUCCESS;
  }
}

// ── Synthesis handler ──────────────────────────────────────────────────────

export async function handleSynthesis(
  sub: string | undefined,
  args: string[],
  flags: Record<string, unknown> = {},
): Promise<ExitCodeValue> {
  switch (sub) {
    case 'fromExamples': {
      const { createSynthesisEngine } = await import('@musubix2/synthesis');
      const engine = createSynthesisEngine();
      const examples = args.map((a) => {
        const [input, output] = a.split('=');
        return { input: input ?? '', output: output ?? '' };
      });
      const result = engine.synthesize(examples);
      console.log('Synthesized program:');
      if (result) {
        console.log(`  Rule: ${result}`);
      } else {
        console.log('  No rule could be synthesized');
      }
      return ExitCode.SUCCESS;
    }
    case 'dsl': {
      const { createDSLBuilder } = await import('@musubix2/synthesis');
      const builder = createDSLBuilder();
      const input = args[0];
      if (!input) {
        console.error('❌ Usage: musubix synthesis dsl <input> --ops <op[:arg...],...>');
        console.error('   ops: trim, upper, lower, reverse, capitalize, camelCase, snakeCase,');
        console.error('        replace:from:to, prefixRemove:p, suffixAppend:s, repeat:n');
        return ExitCode.GENERAL_ERROR;
      }
      // Build the transform pipeline from --ops; without it the DSL is a no-op.
      const opsSpec = (flags['ops'] as string | undefined) ?? '';
      const ops = opsSpec.split(',').map((o) => o.trim()).filter(Boolean);
      if (ops.length === 0) {
        console.error('❌ No transforms given. Pass --ops <op,...> (e.g. --ops trim,camelCase).');
        return ExitCode.VALIDATION_ERROR;
      }
      for (const op of ops) {
        const [name, ...opArgs] = op.split(':');
        switch (name) {
          case 'trim': builder.trim(); break;
          case 'upper': case 'toUpperCase': builder.toUpperCase(); break;
          case 'lower': case 'toLowerCase': builder.toLowerCase(); break;
          case 'reverse': builder.reverse(); break;
          case 'capitalize': builder.capitalize(); break;
          case 'camelCase': case 'camel': builder.camelCase(); break;
          case 'snakeCase': case 'snake': builder.snakeCase(); break;
          case 'replace': builder.replace(opArgs[0] ?? '', opArgs[1] ?? ''); break;
          case 'prefixRemove': builder.prefixRemove(opArgs[0] ?? ''); break;
          case 'suffixAppend': builder.suffixAppend(opArgs[0] ?? ''); break;
          case 'repeat': builder.repeat(Number.parseInt(opArgs[0] ?? '1', 10) || 1); break;
          default:
            console.error(`❌ Unknown DSL op: ${name}`);
            return ExitCode.VALIDATION_ERROR;
        }
      }
      const result = builder.execute(input);
      console.log('DSL output:');
      console.log(`  Input:  ${input}`);
      console.log(`  Ops:    ${ops.join(' → ')}`);
      console.log(`  Result: ${result}`);
      return ExitCode.SUCCESS;
    }
    case 'version-space': {
      const { createVersionSpaceManager } = await import('@musubix2/synthesis');
      const manager = createVersionSpaceManager();
      const spaces = manager.getSpaces();
      console.log('Version space:');
      console.log(`  Spaces: ${spaces.size}`);
      return ExitCode.SUCCESS;
    }
    default:
      console.log('Usage: musubix synthesis <fromExamples|dsl|version-space> [args]');
      return ExitCode.SUCCESS;
  }
}

// ── Watch handler ──────────────────────────────────────────────────────────

export async function handleWatch(
  pattern: string | undefined,
): Promise<ExitCodeValue> {
  const { createFileWatcher } = await import('@musubix2/core');

  if (!pattern) {
    console.error('❌ Usage: musubix watch <glob-pattern>');
    return ExitCode.GENERAL_ERROR;
  }

  const watcher = createFileWatcher();
  console.log(`👁 Watching: ${pattern}`);
  console.log('Press Ctrl+C to stop.\n');
  watcher.on('modify', (event: { path: string; type: string }) => {
    console.log(`  [${event.type}] ${event.path}`);
  });
  return ExitCode.SUCCESS;
}

// ── Default commands ───────────────────────────────────────────────────────

/**
 * Resolve the file/name target for a command, tolerating an optional leading
 * verb subcommand (e.g. `design generate <file>`, `codegen generate <name>`,
 * `requirements analyze <file>`). When the parsed subcommand is one of the
 * known verbs, it is treated as syntactic sugar and the real target is taken
 * from the first positional argument instead.
 */
export function resolveTarget(args: Record<string, unknown>, verbs: string[]): string | undefined {
  const positional = (args['args'] as string[] | undefined) ?? [];
  const sub = args['subcommand'] as string | undefined;
  const explicitFile = args['file'] as string | undefined;
  if (explicitFile) {return explicitFile;}
  if (sub && verbs.includes(sub.toLowerCase())) {
    // Subcommand is a verb — the target is the next positional token.
    return positional[0];
  }
  return sub ?? positional[0];
}

/** Shared action for `req` and its documented `requirements` alias. */
async function reqAction(args: Record<string, unknown>): Promise<ExitCodeValue | void> {
  if (args['help'] === true || args['h'] === true) {
    console.log(showHelp('requirements'));
    return;
  }
  // Tolerate documented `requirements analyze|validate <file>` forms.
  const filePath = resolveTarget(args, ['analyze', 'validate']);
  if (!filePath) {
    console.error('❌ Usage: musubix requirements [analyze|validate] <file>');
    return ExitCode.VALIDATION_ERROR;
  }
  return await handleReqValidate(filePath);
}

// ── Semantic search (neural-search) ────────────────────────────────────────

/** File extensions treated as searchable documents. */
const SEARCH_EXTS = new Set([
  'ts', 'js', 'py', 'go', 'rs', 'java', 'rb', 'php', 'c', 'cpp', 'cs',
  'md', 'txt', 'rst', 'json', 'yaml', 'yml',
]);

export async function handleSearch(
  query: string | undefined,
  flags: Record<string, unknown> = {},
): Promise<ExitCodeValue> {
  if (!query) {
    console.error('❌ Usage: musubix search <query> [--corpus <dir>] [--top <n>]');
    return ExitCode.VALIDATION_ERROR;
  }
  try {
    const { createNeuralSearchEngine, createTfIdfEmbeddingModel } = await import('@musubix2/neural-search');
    const corpus = (flags['corpus'] as string | undefined) ?? '.';
    const topK = flags['top'] ? Math.max(1, parseInt(String(flags['top']), 10) || 5) : 5;
    if (!existsSync(corpus)) {
      console.error(`❌ Corpus not found: ${corpus}`);
      return ExitCode.GENERAL_ERROR;
    }
    const files = collectFiles(corpus, (ext) => SEARCH_EXTS.has(ext));
    if (files.length === 0) {
      console.error(`❌ No searchable documents under: ${corpus}`);
      return ExitCode.GENERAL_ERROR;
    }
    const docs: Array<{ id: string; text: string }> = [];
    for (const f of files) {
      try {
        docs.push({ id: f, text: readFileSync(f, 'utf-8') });
      } catch {
        /* skip unreadable file */
      }
    }
    const model = createTfIdfEmbeddingModel();
    model.fit(docs.map((d) => d.text));
    const engine = createNeuralSearchEngine();
    for (const d of docs) {
      engine.addDocument(d.id, await model.embed(d.text), {});
    }
    const hits = engine.search(await model.embed(query), topK);
    console.log(`Top ${hits.length} result(s) for "${query}" (corpus: ${corpus}, ${docs.length} docs):`);
    if (hits.every((h) => h.score === 0)) {
      console.log('  (no document shares any term with the query)');
    }
    for (const h of hits) {
      console.log(`  ${h.score.toFixed(3)}  ${h.id}`);
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    return ExitCode.GENERAL_ERROR;
  }
}

// ── Formal verification (formal-verify) ────────────────────────────────────

/** Extract action/trigger/condition from an EARS sentence for SMT conversion. */
function toFormalRequirement(r: { id: string; title: string; text: string; pattern?: string }): {
  id: string; title: string; text: string; pattern: string; action: string; trigger?: string; condition?: string;
} {
  const text = r.text;
  const actionMatch = /\bSHALL\s+(?:NOT\s+)?(.+?)[.。]?\s*$/i.exec(text);
  const action = (actionMatch?.[1] ?? r.title ?? 'act').trim();
  const trigger = /\bWHEN\s+(.+?)[,，]/i.exec(text)?.[1]?.trim();
  const condition =
    /\b(?:WHILE|IF|WHERE)\s+(.+?)[,，]/i.exec(text)?.[1]?.trim();
  return { id: r.id, title: r.title, text, pattern: r.pattern ?? 'ubiquitous', action, trigger, condition };
}

export async function handleVerify(filePath: string | undefined): Promise<ExitCodeValue> {
  if (!filePath) {
    console.error('❌ Usage: musubix verify <requirements.md>');
    return ExitCode.VALIDATION_ERROR;
  }
  try {
    if (!existsSync(filePath)) {
      console.error(`❌ Path not found: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const { createEarsToSmtConverter, createZ3Adapter, createPreconditionVerifier } =
      await import('@musubix2/formal-verify');
    const content = readFileSync(filePath, 'utf-8');
    const parsed = new MarkdownEARSParser().parse(content);
    if (parsed.length === 0) {
      console.log(`No EARS requirements found in ${filePath}.`);
      return ExitCode.SUCCESS;
    }
    const converter = createEarsToSmtConverter();
    const solver = createZ3Adapter();
    const formulas = [];
    console.log(`Formal verification of ${parsed.length} requirement(s) in ${filePath}:`);
    for (const r of parsed) {
      const req = toFormalRequirement(r);
      const conv = converter.convert(req as Parameters<typeof converter.convert>[0]);
      if (conv.success && conv.formula) {
        formulas.push(conv.formula);
        console.log(`  ✓ ${r.id} [${req.pattern}] → ${conv.formula.assertions.join(' ')}`);
      } else {
        console.log(`  ✗ ${r.id} [${req.pattern}] → ${conv.error ?? 'conversion failed'}`);
      }
    }
    const verifier = createPreconditionVerifier();
    const check = await verifier.checkConsistency(formulas, solver);
    if (check.consistent) {
      console.log(`\n✅ The ${formulas.length} formalised requirement(s) are logically consistent (solver: ${solver.getVersion()}).`);
      return ExitCode.SUCCESS;
    }
    console.log(`\n⚠ Requirements are inconsistent — ${check.conflicts.length} conflict(s):`);
    for (const c of check.conflicts) {
      console.log(`  - ${c.explanation}`);
    }
    return ExitCode.GENERAL_ERROR;
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    return ExitCode.GENERAL_ERROR;
  }
}

// ── Data-flow analysis (dfg) ───────────────────────────────────────────────

/** JS/TS identifiers referenced on the right-hand side of a statement. */
function usedIdentifiers(expr: string): string[] {
  const ids = new Set<string>();
  for (const m of expr.matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*:)/g)) {
    const id = m[1];
    if (!DFG_KEYWORDS.has(id)) {ids.add(id);}
  }
  return [...ids];
}
const DFG_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'true', 'false', 'null', 'undefined', 'new', 'await', 'async', 'typeof',
  'this', 'void', 'in', 'of', 'instanceof',
]);

/** Best-effort extraction of simple statements from JS/TS source for the DFG. */
function extractSimpleStatements(source: string): Array<Record<string, unknown>> {
  const stmts: Array<Record<string, unknown>> = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().replace(/;$/, '');
    const lineNum = i + 1;
    if (line === '' || line.startsWith('//')) {continue;}

    const decl = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+)$/.exec(line);
    if (decl) {
      stmts.push({ type: 'declaration', line: lineNum, variable: decl[1], value: decl[2], usedVariables: usedIdentifiers(decl[2]) });
      continue;
    }
    const ret = /^return\s+(.+)$/.exec(line);
    if (ret) {
      stmts.push({ type: 'return', line: lineNum, usedVariables: usedIdentifiers(ret[1]) });
      continue;
    }
    const assign = /^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/.exec(line);
    if (assign && !line.includes('==')) {
      stmts.push({ type: 'assignment', line: lineNum, variable: assign[1], value: assign[2], usedVariables: usedIdentifiers(assign[2]) });
      continue;
    }
    const call = /^([A-Za-z_$][\w$.]*)\s*\((.*)\)$/.exec(line);
    if (call) {
      stmts.push({ type: 'call', line: lineNum, usedVariables: usedIdentifiers(call[2]) });
    }
  }
  return stmts;
}

export async function handleDfg(
  filePath: string | undefined,
  flags: Record<string, unknown> = {},
): Promise<ExitCodeValue> {
  if (!filePath) {
    console.error('❌ Usage: musubix dfg <file> [--unused]');
    return ExitCode.VALIDATION_ERROR;
  }
  try {
    if (!existsSync(filePath)) {
      console.error(`❌ Path not found: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const { createDataFlowAnalyzer } = await import('@musubix2/dfg');
    const source = readFileSync(filePath, 'utf-8');
    const statements = extractSimpleStatements(source);
    if (statements.length === 0) {
      console.log(`No analyzable statements found in ${filePath} (supports simple JS/TS).`);
      return ExitCode.SUCCESS;
    }
    const analyzer = createDataFlowAnalyzer();
    const dfg = analyzer.buildDFG(statements as never, filePath);
    console.log(`Data-flow graph for ${filePath}: ${dfg.nodes.length} node(s), ${dfg.edges.length} edge(s).`);

    // A definition is a `variable` node; it is used iff a `def-use` edge starts
    // from it. Definitions with no such edge are potential dead stores.
    const defs = dfg.nodes.filter((n) => n.type === 'variable');
    const usedDefIds = new Set(dfg.edges.filter((e) => e.type === 'def-use').map((e) => e.from));
    const unused = defs.filter((d) => !usedDefIds.has(d.id));
    if (flags['unused']) {
      if (unused.length === 0) {
        console.log('No unused definitions found.');
      } else {
        console.log(`Unused definitions (${unused.length}):`);
        for (const u of unused) {
          console.log(`  - ${u.name}${u.line ? ` (line ${u.line})` : ''}`);
        }
      }
    } else {
      console.log(`Definitions: ${defs.length}, unused: ${unused.length} (use --unused to list).`);
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export function getDefaultCommands(): CLICommand[] {
  return [
    {
      name: 'init',
      description: 'Initialize a new MUSUBIX2 project',
      options: [
        { flag: '--name <name>', description: 'Project name' },
        { flag: '--force', description: 'Overwrite existing files' },
        { flag: '--platform <type>', description: 'Platform: auto|copilot|claude|both' },
        { flag: '--dry-run', description: 'Show planned changes without writing' },
        { flag: '--update', description: 'Update existing musubix config' },
      ],
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('init'));
          return;
        }
        // P3-05: Mode resolution — new flags trigger platform-bootstrap
        const flags = args as Record<string, string | boolean>;
        const { InitModeResolver } = await import('./interface/cli/init-mode-resolver.js');
        const modeResolver = new InitModeResolver();
        const mode = modeResolver.resolve(flags);

        if (mode === 'platform-bootstrap') {
          const { createInitCommandHandler } = await import('./interface/cli/init-command-handler.js');
          const handler = createInitCommandHandler();
          const targetPath = (args['subcommand'] as string) ?? (args['args'] as string[] | undefined)?.[0] ?? '.';
          const { resolve } = await import('node:path');
          const summary = await handler.run({
            projectPath: resolve(targetPath),
            platform: (flags['platform'] as string as 'auto' | 'copilot' | 'claude' | 'both') ?? 'auto',
            force: flags['force'] === true,
            dryRun: flags['dry-run'] === true,
            update: flags['update'] === true,
          });
          if (!flags['dry-run']) {
            console.log(`\n✅ Platform setup complete (${summary.durationMs}ms)`);
            console.log(`   Platforms: copilot=${summary.detectedPlatforms.copilot}, claude=${summary.detectedPlatforms.claude}`);
            if (summary.created.length) {console.log(`   Created: ${summary.created.length} files`);}
            if (summary.updated.length) {console.log(`   Updated: ${summary.updated.length} files`);}
            if (summary.skipped.length) {console.log(`   Skipped: ${summary.skipped.length} files`);}
          }
          for (const w of summary.warnings) {console.warn(`   ⚠ ${w}`);}
          return;
        }

        // Legacy mode: existing project init
        const targetPath = (args['subcommand'] as string) ?? (args['args'] as string[] | undefined)?.[0] ?? '.';
        return await handleInit(
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
              return ExitCode.VALIDATION_ERROR;
            }
            return await handleTasksValidate(filePath);
          case 'list':
            return await handleTasksList(filePath);
          case 'stats':
            return await handleTasksStats(filePath);
          default:
            console.log(showHelp('tasks'));
            return;
        }
      },
    },
    {
      name: 'req',
      description: 'Analyze requirements (EARS validation)',
      action: reqAction,
    },
    {
      // Alias matching the documented `musubix requirements <analyze|validate> <file>` form.
      name: 'requirements',
      description: 'Analyze/validate requirements (EARS validation)',
      action: reqAction,
    },
    {
      name: 'req:wizard',
      description: 'Interactive requirements creation wizard',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('requirements'));
          return;
        }
        return await handleReqWizard();
      },
    },
    {
      name: 'req:interview',
      description: 'Requirements interview — 1問1答 flow for gathering requirements',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('requirements'));
          return;
        }
        return await handleReqInterview(args);
      },
    },
    {
      name: 'design',
      description: 'Generate design documents',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('design'));
          return;
        }
        // Tolerate documented `design generate <file>` / `design verify <file>` forms.
        if ((args['subcommand'] as string | undefined)?.toLowerCase() === 'verify') {
          const vf = resolveTarget(args, ['verify']);
          if (!vf) {
            console.error('❌ Usage: musubix design verify <design-file>');
            return ExitCode.VALIDATION_ERROR;
          }
          return await handleDesignVerify(vf);
        }
        const filePath = resolveTarget(args, ['generate']);
        if (!filePath) {
          console.error('❌ Usage: musubix design [generate] <requirements-file> [--out <design.json>]');
          return ExitCode.VALIDATION_ERROR;
        }
        return await handleDesignGenerate(filePath, args['out'] as string | undefined);
      },
    },
    {
      name: 'design:c4',
      description: 'Generate C4 architecture diagrams',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('design'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['file'] as string | undefined)
          ?? (args['subcommand'] as string | undefined)
          ?? positionalArgs[0];
        if (!filePath) {
          console.error('❌ Usage: musubix design:c4 <file> [--level context|container|component]');
          return ExitCode.VALIDATION_ERROR;
        }
        const level = (args['level'] as string | undefined) ?? 'context';
        return await handleDesignC4(filePath, level);
      },
    },
    {
      name: 'design:verify',
      description: 'Verify design with SOLID analysis',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('design'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['file'] as string | undefined)
          ?? (args['subcommand'] as string | undefined)
          ?? positionalArgs[0];
        if (!filePath) {
          console.error('❌ Usage: musubix design:verify <design-file>');
          return ExitCode.VALIDATION_ERROR;
        }
        return await handleDesignVerify(filePath);
      },
    },
    {
      name: 'codegen',
      description: 'Generate code from design',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('codegen'));
          return;
        }
        // Tolerate documented `codegen generate <name>` form.
        const name = resolveTarget(args, ['generate']);
        if (!name) {
          console.error('❌ Usage: musubix codegen [generate] <name> [--type class|interface|function|...] [--out <file>]');
          return ExitCode.VALIDATION_ERROR;
        }
        const type = (args['type'] as string | undefined) ?? 'class';
        return await handleCodegen(name, type, args['out'] as string | undefined);
      },
    },
    {
      name: 'test:gen',
      description: 'Generate test skeletons',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('codegen'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['file'] as string | undefined)
          ?? (args['subcommand'] as string | undefined)
          ?? positionalArgs[0];
        if (!filePath) {
          console.error('❌ Usage: musubix test:gen <source-file-or-dir>');
          return ExitCode.VALIDATION_ERROR;
        }
        return await handleTestGen(filePath);
      },
    },
    {
      name: 'trace',
      description: 'Show traceability matrix',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('trace'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleTrace(sub, positionalArgs, args);
      },
    },
    {
      name: 'trace:verify',
      description: 'Verify traceability coverage',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('trace:verify'));
          return;
        }
        return await handleTraceVerify(args);
      },
    },
    {
      name: 'policy',
      description: 'Run constitution policy checks',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('policy'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handlePolicy(sub, positionalArgs);
      },
    },
    {
      name: 'ontology',
      description: 'Manage SDD ontology',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('ontology'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleOntology(sub, positionalArgs);
      },
    },
    {
      name: 'cg',
      description: 'Code graph analysis',
      action: async (args) => {
        const sub = args['subcommand'] as string | undefined;
        if (args['help'] === true || args['h'] === true) {
          console.log(cgSubcommandHelp(sub)); // subcommand-specific when a sub is given
          return;
        }
        const positionalArgs = [...((args['args'] as string[] | undefined) ?? [])];
        // Forward recognised flags so handleCodegraph can parse them uniformly.
        if (args['direct'] === true) {positionalArgs.push('--direct');}
        if (args['depth'] !== undefined) {positionalArgs.push('--depth', String(args['depth']));}
        if (args['format'] !== undefined) {positionalArgs.push('--format', String(args['format']));}
        if (args['out'] !== undefined) {positionalArgs.push('--out', String(args['out']));}
        if (args['json'] === true) {positionalArgs.push('--json');}
        if (args['max-cycles'] !== undefined) {positionalArgs.push('--max-cycles', String(args['max-cycles']));}
        if (args['forbid'] !== undefined) {positionalArgs.push('--forbid', String(args['forbid']));}
        if (args['cluster'] === true) {positionalArgs.push('--cluster');}
        if (args['all'] === true) {positionalArgs.push('--all');}
        return await handleCodegraph(sub, positionalArgs);
      },
    },
    {
      name: 'security',
      description: 'Run security scan',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('security'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['subcommand'] as string) ?? positionalArgs[0];
        if (!filePath) {
          console.error('❌ Usage: musubix security <path> [--fail-on <sev>] [--exclude-tests]');
          return ExitCode.VALIDATION_ERROR;
        }
        return await handleSecurity(
          filePath,
          args['fail-on'] as string | undefined,
          args['exclude-tests'] === true,
        );
      },
    },
    {
      name: 'workflow',
      description: 'Show workflow phase status',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('workflow'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleWorkflow(sub, positionalArgs);
      },
    },
    {
      name: 'status',
      description: 'Show project status dashboard',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('status'));
          return;
        }
        return await handleStatus();
      },
    },
    {
      name: 'skills',
      description: 'Skill management (list, validate, create)',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('skills'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleSkills(sub, positionalArgs);
      },
    },
    {
      name: 'knowledge',
      description: 'Knowledge graph operations',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('knowledge'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleKnowledge(sub, positionalArgs, args);
      },
    },
    {
      name: 'decision',
      description: 'Architecture Decision Records management',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('decision'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleDecision(sub, positionalArgs, args);
      },
    },
    {
      name: 'deep-research',
      description: 'Deep research and evidence gathering',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('deep-research'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleDeepResearch(sub, positionalArgs);
      },
    },
    {
      name: 'repl',
      description: 'Start interactive REPL',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('repl'));
          return;
        }
        return await handleRepl();
      },
    },
    {
      name: 'scaffold',
      description: 'Scaffold project structures',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('scaffold'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleScaffold(sub, positionalArgs);
      },
    },
    {
      name: 'explain',
      description: 'Explain code structure and logic',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('explain'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const input = (args['subcommand'] as string | undefined) ?? positionalArgs[0];
        return await handleExplain(input);
      },
    },
    {
      name: 'learn',
      description: 'Learn API patterns from library code',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('learn'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleLearn(sub, positionalArgs);
      },
    },
    {
      name: 'synthesis',
      description: 'Program synthesis from examples or DSL',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('synthesis'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        return await handleSynthesis(sub, positionalArgs, args);
      },
    },
    {
      name: 'watch',
      description: 'Watch files and trigger SDD re-validation',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('watch'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const pattern = (args['subcommand'] as string | undefined) ?? positionalArgs[0];
        return await handleWatch(pattern);
      },
    },
    // P3-07: MCP server launcher
    {
      name: 'mcp',
      description: 'Start MCP server (stdio or SSE)',
      options: [
        { flag: '--transport <type>', description: 'Transport: stdio|sse', default: 'stdio' },
        { flag: '--port <port>', description: 'SSE port number', default: 3100 },
      ],
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('mcp'));
          return;
        }
        const { McpCliLauncher } = await import('./interface/cli/mcp-cli-launcher.js');
        const launcher = new McpCliLauncher();
        const transport = (args['transport'] as string) === 'sse' ? 'sse' as const : 'stdio' as const;
        const port = typeof args['port'] === 'string' ? parseInt(args['port'], 10) : undefined;
        await launcher.start({ transport, port });
      },
    },
    {
      name: 'search',
      description: 'TF-IDF semantic search over a corpus',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('search'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const query = (args['subcommand'] as string | undefined) ?? positionalArgs[0];
        return await handleSearch(query, args);
      },
    },
    {
      name: 'verify',
      description: 'Formally verify EARS requirements (EARS → SMT → consistency)',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('verify'));
          return;
        }
        const file = resolveTarget(args, ['verify']);
        return await handleVerify(file);
      },
    },
    {
      name: 'dfg',
      description: 'Data-flow analysis (definitions, uses, unused variables)',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('dfg'));
          return;
        }
        const file = resolveTarget(args, ['analyze']);
        return await handleDfg(file, args);
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
