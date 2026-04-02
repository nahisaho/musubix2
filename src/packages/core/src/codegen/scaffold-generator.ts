/**
 * Scaffold Generator — DES-COD-004
 *
 * DDDパターンに基づくプロジェクト構造の自動生成。3モード対応。
 */

export type ScaffoldMode = 'minimal' | 'standard' | 'full';

export interface ScaffoldConfig {
  mode: ScaffoldMode;
  packageName: string;
  description: string;
  withTests: boolean;
  withDocs: boolean;
}

export interface ScaffoldFile {
  path: string;
  content: string;
}

export class ScaffoldGenerator {
  generate(config: ScaffoldConfig): ScaffoldFile[] {
    const files: ScaffoldFile[] = [];

    // minimal: package.json, tsconfig.json, src/index.ts
    files.push(...this.generateMinimalFiles(config));

    if (config.mode === 'standard' || config.mode === 'full') {
      files.push(...this.generateStandardFiles(config));
    }

    if (config.mode === 'full') {
      files.push(...this.generateFullFiles(config));
    }

    return files;
  }

  getAvailableModes(): ScaffoldMode[] {
    return ['minimal', 'standard', 'full'];
  }

  private generateMinimalFiles(config: ScaffoldConfig): ScaffoldFile[] {
    const packageJson = {
      name: config.packageName,
      version: '0.1.0',
      description: config.description,
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc -b',
        ...(config.withTests ? { test: 'vitest run' } : {}),
      },
    };

    return [
      {
        path: 'package.json',
        content: JSON.stringify(packageJson, null, 2) + '\n',
      },
      {
        path: 'tsconfig.json',
        content:
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2022',
                module: 'Node16',
                moduleResolution: 'Node16',
                declaration: true,
                outDir: './dist',
                rootDir: './src',
                strict: true,
              },
              include: ['src'],
            },
            null,
            2,
          ) + '\n',
      },
      {
        path: 'src/index.ts',
        content: `/**\n * ${config.packageName} — ${config.description}\n */\n\nexport {};\n`,
      },
    ];
  }

  private generateStandardFiles(config: ScaffoldConfig): ScaffoldFile[] {
    const files: ScaffoldFile[] = [];

    if (config.withTests) {
      files.push({
        path: 'tests/.gitkeep',
        content: '',
      });
    }

    files.push({
      path: 'README.md',
      content: `# ${config.packageName}\n\n${config.description}\n`,
    });

    return files;
  }

  private generateFullFiles(config: ScaffoldConfig): ScaffoldFile[] {
    const files: ScaffoldFile[] = [];

    if (config.withDocs) {
      files.push({
        path: 'docs/.gitkeep',
        content: '',
      });
    }

    files.push({
      path: 'examples/.gitkeep',
      content: '',
    });

    files.push({
      path: '.eslintrc',
      content:
        JSON.stringify(
          { extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'] },
          null,
          2,
        ) + '\n',
    });

    return files;
  }
}

export function createScaffoldGenerator(): ScaffoldGenerator {
  return new ScaffoldGenerator();
}
