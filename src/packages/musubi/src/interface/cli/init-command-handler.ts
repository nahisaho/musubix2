/**
 * P3-04 / DES-INS-001: Init command orchestrator — detect → confirm → plan → render → merge → write.
 */
import { readdirSync } from 'node:fs';
import { basename } from 'node:path';
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

    return {
      detectedPlatforms: selection,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      warnings,
      durationMs: Date.now() - start,
    };
  }

  private buildProjectContext(projectPath: string): ProjectContext {
    const name = basename(projectPath);
    let rootStructure: string[] = [];
    try {
      rootStructure = readdirSync(projectPath, { withFileTypes: true })
        .slice(0, 20)
        .map(d => d.isDirectory() ? `${d.name}/` : d.name);
    } catch {
      // ignore
    }

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
