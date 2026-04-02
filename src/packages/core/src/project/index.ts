/**
 * Project Initializer — DES-SDD-005
 *
 * SDD対応プロジェクト構造の初期化。
 * ステアリング、ストレージ、設定ファイルの生成プランを返す。
 */

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

const TEMPLATES: Record<InitOptions['template'], string[]> = {
  minimal: [
    'steering/product.ja.md',
    'steering/project.yml',
    'musubix.config.json',
  ],
  default: [
    'steering/product.ja.md',
    'steering/structure.ja.md',
    'steering/tech.ja.md',
    'steering/project.yml',
    'steering/rules/constitution.md',
    'storage/specs/',
    'storage/tasks/tasks.md',
    'musubix.config.json',
  ],
  full: [
    'steering/product.ja.md',
    'steering/structure.ja.md',
    'steering/tech.ja.md',
    'steering/project.yml',
    'steering/rules/constitution.md',
    'storage/specs/',
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
      return { success: false, createdFiles: [], errors: [`Unknown template: ${options.template}`] };
    }

    const base = options.outputDir.endsWith('/')
      ? options.outputDir
      : `${options.outputDir}/`;

    const createdFiles = templateFiles.map(f => `${base}${f}`);

    return {
      success: errors.length === 0,
      createdFiles,
      errors,
    };
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
        error: 'Project name must start with a letter and contain only alphanumeric characters, hyphens, or underscores (max 64 chars)',
      };
    }
    return { valid: true };
  }
}

export function createProjectInitializer(): ProjectInitializer {
  return new ProjectInitializer();
}
