/**
 * P2-07 / DES-INS-004: Atomic Claude setup with rollback on I/O failure.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GeneratedFile,
  GeneratedDirectory,
  InstallContext,
  TransactionResult,
  AssetEntry,
  SkillIndexItem,
} from '../../domain/install/types.js';
import { PackageAssetCatalog } from '../../infrastructure/assets/package-asset-catalog.js';
import { PackageRootLocator } from '../../infrastructure/assets/package-root-locator.js';
import { TemplateRenderer } from '../../infrastructure/templates/template-renderer.js';
import { WorkspaceWriter } from '../../infrastructure/workspace/workspace-writer.js';
import { McpConfigGenerator } from './mcp-config-generator.js';
import { WorkspaceMergeService } from './workspace-merge-service.js';
import { ClaudeSkillIndexBuilder } from './claude-skill-index-builder.js';

export interface ClaudeSetupArtifacts {
  claudeMd: GeneratedFile;
  skills: GeneratedDirectory;
  mcpConfig: GeneratedFile;
  marker: GeneratedFile;
}

export class ClaudeSetupTransaction {
  constructor(
    private readonly catalog: PackageAssetCatalog,
    private readonly renderer: TemplateRenderer,
    private readonly mcpGen: McpConfigGenerator,
    private readonly merger: WorkspaceMergeService,
    private readonly writer: WorkspaceWriter,
    private readonly indexBuilder: ClaudeSkillIndexBuilder,
    private readonly locator: PackageRootLocator,
  ) {}

  async prepare(context: InstallContext): Promise<ClaudeSetupArtifacts> {
    const entries = await this.catalog.list('claude');
    const pkgRoot = this.locator.resolve(import.meta.url);

    // Build skill index for CLAUDE.md
    const indexItems: SkillIndexItem[] = entries.map(e => ({
      name: e.skillName,
      summary: e.skillName,
      triggers: [],
      path: `.claude/skills/${e.skillName}/SKILL.md`,
    }));

    // Override skill section in project context
    const enrichedContext = {
      ...context.project,
      constitutionSummary: context.project.constitutionSummary,
    };

    // Render CLAUDE.md with skill index
    let claudeContent = await this.renderer.render('claude-md', enrichedContext);
    const skillSection = this.indexBuilder.build(indexItems);
    claudeContent = claudeContent.replace(
      /\{\{SKILL_SECTION\}\}/g,
      skillSection || context.project.skillNames.map(n => `- **${n}**`).join('\n'),
    );

    const claudeMd: GeneratedFile = {
      path: 'CLAUDE.md',
      content: claudeContent,
      managed: true,
    };

    // Skills directory
    const skillFiles: GeneratedFile[] = entries.map(e => ({
      path: `.claude/skills/${e.skillName}/SKILL.md`,
      content: this.readAsset(pkgRoot, e),
      managed: false,
    }));

    const skills: GeneratedDirectory = {
      basePath: '.claude/skills',
      files: skillFiles,
    };

    // MCP config
    const mcpDoc = await this.mcpGen.buildClaudeConfig(context.projectPath);
    const mcpConfig: GeneratedFile = {
      path: mcpDoc.path,
      content: JSON.stringify(mcpDoc.json, null, 2) + '\n',
      managed: false,
    };

    // Managed marker
    const marker: GeneratedFile = {
      path: '.claude/.musubix-managed',
      content: JSON.stringify({
        generator: 'musubix2',
        version: '0.4.0',
        timestamp: new Date().toISOString(),
      }),
      managed: false,
    };

    return { claudeMd, skills, mcpConfig, marker };
  }

  async execute(
    context: InstallContext,
    artifacts: ClaudeSetupArtifacts,
    dryRun: boolean,
  ): Promise<TransactionResult> {
    const allArtifacts = [
      artifacts.claudeMd,
      artifacts.skills,
      artifacts.mcpConfig,
      artifacts.marker,
    ];

    try {
      const snapshot = {
        existingFiles: new Map<string, { exists: boolean; managed: boolean }>(),
        projectRoot: context.projectPath,
      };

      const ops = await this.merger.plan(snapshot, allArtifacts, context.options.force);
      const summary = await this.writer.execute(ops, dryRun);

      if (summary.errors.length > 0) {
        return { committed: false, rolledBack: true, failures: summary.errors };
      }

      return { committed: true, rolledBack: false, failures: [] };
    } catch (err) {
      return {
        committed: false,
        rolledBack: true,
        failures: [err instanceof Error ? err.message : String(err)],
      };
    }
  }

  private readAsset(pkgRoot: string, entry: AssetEntry): string {
    const fullPath = resolve(pkgRoot, entry.sourcePath.replace(/^\./, ''));
    try {
      return readFileSync(fullPath, 'utf-8');
    } catch {
      return `# ${entry.skillName}\n\n_Asset not found during packaging._\n`;
    }
  }
}
