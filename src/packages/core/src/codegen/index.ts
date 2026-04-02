/**
 * Code Generator — DES-COD-001
 *
 * テンプレートタイプに基づくTypeScriptコードスケルトン生成。
 */

export type TemplateType = 'class' | 'interface' | 'function' | 'test' | 'module' | 'cli-command';

export interface CodeGenOptions {
  templateType: TemplateType;
  name: string;
  description?: string;
  methods?: Array<{ name: string; params: string; returnType: string }>;
  implements?: string;
}

export interface GeneratedCode {
  code: string;
  filePath: string;
  templateType: TemplateType;
}

export class CodeGenerator {
  generate(options: CodeGenOptions): GeneratedCode {
    const code = this.renderTemplate(options);
    const filePath = this.resolveFilePath(options);
    return { code, filePath, templateType: options.templateType };
  }

  getTemplateTypes(): TemplateType[] {
    return ['class', 'interface', 'function', 'test', 'module', 'cli-command'];
  }

  private renderTemplate(options: CodeGenOptions): string {
    switch (options.templateType) {
      case 'class':
        return this.renderClass(options);
      case 'interface':
        return this.renderInterface(options);
      case 'function':
        return this.renderFunction(options);
      case 'test':
        return this.renderTest(options);
      case 'module':
        return this.renderModule(options);
      case 'cli-command':
        return this.renderCliCommand(options);
    }
  }

  private renderClass(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const impl = options.implements ? ` implements ${options.implements}` : '';
    const methods = (options.methods ?? [])
      .map(m => `  ${m.name}(${m.params}): ${m.returnType} {\n    throw new Error('Not implemented');\n  }`)
      .join('\n\n');

    return [
      `/**`,
      ` * ${options.name}${desc}`,
      ` */`,
      `export class ${options.name}${impl} {`,
      `  constructor() {`,
      `    // TODO: implement`,
      `  }`,
      methods ? '' : '',
      methods,
      `}`,
    ].filter((line, i) => !(line === '' && i === 7 && !methods)).join('\n');
  }

  private renderInterface(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const ext = options.implements ? ` extends ${options.implements}` : '';
    const members = (options.methods ?? [])
      .map(m => `  ${m.name}(${m.params}): ${m.returnType};`)
      .join('\n');

    return [
      `/**`,
      ` * ${options.name}${desc}`,
      ` */`,
      `export interface ${options.name}${ext} {`,
      members || '  // TODO: define members',
      `}`,
    ].join('\n');
  }

  private renderFunction(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const methods = options.methods ?? [];
    const params = methods.length > 0 ? methods[0].params : '';
    const returnType = methods.length > 0 ? methods[0].returnType : 'void';

    return [
      `/**`,
      ` * ${options.name}${desc}`,
      ` */`,
      `export function ${options.name}(${params}): ${returnType} {`,
      `  throw new Error('Not implemented');`,
      `}`,
    ].join('\n');
  }

  private renderTest(options: CodeGenOptions): string {
    const methods = options.methods ?? [{ name: 'default behavior', params: '', returnType: '' }];
    const itBlocks = methods
      .map(m => [
        `  it('should handle ${m.name}', () => {`,
        `    // TODO: implement test`,
        `    expect(true).toBe(true);`,
        `  });`,
      ].join('\n'))
      .join('\n\n');

    return [
      `import { describe, it, expect } from 'vitest';`,
      ``,
      `describe('${options.name}', () => {`,
      itBlocks,
      `});`,
    ].join('\n');
  }

  private renderModule(options: CodeGenOptions): string {
    const desc = options.description ? ` — ${options.description}` : '';
    return [
      `/**`,
      ` * ${options.name}${desc}`,
      ` */`,
      ``,
      `// Export public API here`,
      `export {};`,
    ].join('\n');
  }

  private renderCliCommand(options: CodeGenOptions): string {
    const desc = options.description ?? `The ${options.name} command`;
    const cmdName = options.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return [
      `import { Command } from 'commander';`,
      ``,
      `export const ${options.name}Command = new Command('${cmdName}')`,
      `  .description('${desc}')`,
      `  .action(async () => {`,
      `    // TODO: implement command logic`,
      `    console.log('${options.name} executed');`,
      `  });`,
    ].join('\n');
  }

  private resolveFilePath(options: CodeGenOptions): string {
    const kebab = options.name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();

    switch (options.templateType) {
      case 'test':
        return `tests/${kebab}.test.ts`;
      case 'module':
        return `src/${kebab}/index.ts`;
      case 'cli-command':
        return `src/commands/${kebab}.ts`;
      default:
        return `src/${kebab}.ts`;
    }
  }
}

export function createCodeGenerator(): CodeGenerator {
  return new CodeGenerator();
}
