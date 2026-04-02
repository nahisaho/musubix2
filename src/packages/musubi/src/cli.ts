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
import {
  createTraceabilityManager,
  createMatrixGenerator,
  createImpactAnalyzer,
  createTraceabilityValidator,
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
    usage: 'musubix trace <matrix|validate|impact> [args]',
    description: 'トレーサビリティ',
  },
  'trace:verify': {
    usage: 'musubix trace:verify',
    description: 'トレーサビリティ検証',
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
    usage: 'musubix ontology <validate|stats>',
    description: 'オントロジー管理',
  },
  cg: {
    usage: 'musubix cg <index|search|stats|languages> [args]',
    description: 'コードグラフ分析',
  },
  security: {
    usage: 'musubix security <path>',
    description: 'セキュリティスキャン',
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
  createPhaseController,
  createStateTracker,
  type WorkflowPhase,
  PHASE_ORDER,
} from '@musubix2/workflow-engine';
import { readFileSync, existsSync } from 'node:fs';

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

// ── Trace handler ──────────────────────────────────────────────────────────

export async function handleTrace(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  switch (sub) {
    case 'matrix': {
      const generator = createMatrixGenerator();
      const report = generator.generate([], [], []);
      console.log(generator.toMarkdown(report));
      return ExitCode.SUCCESS;
    }
    case 'validate': {
      const manager = createTraceabilityManager();
      console.log(manager.toMarkdown());
      return ExitCode.SUCCESS;
    }
    case 'impact': {
      const targetId = args[0];
      if (!targetId) {
        console.error('❌ Usage: musubix trace impact <target-id>');
        return ExitCode.GENERAL_ERROR;
      }
      const analyzer = createImpactAnalyzer();
      const result = analyzer.analyze(targetId, []);
      console.log(`Impact analysis for ${targetId}:`);
      console.log(`  Level: ${result.level}`);
      console.log(`  Affected: ${result.affectedIds.length} items`);
      for (const id of result.affectedIds) {
        console.log(`    - ${id}`);
      }
      return ExitCode.SUCCESS;
    }
    default:
      console.log(showHelp('trace'));
      return ExitCode.SUCCESS;
  }
}

// ── Trace:verify handler ───────────────────────────────────────────────────

export async function handleTraceVerify(): Promise<ExitCodeValue> {
  const validator = createTraceabilityValidator();
  const report = validator.validateCoverage([], [], [], []);
  console.log(`Coverage: ${report.coveragePercent}%`);
  console.log(`Requirements: ${report.coveredRequirements}/${report.totalRequirements}`);
  if (report.gaps.length > 0) {
    console.log('Gaps:');
    for (const gap of report.gaps) {
      console.log(`  - ${JSON.stringify(gap)}`);
    }
  } else {
    console.log('No gaps found');
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

export async function handleOntology(sub: string | undefined): Promise<ExitCodeValue> {
  switch (sub) {
    case 'validate': {
      const store = createOntologyStore();
      const validator = createConsistencyValidator();
      const result = validator.validate(store);
      console.log(`Consistent: ${result.consistent ? '✅' : '❌'}`);
      if (result.violations.length > 0) {
        console.log('Violations:');
        for (const v of result.violations) {
          console.log(`  - ${JSON.stringify(v)}`);
        }
      }
      return ExitCode.SUCCESS;
    }
    case 'stats': {
      const store = createOntologyStore();
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
        const parser = createASTParser();
        const content = readFileSync(targetPath, 'utf-8');
        const ext = targetPath.split('.').pop() ?? '';
        const lang = EXT_TO_LANG[ext];
        if (!lang) {
          console.error(`❌ Unsupported file extension: .${ext}`);
          return ExitCode.GENERAL_ERROR;
        }
        const nodes = parser.parse(content, lang);
        const engine = createGraphEngine();
        for (const node of nodes) {
          engine.addNode({
            id: `${targetPath}:${node.name}`,
            name: node.name,
            kind: node.kind,
            filePath: targetPath,
            language: lang,
            startLine: 0,
            endLine: 0,
          });
        }
        const stats = engine.getStats();
        console.log(`✅ Indexed ${targetPath}: ${stats.nodeCount} nodes, ${stats.edgeCount} edges`);
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
      const engine = createGraphEngine();
      const search = new GraphRAGSearch(engine);
      const results = search.globalSearch(query);
      console.log(`Results for "${query}": ${results.length} found`);
      return ExitCode.SUCCESS;
    }
    case 'stats': {
      const engine = createGraphEngine();
      const stats = engine.getStats();
      console.log(`Nodes: ${stats.nodeCount}`);
      console.log(`Edges: ${stats.edgeCount}`);
      console.log(`Languages: ${[...stats.languages].join(', ') || 'none'}`);
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
      console.log(showHelp('cg'));
      return ExitCode.SUCCESS;
  }
}

// ── Security handler ───────────────────────────────────────────────────────

export async function handleSecurity(filePath: string): Promise<ExitCodeValue> {
  try {
    if (!existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return ExitCode.GENERAL_ERROR;
    }
    const code = readFileSync(filePath, 'utf-8');
    const secrets = createSecretDetector();
    const taint = new TaintAnalyzer();
    const deps = new DependencyScanner();

    const findings: SecurityFinding[] = [
      ...secrets.scan(code, filePath),
      ...taint.analyze(code, filePath),
      ...deps.scan(code, filePath),
    ];

    const bySeverity = new Map<Severity, SecurityFinding[]>();
    for (const f of findings) {
      const list = bySeverity.get(f.severity) ?? [];
      list.push(f);
      bySeverity.set(f.severity, list);
    }

    console.log(`Security scan: ${filePath}`);
    console.log(`Total findings: ${findings.length}`);

    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const sev of severityOrder) {
      const items = bySeverity.get(sev);
      if (items && items.length > 0) {
        console.log(`\n  ${sev.toUpperCase()} (${items.length}):`);
        for (const f of items) {
          console.log(`    - ${f.description}`);
        }
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

export async function handleWorkflow(
  sub: string | undefined,
  args: string[],
): Promise<ExitCodeValue> {
  const tracker = createStateTracker();
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
      console.log(`${req.id}: pattern=${analysis.pattern}, confidence=${analysis.confidence}`);
      if (!validation.valid) {
        hasIssues = true;
        for (const issue of validation.issues) {
          console.log(`  ⚠ ${issue}`);
        }
      }
    }

    if (requirements.length === 0) {
      console.log('No requirements found in file');
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

export async function handleDesignGenerate(filePath: string): Promise<ExitCodeValue> {
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
    console.log(`Design: ${design.title} (v${design.version})`);
    for (const section of design.sections) {
      console.log(`\n## ${section.title}`);
      console.log(section.description);
    }
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export async function handleDesignC4(
  filePath: string,
  level: string = 'context',
): Promise<ExitCodeValue> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as {
      title?: string;
      elements?: Array<Record<string, unknown>>;
      relationships?: Array<Record<string, unknown>>;
    };
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

export async function handleCodegen(
  name: string,
  type: string = 'class',
): Promise<ExitCodeValue> {
  try {
    const generator = createCodeGenerator();
    const result = generator.generate({
      templateType: type as Parameters<typeof generator.generate>[0]['templateType'],
      name,
    });
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
    const content = readFileSync(filePath, 'utf-8');
    const generator = createUnitTestGenerator();
    const suite = generator.generate(content, 'unit');
    console.log(suite.code);
    return ExitCode.SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
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
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('requirements'));
          return;
        }
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['file'] as string | undefined)
          ?? (args['subcommand'] as string | undefined)
          ?? positionalArgs[0];
        if (!filePath) {
          console.error('❌ Usage: musubix req <file>');
          return;
        }
        await handleReqValidate(filePath);
      },
    },
    {
      name: 'req:wizard',
      description: 'Interactive requirements creation wizard',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('requirements'));
          return;
        }
        await handleReqWizard();
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
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const filePath = (args['file'] as string | undefined)
          ?? (args['subcommand'] as string | undefined)
          ?? positionalArgs[0];
        if (!filePath) {
          console.error('❌ Usage: musubix design <requirements-file>');
          return;
        }
        await handleDesignGenerate(filePath);
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
          return;
        }
        const level = (args['level'] as string | undefined) ?? 'context';
        await handleDesignC4(filePath, level);
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
          return;
        }
        await handleDesignVerify(filePath);
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
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        const name = (args['subcommand'] as string | undefined) ?? positionalArgs[0];
        if (!name) {
          console.error('❌ Usage: musubix codegen <name> [--type class|interface|function|...]');
          return;
        }
        const type = (args['type'] as string | undefined) ?? 'class';
        await handleCodegen(name, type);
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
          console.error('❌ Usage: musubix test:gen <source-file>');
          return;
        }
        await handleTestGen(filePath);
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
        await handleTrace(sub, positionalArgs);
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
        await handleTraceVerify();
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
        await handlePolicy(sub, positionalArgs);
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
        await handleOntology(sub);
      },
    },
    {
      name: 'cg',
      description: 'Code graph analysis',
      action: async (args) => {
        if (args['help'] === true || args['h'] === true) {
          console.log(showHelp('cg'));
          return;
        }
        const sub = args['subcommand'] as string | undefined;
        const positionalArgs = (args['args'] as string[] | undefined) ?? [];
        await handleCodegraph(sub, positionalArgs);
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
          console.error('❌ Usage: musubix security <path>');
          return;
        }
        await handleSecurity(filePath);
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
        await handleWorkflow(sub, positionalArgs);
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
        await handleStatus();
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
