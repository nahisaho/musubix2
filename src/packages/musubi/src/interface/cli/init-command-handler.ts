/**
 * P3-04 / DES-INS-001: Init command orchestrator — detect → confirm → plan → render → merge → write.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import type {
  InitOptions,
  InitSummary,
  InstallContext,
  ProjectContext,
  WorkspaceSnapshot,
  GeneratedArtifacts,
} from '../../domain/install/types.js';
import { PlatformDetector } from '../../application/install/platform-detector.js';
import { InstallPlanner } from '../../application/install/install-planner.js';
import { CopilotSetupService } from '../../application/install/copilot-setup-service.js';
import { ClaudeSetupTransaction } from '../../application/install/claude-setup-transaction.js';
import { WorkspaceMergeService } from '../../application/install/workspace-merge-service.js';
import { UpdateService } from '../../application/install/update-service.js';
import { McpLaunchResolver } from '../../application/install/mcp-launch-resolver.js';
import { McpConfigGenerator } from '../../application/install/mcp-config-generator.js';
import { ClaudeSkillIndexBuilder } from '../../application/install/claude-skill-index-builder.js';
import { PackageRootLocator } from '../../infrastructure/assets/package-root-locator.js';
import { PackageAssetCatalog } from '../../infrastructure/assets/package-asset-catalog.js';
import { TemplateRenderer } from '../../infrastructure/templates/template-renderer.js';
import { WorkspaceWriter } from '../../infrastructure/workspace/workspace-writer.js';
import { ConfirmationResolver } from './confirmation-resolver.js';
import { DryRunReporter } from './dry-run-reporter.js';

/**
 * Starter requirements document in the exact format the EARS parser accepts
 * (`## REQ-XXX-000:` heading + `**要件**:` field). Gives `musubix requirements
 * analyze` something parseable on first run.
 */
const STARTER_REQUIREMENTS = `# 要件定義書

> \`musubix requirements analyze storage/specs/requirements.md\` で解析できます。
> 要件は見出し形式・ID は \`REQ-<3文字ドメイン>-<3桁連番>\` で記述してください。

## REQ-SMP-001: サンプル要件
**種別**: UBIQUITOUS
**優先度**: P1
**要件**:
THE システム SHALL ユーザーにサンプル機能を提供する。

**受入基準**:
- [ ] サンプル機能が動作する
`;

export class InitCommandHandler {
  constructor(
    private readonly detector: PlatformDetector,
    private readonly confirmation: ConfirmationResolver,
    private readonly planner: InstallPlanner,
    private readonly copilotSetup: CopilotSetupService,
    private readonly claudeSetup: ClaudeSetupTransaction,
    private readonly merger: WorkspaceMergeService,
    private readonly writer: WorkspaceWriter,
    private readonly updateService: UpdateService,
    private readonly dryRunReporter: DryRunReporter,
  ) {}

  async run(options: InitOptions): Promise<InitSummary> {
    const start = Date.now();
    const warnings: string[] = [];

    // 1. Detect
    let selection = await this.detector.detect(options.projectPath, options.platform);

    // 2. Confirm if needed
    if (selection.needsConfirmation) {
      const isTTY = process.stdout.isTTY === true;
      selection = await this.confirmation.resolveCandidate(selection, isTTY);
      if (!selection.copilot && !selection.claude) {
        warnings.push('No platform confirmed. Skipping setup.');
      }
    }

    // 3. Build project context
    const project = this.buildProjectContext(options.projectPath);
    const context: InstallContext = {
      projectPath: options.projectPath,
      options,
      selection,
      project,
    };

    // 4. Build plan
    const snapshot: WorkspaceSnapshot = {
      existingFiles: new Map(),
      projectRoot: options.projectPath,
    };
    const plan = await this.planner.buildPlan(selection, snapshot, options);
    warnings.push(...plan.warnings);

    // 5. Generate artifacts
    const allArtifacts: GeneratedArtifacts = [];

    if (selection.copilot) {
      const copilotArtifacts = await this.copilotSetup.prepare(context);
      allArtifacts.push(copilotArtifacts.instructions, copilotArtifacts.skills, copilotArtifacts.mcpConfig);
    }

    if (selection.claude) {
      const claudeArtifacts = await this.claudeSetup.prepare(context);
      // Execute as transaction
      const txResult = await this.claudeSetup.execute(context, claudeArtifacts, options.dryRun);
      if (!txResult.committed && !options.dryRun) {
        warnings.push(...txResult.failures.map(f => `Claude setup failed: ${f}`));
      }
    }

    // 6. Merge copilot artifacts (Claude handled by transaction above)
    const copilotOps = selection.copilot
      ? await this.merger.plan(snapshot, allArtifacts, options.force)
      : [];

    // 7. Dry run or execute
    if (options.dryRun) {
      const report = this.dryRunReporter.format(copilotOps);
      process.stdout.write(report);
    } else if (options.update) {
      await this.updateService.run(context, copilotOps);
    } else {
      await this.writer.execute(copilotOps, false);
    }

    const summary = await this.writer.execute([], true); // get summary structure

    // 8. Scaffold the SDD workspace (steering/, storage/specs/) with a
    // parseable starter requirements doc. Best-effort; never overwrites.
    const scaffolded = options.dryRun
      ? []
      : this.scaffoldSddWorkspace(options.projectPath);

    return {
      detectedPlatforms: selection,
      created: [...summary.created, ...scaffolded],
      updated: summary.updated,
      skipped: summary.skipped,
      warnings,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Create the SDD directory skeleton and a parseable starter requirements
   * document. Idempotent and non-destructive — existing files are left as-is.
   * Returns the relative paths of files/dirs actually created.
   */
  private scaffoldSddWorkspace(projectPath: string): string[] {
    const created: string[] = [];
    try {
      for (const dir of ['steering', 'storage/specs']) {
        const abs = join(projectPath, dir);
        if (!existsSync(abs)) {
          mkdirSync(abs, { recursive: true });
          created.push(`${dir}/`);
        }
      }
      const reqPath = join(projectPath, 'storage/specs/requirements.md');
      if (!existsSync(reqPath)) {
        writeFileSync(reqPath, STARTER_REQUIREMENTS, 'utf-8');
        created.push('storage/specs/requirements.md');
      }
    } catch {
      // Best-effort — scaffolding failure must not fail init.
    }
    return created;
  }

  private buildProjectContext(projectPath: string): ProjectContext {
    const name = basename(projectPath);
    // Document the canonical MUSUBIX2 SDD layout rather than a raw directory
    // listing — the generated CLAUDE.md should teach the intended structure,
    // not echo transient files like node_modules/.
    const rootStructure: string[] = [
      'steering/            # プロジェクトメモリ（決定前に参照）',
      'storage/specs/       # requirements / design / tasks 仕様',
      '.claude/skills/      # SDD Agent Skills',
      'src/                 # 実装コード',
      'tests/               # テストコード',
    ];

    return {
      projectName: name,
      packageManager: 'npm',
      rootStructure,
      skillNames: [
        'orchestrator', 'requirements-analyst', 'design-generator',
        'code-generator', 'test-engineer', 'constitution-enforcer',
        'traceability-auditor', 'review-orchestrator', 'skill-scaffolder',
        'orchestrator-designer', 'description-optimizer', 'purpose-discovery',
        'gotchas-curator', 'harness-auditor',
      ],
      constitutionSummary: [
        '1. ライブラリファースト',
        '2. CLI インターフェース',
        '3. テストファースト',
        '4. EARS 形式',
        '5. トレーサビリティ',
        '6. プロジェクトメモリ',
        '7. デザインパターン文書化',
        '8. ADR 記録',
        '9. 品質ゲート',
      ],
    };
  }
}

/**
 * Factory: wire all dependencies for InitCommandHandler.
 */
export function createInitCommandHandler(): InitCommandHandler {
  const locator = new PackageRootLocator();
  const catalog = new PackageAssetCatalog(locator);
  const renderer = new TemplateRenderer(locator);
  const launchResolver = new McpLaunchResolver();
  const mcpGen = new McpConfigGenerator(launchResolver);
  const merger = new WorkspaceMergeService();
  const writer = new WorkspaceWriter();
  const indexBuilder = new ClaudeSkillIndexBuilder();

  const copilotSetup = new CopilotSetupService(catalog, renderer, mcpGen, locator);
  const claudeSetup = new ClaudeSetupTransaction(catalog, renderer, mcpGen, merger, writer, indexBuilder, locator);
  const updateService = new UpdateService(merger, writer);
  const detector = new PlatformDetector();
  const confirmation = new ConfirmationResolver();
  const planner = new InstallPlanner();
  const dryRunReporter = new DryRunReporter();

  return new InitCommandHandler(
    detector, confirmation, planner, copilotSetup, claudeSetup,
    merger, writer, updateService, dryRunReporter,
  );
}
