/**
 * Project Initializer — DES-SDD-005
 *
 * SDD対応プロジェクト構造の初期化。ステアリング、ストレージ、設定ファイルを
 * 実際に生成する。
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface InitOptions {
  projectName: string;
  template: 'default' | 'minimal' | 'full';
  outputDir: string;
  overwrite?: boolean;
}

export interface InitResult {
  success: boolean;
  createdFiles: string[];
  errors: string[];
}

interface TemplateInfo {
  name: string;
  description: string;
}

const PROJECT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

const CONSTITUTION_MD = `# 9 憲法条項（Constitutional Articles）

| Article | 原則 |
|---------|------|
| I | Library-First Architecture |
| II | CLI Interface Mandate |
| III | Test-First Development |
| IV | Project Memory |
| V | Traceability |
| VI | Agent Memory Format |
| VII | Simplicity Gate |
| VIII | Anti-Abstraction |
| IX | Integration Testing |
`;

const TEMPLATES: Record<InitOptions['template'], string[]> = {
  minimal: [
    'steering/product.ja.md',
    'steering/project.yml',
    'storage/specs/requirements/',
    'storage/specs/designs/',
    'storage/specs/plans/',
    'storage/specs/reviews/',
    'musubix.config.json',
  ],
  default: [
    'steering/product.ja.md',
    'steering/structure.ja.md',
    'steering/tech.ja.md',
    'steering/project.yml',
    'steering/rules/constitution.md',
    'storage/specs/requirements/',
    'storage/specs/designs/',
    'storage/specs/plans/',
    'storage/specs/reviews/',
    'storage/tasks/tasks.md',
    'musubix.config.json',
  ],
  full: [
    'steering/product.ja.md',
    'steering/structure.ja.md',
    'steering/tech.ja.md',
    'steering/project.yml',
    'steering/rules/constitution.md',
    'storage/specs/requirements/',
    'storage/specs/designs/',
    'storage/specs/plans/',
    'storage/specs/reviews/',
    'storage/tasks/tasks.md',
    '.github/skills/',
    'musubix.config.json',
  ],
};

export class ProjectInitializer {
  init(options: InitOptions): InitResult {
    const errors: string[] = [];

    const nameCheck = this.validateProjectName(options.projectName);
    if (!nameCheck.valid) {
      return { success: false, createdFiles: [], errors: [nameCheck.error!] };
    }

    const templateFiles = TEMPLATES[options.template];
    if (!templateFiles) {
      return {
        success: false,
        createdFiles: [],
        errors: [`Unknown template: ${options.template}`],
      };
    }

    const base = options.outputDir;
    const createdFiles: string[] = [];

    for (const rel of templateFiles) {
      const target = join(base, rel);
      try {
        if (rel.endsWith('/')) {
          // Directory placeholder — create it so the structure exists.
          mkdirSync(target, { recursive: true });
        } else {
          if (existsSync(target) && !options.overwrite) {
            continue; // don't clobber existing files unless --force
          }
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, this.contentFor(rel, options.projectName), 'utf-8');
        }
        createdFiles.push(join(base.endsWith('/') ? base : `${base}/`, rel));
      } catch (err) {
        errors.push(`${rel}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      success: errors.length === 0,
      createdFiles,
      errors,
    };
  }

  /** Default content for each scaffolded file. */
  private contentFor(rel: string, projectName: string): string {
    switch (rel) {
      case 'musubix.config.json':
        return JSON.stringify(
          { name: projectName, version: '0.1.0', sdd: { specsDir: 'storage/specs', steeringDir: 'steering' } },
          null,
          2,
        ) + '\n';
      case 'steering/project.yml':
        return `name: ${projectName}\nversion: 0.1.0\n`;
      case 'steering/product.ja.md':
        return `# ${projectName} — プロダクト概要\n\n<!-- プロダクトのゴール、対象ユーザー、価値を記述 -->\n`;
      case 'steering/structure.ja.md':
        return `# ${projectName} — プロジェクト構造\n\n<!-- ディレクトリ構成、モジュール分割を記述 -->\n`;
      case 'steering/tech.ja.md':
        return `# ${projectName} — 技術スタック\n\n<!-- 言語、フレームワーク、インフラを記述 -->\n`;
      case 'steering/rules/constitution.md':
        return CONSTITUTION_MD;
      case 'storage/tasks/tasks.md':
        return '# タスク\n\n<!-- musubix tasks で管理 -->\n';
      default:
        return `# ${rel}\n`;
    }
  }

  getTemplates(): TemplateInfo[] {
    return [
      { name: 'minimal', description: 'Minimal SDD project with steering and config only' },
      { name: 'default', description: 'Standard SDD project with steering, storage, and config' },
      { name: 'full', description: 'Full SDD project including GitHub skills integration' },
    ];
  }

  validateProjectName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Project name must not be empty' };
    }
    if (!PROJECT_NAME_PATTERN.test(name)) {
      return {
        valid: false,
        error:
          'Project name must start with a letter and contain only alphanumeric characters, hyphens, or underscores (max 64 chars)',
      };
    }
    return { valid: true };
  }
}

export function createProjectInitializer(): ProjectInitializer {
  return new ProjectInitializer();
}
