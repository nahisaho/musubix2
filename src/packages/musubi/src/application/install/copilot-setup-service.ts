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
    const staged = entry.sourcePath.replace(/^\./, ''); // "..github/…" → ".github/…"
    // Prefer the staged package asset (populated at publish); fall back to the
    // monorepo source so a locally-built bin still ships real skill content.
    // Claude skills are derived from .github/skills at staging time, so also
    // map a .claude/skills source back to .github/skills for the dev fallback.
    const githubRel = staged.replace(/^\.claude\/skills\//, '.github/skills/');
    const candidates = [
      resolve(pkgRoot, staged),
      resolve(pkgRoot, '..', '..', staged),
      resolve(pkgRoot, '..', '..', githubRel),
    ];
    for (const p of candidates) {
      try {
        return readFileSync(p, 'utf-8');
      } catch {
        /* try the next candidate */
      }
    }
    return `# ${entry.skillName}\n\n_Asset not found during packaging._\n`;
  }
}
