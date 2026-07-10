/**
 * P1-04 / DES-CFG-001: Render templates with project context injection.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProjectContext } from '../../domain/install/types.js';
import { PackageRootLocator } from '../assets/package-root-locator.js';

export type TemplateId = 'claude-md' | 'copilot-instructions';

const TEMPLATE_FILES: Record<TemplateId, string> = {
  'claude-md': 'claude-md.md',
  'copilot-instructions': 'copilot-instructions.md',
};

export class TemplateRenderer {
  constructor(private readonly locator: PackageRootLocator) {}

  async render(templateId: TemplateId, context: ProjectContext): Promise<string> {
    const root = this.locator.resolve(import.meta.url);
    const templatePath = resolve(root, 'dist', 'templates', TEMPLATE_FILES[templateId]);

    if (!existsSync(templatePath)) {
      // Fallback to src/templates during development
      const srcPath = resolve(root, 'src', 'templates', TEMPLATE_FILES[templateId]);
      if (!existsSync(srcPath)) {
        throw new Error(`Template not found: ${templateId}`);
      }
      return this.interpolate(readFileSync(srcPath, 'utf-8'), context);
    }

    return this.interpolate(readFileSync(templatePath, 'utf-8'), context);
  }

  private interpolate(template: string, ctx: ProjectContext): string {
    return template
      .replace(/\{\{PROJECT_NAME\}\}/g, ctx.projectName)
      .replace(/\{\{ROOT_STRUCTURE\}\}/g, ctx.rootStructure.join('\n'))
      .replace(/\{\{CONSTITUTION_SUMMARY\}\}/g, ctx.constitutionSummary.join('\n'))
      .replace(/\{\{SKILL_SECTION\}\}/g, this.buildSkillSection(ctx.skillNames));
  }

  private buildSkillSection(skillNames: string[]): string {
    if (skillNames.length === 0) {return '_No skills configured._';}
    return skillNames.map(n => `- **${n}**`).join('\n');
  }
}
