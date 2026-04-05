/**
 * P4-01: Unit tests for dual-platform install system.
 * Tests: Domain types, PlatformDetector, McpLaunchResolver, McpConfigGenerator,
 *        InstallPlanner, WorkspaceMergeService, ClaudeSkillIndexBuilder,
 *        InitModeResolver, ConfirmationResolver, DryRunReporter,
 *        WorkspaceRootResolver, PackageRootLocator, WorkspaceWriter,
 *        TemplateRenderer.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdirSync, writeFileSync, rmSync, existsSync, readFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// ── Domain types ───────────────────────────────────────────────────────────

import type {
  InitOptions, InitSummary, PlatformSelection, PlatformHints,
  PlannedArtifact, InstallPlan, GeneratedFile, GeneratedDirectory,
  WriteMode, WriteOperation, WriteSummary, InstallContext, ProjectContext,
  LaunchDefinition, McpConfigDocument, InitMode, AssetEntry, SkillIndexItem,
  DryRunItem, SseServerOptions, McpCliOptions, TransactionResult, UpdateResult,
} from '../src/domain/install/types.js';

describe('Domain types', () => {
  it('InitMode has valid values', () => {
    const modes: InitMode[] = ['legacy-project-init', 'platform-bootstrap'];
    expect(modes).toHaveLength(2);
  });

  it('WriteMode has valid values', () => {
    const modes: WriteMode[] = ['create', 'replace', 'append-section', 'merge-json', 'merge-directory'];
    expect(modes).toHaveLength(5);
  });

  it('PlatformSelection structure is valid', () => {
    const sel: PlatformSelection = { copilot: true, claude: false, source: 'flag', needsConfirmation: false };
    expect(sel.copilot).toBe(true);
    expect(sel.source).toBe('flag');
  });

  it('GeneratedFile has required fields', () => {
    const f: GeneratedFile = { path: 'test.md', content: '# test', managed: true };
    expect(f.managed).toBe(true);
  });

  it('DryRunItem conforms to interface', () => {
    const item: DryRunItem = { path: '/tmp/x', action: 'create', mode: 'create', reason: 'New file' };
    expect(item.action).toBe('create');
  });
});

// ── InitModeResolver ───────────────────────────────────────────────────────

import { InitModeResolver } from '../src/interface/cli/init-mode-resolver.js';

describe('InitModeResolver', () => {
  const resolver = new InitModeResolver();

  it('returns legacy-project-init for no flags', () => {
    expect(resolver.resolve({})).toBe('legacy-project-init');
  });

  it('returns legacy-project-init for --name --force', () => {
    expect(resolver.resolve({ name: 'foo', force: true })).toBe('legacy-project-init');
  });

  it('returns platform-bootstrap for --platform', () => {
    expect(resolver.resolve({ platform: 'auto' })).toBe('platform-bootstrap');
  });

  it('returns platform-bootstrap for --dry-run', () => {
    expect(resolver.resolve({ 'dry-run': true })).toBe('platform-bootstrap');
  });

  it('returns platform-bootstrap for --update', () => {
    expect(resolver.resolve({ update: true })).toBe('platform-bootstrap');
  });
});

// ── PlatformDetector ───────────────────────────────────────────────────────

import { PlatformDetector } from '../src/application/install/platform-detector.js';

describe('PlatformDetector', () => {
  let tmpDir: string;
  const detector = new PlatformDetector();

  beforeEach(() => {
    tmpDir = join(tmpdir(), `musubix-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects copilot from .vscode/', async () => {
    mkdirSync(join(tmpDir, '.vscode'), { recursive: true });
    const result = await detector.detect(tmpDir, 'auto');
    expect(result.copilot).toBe(true);
    expect(result.source).toBe('workspace');
  });

  it('returns flag source when --platform copilot', async () => {
    const result = await detector.detect(tmpDir, 'copilot');
    expect(result.copilot).toBe(true);
    expect(result.claude).toBe(false);
    expect(result.source).toBe('flag');
  });

  it('returns flag source when --platform both', async () => {
    const result = await detector.detect(tmpDir, 'both');
    expect(result.copilot).toBe(true);
    expect(result.claude).toBe(true);
    expect(result.source).toBe('flag');
  });

  it('excludes .claude/ with .musubix-managed marker', async () => {
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(join(tmpDir, '.claude', '.musubix-managed'), '{}');
    const result = await detector.detect(tmpDir, 'auto');
    expect(result.claude).toBe(false);
  });

  it('returns needsConfirmation when no hints found', async () => {
    const result = await detector.detect(tmpDir, 'auto');
    expect(result.needsConfirmation).toBe(true);
  });
});

// ── McpLaunchResolver ──────────────────────────────────────────────────────

import { McpLaunchResolver } from '../src/application/install/mcp-launch-resolver.js';

describe('McpLaunchResolver', () => {
  let tmpDir: string;
  const resolver = new McpLaunchResolver();

  beforeEach(() => {
    tmpDir = join(tmpdir(), `musubix-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('uses npx when no local bin exists', async () => {
    const result = await resolver.resolve(tmpDir);
    expect(result.command).toBe('npx');
    expect(result.args).toEqual(['musubix2', 'mcp']);
  });

  it('uses local bin when present', async () => {
    const binDir = join(tmpDir, 'node_modules', '.bin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, 'musubix2'), '#!/bin/sh\n');
    const result = await resolver.resolve(tmpDir);
    expect(result.command).toBe('./node_modules/.bin/musubix2');
    expect(result.args).toEqual(['mcp']);
  });
});

// ── McpConfigGenerator ─────────────────────────────────────────────────────

import { McpConfigGenerator } from '../src/application/install/mcp-config-generator.js';

describe('McpConfigGenerator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `musubix-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('builds copilot config with servers.musubix2', async () => {
    const gen = new McpConfigGenerator(new McpLaunchResolver());
    const doc = await gen.buildCopilotConfig(tmpDir);
    expect(doc.path).toBe('.vscode/mcp.json');
    const servers = (doc.json as any).servers;
    expect(servers.musubix2).toBeDefined();
    expect(servers.musubix2.type).toBe('stdio');
  });

  it('builds claude config with mcpServers.musubix2', async () => {
    const gen = new McpConfigGenerator(new McpLaunchResolver());
    const doc = await gen.buildClaudeConfig(tmpDir);
    expect(doc.path).toBe('.mcp.json');
    const mcpServers = (doc.json as any).mcpServers;
    expect(mcpServers.musubix2).toBeDefined();
  });
});

// ── InstallPlanner ─────────────────────────────────────────────────────────

import { InstallPlanner } from '../src/application/install/install-planner.js';

describe('InstallPlanner', () => {
  const planner = new InstallPlanner();
  const dummySnapshot = { existingFiles: new Map(), projectRoot: '/tmp' };
  const dummyOptions: InitOptions = { projectPath: '/tmp', platform: 'auto', force: false, dryRun: false, update: false };

  it('plans copilot artifacts', async () => {
    const plan = await planner.buildPlan(
      { copilot: true, claude: false, source: 'flag', needsConfirmation: false },
      dummySnapshot, dummyOptions,
    );
    expect(plan.artifacts.filter(a => a.platform === 'copilot')).toHaveLength(3);
    expect(plan.transactionalGroups).toHaveLength(0);
  });

  it('plans claude artifacts with transaction group', async () => {
    const plan = await planner.buildPlan(
      { copilot: false, claude: true, source: 'flag', needsConfirmation: false },
      dummySnapshot, dummyOptions,
    );
    expect(plan.artifacts.filter(a => a.platform === 'claude')).toHaveLength(4);
    expect(plan.transactionalGroups).toContain('claude-setup');
  });

  it('warns when no platform selected', async () => {
    const plan = await planner.buildPlan(
      { copilot: false, claude: false, source: 'candidate', needsConfirmation: false },
      dummySnapshot, dummyOptions,
    );
    expect(plan.warnings.length).toBeGreaterThan(0);
  });
});

// ── ClaudeSkillIndexBuilder ────────────────────────────────────────────────

import { ClaudeSkillIndexBuilder } from '../src/application/install/claude-skill-index-builder.js';

describe('ClaudeSkillIndexBuilder', () => {
  it('builds skill index table', () => {
    const builder = new ClaudeSkillIndexBuilder();
    const result = builder.build([
      { name: 'orchestrator', summary: 'SDD orchestration', triggers: ['workflow'], path: '.claude/skills/orchestrator/SKILL.md' },
    ]);
    expect(result).toContain('orchestrator');
    expect(result).toContain('SDD orchestration');
    expect(result).toContain('workflow');
  });

  it('returns empty string for empty items', () => {
    const builder = new ClaudeSkillIndexBuilder();
    expect(builder.build([])).toBe('');
  });
});

// ── WorkspaceRootResolver ──────────────────────────────────────────────────

import { WorkspaceRootResolver } from '../src/infrastructure/workspace/workspace-root-resolver.js';

describe('WorkspaceRootResolver', () => {
  const resolver = new WorkspaceRootResolver();

  it('prefers INIT_CWD', () => {
    expect(resolver.resolveFromLifecycle({ INIT_CWD: '/a' }, '/b')).toBe('/a');
  });

  it('falls back to npm_config_local_prefix', () => {
    expect(resolver.resolveFromLifecycle({ npm_config_local_prefix: '/c' }, '/b')).toBe('/c');
  });

  it('falls back to cwd', () => {
    expect(resolver.resolveFromLifecycle({}, '/b')).toBe('/b');
  });
});

// ── WorkspaceWriter ────────────────────────────────────────────────────────

import { WorkspaceWriter } from '../src/infrastructure/workspace/workspace-writer.js';

describe('WorkspaceWriter', () => {
  let tmpDir: string;
  const writer = new WorkspaceWriter();

  beforeEach(() => {
    tmpDir = join(tmpdir(), `musubix-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('dry run does not write files', async () => {
    const ops: WriteOperation[] = [
      { targetPath: join(tmpDir, 'new.txt'), mode: 'create', content: 'hello' },
    ];
    const summary = await writer.execute(ops, true);
    expect(summary.created).toHaveLength(1);
    expect(existsSync(join(tmpDir, 'new.txt'))).toBe(false);
  });

  it('creates files during real execution', async () => {
    const ops: WriteOperation[] = [
      { targetPath: join(tmpDir, 'file.txt'), mode: 'create', content: 'content' },
    ];
    const summary = await writer.execute(ops, false);
    expect(summary.created).toHaveLength(1);
    expect(readFileSync(join(tmpDir, 'file.txt'), 'utf-8')).toBe('content');
  });

  it('creates backups for existing files', async () => {
    const filePath = join(tmpDir, 'existing.txt');
    writeFileSync(filePath, 'old');
    const ops: WriteOperation[] = [
      { targetPath: filePath, mode: 'replace', content: 'new' },
    ];
    const summary = await writer.execute(ops, false);
    expect(summary.updated).toHaveLength(1);
    expect(existsSync(`${filePath}.bak`)).toBe(true);
    expect(readFileSync(`${filePath}.bak`, 'utf-8')).toBe('old');
    expect(readFileSync(filePath, 'utf-8')).toBe('new');
  });
});

// ── DryRunReporter ─────────────────────────────────────────────────────────

import { DryRunReporter } from '../src/interface/cli/dry-run-reporter.js';

describe('DryRunReporter', () => {
  it('formats operations with summary counts', () => {
    const reporter = new DryRunReporter();
    const output = reporter.format([
      { targetPath: '/tmp/new.md', mode: 'create', content: 'x' },
    ]);
    expect(output).toContain('Dry Run');
    expect(output).toContain('1 create');
  });
});

// ── ConfirmationResolver ───────────────────────────────────────────────────

import { ConfirmationResolver } from '../src/interface/cli/confirmation-resolver.js';

describe('ConfirmationResolver', () => {
  it('returns unchanged selection when no confirmation needed', async () => {
    const resolver = new ConfirmationResolver();
    const sel: PlatformSelection = { copilot: true, claude: false, source: 'flag', needsConfirmation: false };
    const result = await resolver.resolveCandidate(sel, false);
    expect(result).toEqual(sel);
  });

  it('returns empty selection for non-interactive with needsConfirmation', async () => {
    const resolver = new ConfirmationResolver();
    const sel: PlatformSelection = { copilot: false, claude: false, source: 'candidate', needsConfirmation: true };
    const result = await resolver.resolveCandidate(sel, false);
    expect(result.copilot).toBe(false);
    expect(result.claude).toBe(false);
    expect(result.needsConfirmation).toBe(false);
  });
});

// ── WorkspaceMergeService ──────────────────────────────────────────────────

import { WorkspaceMergeService } from '../src/application/install/workspace-merge-service.js';

describe('WorkspaceMergeService', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `musubix-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('plans create for new files', async () => {
    const merger = new WorkspaceMergeService();
    const ops = await merger.plan(
      { existingFiles: new Map(), projectRoot: tmpDir },
      [{ path: 'new.md', content: 'hello', managed: false }],
      false,
    );
    expect(ops[0].mode).toBe('create');
  });

  it('plans merge-json for existing JSON files', async () => {
    const jsonPath = join(tmpDir, 'config.json');
    writeFileSync(jsonPath, JSON.stringify({ a: 1 }));
    const merger = new WorkspaceMergeService();
    const ops = await merger.plan(
      { existingFiles: new Map(), projectRoot: tmpDir },
      [{ path: 'config.json', content: JSON.stringify({ b: 2 }), managed: false }],
      false,
    );
    expect(ops[0].mode).toBe('merge-json');
    const merged = JSON.parse(ops[0].content!);
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(2);
  });
});

// ── PackageRootLocator ─────────────────────────────────────────────────────

import { PackageRootLocator } from '../src/infrastructure/assets/package-root-locator.js';

describe('PackageRootLocator', () => {
  it('resolves to package root from import.meta.url', () => {
    const locator = new PackageRootLocator();
    const root = locator.resolve(import.meta.url);
    expect(existsSync(join(root, 'package.json'))).toBe(true);
  });
});
