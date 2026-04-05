/**
 * P2-06 / DES-INS-003: Prepare Copilot setup artifacts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GeneratedFile,
  GeneratedDirectory,
  InstallContext,
  AssetEntry,
} from '../../domain/install/types.js';
import { PackageAssetCatalog } from '../../infrastructure/assets/package-asset-catalog.js';
import { PackageRootLocator } from '../../infrastructure/assets/package-root-locator.js';
import { TemplateRenderer } from '../../infrastructure/templates/template-renderer.js';
import { McpConfigGenerator } from './mcp-config-generator.js';

export interface CopilotSetupArtifacts {
  instructions: GeneratedFile;
  skills: GeneratedDirectory;
  mcpConfig: GeneratedFile;
}

export class CopilotSetupService {
  constructor(
    private readonly catalog: PackageAssetCatalog,
    private readonly renderer: TemplateRenderer,
    private readonly mcpGen: McpConfigGenerator,
    private readonly locator: PackageRootLocator,
  ) {}

  async prepare(context: InstallContext): Promise<CopilotSetupArtifacts> {
    // 1. Render copilot-instructions.md
    const instructionsContent = await this.renderer.render('copilot-instructions', context.project);
    const instructions: GeneratedFile = {
      path: '.github/copilot-instructions.md',
      content: instructionsContent,
      managed: true,
    };

    // 2. List and copy skills
    const entries = await this.catalog.list('copilot');
    const pkgRoot = this.locator.resolve(import.meta.url);
    const skillFiles: GeneratedFile[] = entries.map(e => ({
      path: `.github/skills/${e.skillName}/SKILL.md`,
      content: this.readAsset(pkgRoot, e),
      managed: false,
    }));

    const skills: GeneratedDirectory = {
      basePath: '.github/skills',
      files: skillFiles,
    };

    // 3. MCP config
    const mcpDoc = await this.mcpGen.buildCopilotConfig(context.projectPath);
    const mcpConfig: GeneratedFile = {
      path: mcpDoc.path,
      content: JSON.stringify(mcpDoc.json, null, 2) + '\n',
      managed: false,
    };

    return { instructions, skills, mcpConfig };
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
