/**
 * Code Generator — DES-COD-001
 *
 * テンプレートタイプに基づくTypeScriptコードスケルトン生成。
 */

export type TemplateType =
  | 'class'
  | 'interface'
  | 'function'
  | 'test'
  | 'module'
  | 'cli-command'
  | 'enum'
  | 'repository'
  | 'factory'
  | 'event'
  | 'dto'
  | 'validator';

export interface CodeGenOptions {
  templateType: TemplateType;
  name: string;
  description?: string;
  methods?: Array<{ name: string; params: string; returnType: string }>;
  implements?: string;
  /** Design patterns (Observer, State, Feature Toggle, …) to scaffold into the class. */
  patterns?: string[];
  /** State names (from WHILE clauses) for a State-pattern enum. */
  states?: string[];
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
    return [
      'class',
      'interface',
      'function',
      'test',
      'module',
      'cli-command',
      'enum',
      'repository',
      'factory',
      'event',
      'dto',
      'validator',
    ];
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
      case 'enum':
        return this.renderEnum(options);
      case 'repository':
        return this.renderRepository(options);
      case 'factory':
        return this.renderFactory(options);
      case 'event':
        return this.renderEvent(options);
      case 'dto':
        return this.renderDto(options);
      case 'validator':
        return this.renderValidator(options);
    }
  }

  private renderClass(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const impl = options.implements ? ` implements ${options.implements}` : '';
    const patterns = new Set(options.patterns ?? []);
    const hasToggle = patterns.has('Feature Toggle');
    const hasState = patterns.has('State');
    const hasObserver = patterns.has('Observer');

    const preamble: string[] = []; // declarations emitted before the class (e.g. state enum)
    const fields: string[] = [];
    const extraMethods: string[] = [];

    // State pattern → a state enum and a current-state field. The states are
    // inferred from the requirements' WHILE clauses when available (with an
    // initial Idle state); otherwise a placeholder is emitted.
    if (hasState) {
      const enumName = `${options.name}State`;
      const inferred = [...new Set((options.states ?? []).filter((s) => s && s !== 'Idle'))];
      const stateNames = inferred.length > 0 ? ['Idle', ...inferred] : ['Idle', 'Active', 'Done'];
      preamble.push(
        `export enum ${enumName} {`,
        ...stateNames.map((s) => `  ${s} = '${s.toLowerCase()}',`),
        '}',
        '',
      );
      if (inferred.length === 0) {
        fields.push(`  // TODO: refine the states for ${options.name}`);
      }
      fields.push(`  private state: ${enumName} = ${enumName}.Idle;`);
    }

    // Observer pattern → listener registry and an emit helper.
    if (hasObserver) {
      fields.push('  private readonly listeners: Array<(event: unknown) => void> = [];');
      extraMethods.push(
        '  on(handler: (event: unknown) => void): void {\n    this.listeners.push(handler);\n  }',
        '  private emit(event: unknown): void {\n    for (const listener of this.listeners) {\n      listener(event);\n    }\n  }',
      );
    }

    // Feature Toggle pattern → an `enabled` flag guarding each operation.
    const ctor = hasToggle
      ? '  constructor(private readonly enabled: boolean = false) {}'
      : '  constructor() {\n    // TODO: implement\n  }';

    const methods = (options.methods ?? [])
      .map((m) => {
        const guard = hasToggle ? this.toggleGuard(m.returnType) : '';
        return `  ${m.name}(${m.params}): ${m.returnType} {\n${guard}    throw new Error('Not implemented');\n  }`;
      });

    const body = [ctor, ...fields, ...extraMethods, ...methods].join('\n\n');

    return [
      ...preamble,
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export class ${options.name}${impl} {`,
      body,
      '}',
    ].join('\n');
  }

  /** A Feature Toggle early-return guard, typed to the method's return value. */
  private toggleGuard(returnType: string): string {
    const rt = returnType.trim();
    if (rt === 'void' || rt === '') {return '    if (!this.enabled) { return; }\n';}
    if (rt === 'boolean') {return '    if (!this.enabled) { return false; }\n';}
    if (rt.endsWith('[]')) {return '    if (!this.enabled) { return []; }\n';}
    return '    // feature toggle: no-op when this.enabled is false\n';
  }

  private renderInterface(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const ext = options.implements ? ` extends ${options.implements}` : '';
    const members = (options.methods ?? [])
      .map((m) => `  ${m.name}(${m.params}): ${m.returnType};`)
      .join('\n');

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export interface ${options.name}${ext} {`,
      members || '  // TODO: define members',
      '}',
    ].join('\n');
  }

  private renderFunction(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const methods = options.methods ?? [];
    const params = methods.length > 0 ? methods[0].params : '';
    const returnType = methods.length > 0 ? methods[0].returnType : 'void';

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export function ${options.name}(${params}): ${returnType} {`,
      "  throw new Error('Not implemented');",
      '}',
    ].join('\n');
  }

  private renderTest(options: CodeGenOptions): string {
    const methods = options.methods ?? [{ name: 'default behavior', params: '', returnType: '' }];
    const itBlocks = methods
      .map((m) =>
        [
          `  it('should handle ${m.name}', () => {`,
          '    // TODO: implement test',
          '    expect(true).toBe(true);',
          '  });',
        ].join('\n'),
      )
      .join('\n\n');

    return [
      "import { describe, it, expect } from 'vitest';",
      '',
      `describe('${options.name}', () => {`,
      itBlocks,
      '});',
    ].join('\n');
  }

  private renderModule(options: CodeGenOptions): string {
    const desc = options.description ? ` — ${options.description}` : '';
    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      '',
      '// Export public API here',
      'export {};',
    ].join('\n');
  }

  private renderCliCommand(options: CodeGenOptions): string {
    const desc = options.description ?? `The ${options.name} command`;
    const cmdName = options.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return [
      "import { Command } from 'commander';",
      '',
      `export const ${options.name}Command = new Command('${cmdName}')`,
      `  .description('${desc}')`,
      '  .action(async () => {',
      '    // TODO: implement command logic',
      `    console.log('${options.name} executed');`,
      '  });',
    ].join('\n');
  }

  private renderEnum(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const members = (options.methods ?? [])
      .map((m) => `  ${m.name} = '${m.name}'`)
      .join(',\n');

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export enum ${options.name} {`,
      members || '  // TODO: define members',
      '}',
    ].join('\n');
  }

  private renderRepository(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const entityName = options.name.replace(/Repository$/, '') || 'Entity';

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export interface I${options.name} {`,
      `  findById(id: string): ${entityName} | undefined;`,
      `  save(entity: ${entityName}): void;`,
      '  delete(id: string): void;',
      `  findAll(): ${entityName}[];`,
      '}',
      '',
      `export class InMemory${options.name} implements I${options.name} {`,
      `  private items = new Map<string, ${entityName}>();`,
      '',
      `  findById(id: string): ${entityName} | undefined {`,
      '    return this.items.get(id);',
      '  }',
      '',
      `  save(entity: ${entityName}): void {`,
      "    this.items.set((entity as any).id ?? '', entity);",
      '  }',
      '',
      '  delete(id: string): void {',
      '    this.items.delete(id);',
      '  }',
      '',
      `  findAll(): ${entityName}[] {`,
      '    return [...this.items.values()];',
      '  }',
      '}',
    ].join('\n');
  }

  private renderFactory(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const productName = options.name.replace(/Factory$/, '') || 'Product';

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export function create${productName}(options?: Partial<${productName}>): ${productName} {`,
      `  return { ...options } as ${productName};`,
      '}',
    ].join('\n');
  }

  private renderEvent(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const eventName = options.name;

    return [
      '/**',
      ` * ${eventName}${desc}`,
      ' */',
      `export interface ${eventName} {`,
      '  readonly type: string;',
      '  readonly timestamp: Date;',
      '  readonly payload: unknown;',
      '}',
      '',
      `export type ${eventName}Handler = (event: ${eventName}) => void;`,
    ].join('\n');
  }

  private renderDto(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';
    const members = (options.methods ?? [])
      .map((m) => `  readonly ${m.name}: ${m.returnType};`)
      .join('\n');

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export interface ${options.name} {`,
      members || '  // TODO: define fields',
      '}',
    ].join('\n');
  }

  private renderValidator(options: CodeGenOptions): string {
    const desc = options.description ? `\n * ${options.description}` : '';

    return [
      '/**',
      ` * ${options.name}${desc}`,
      ' */',
      `export class ${options.name} {`,
      '  validate(input: unknown): { valid: boolean; errors: string[] } {',
      '    const errors: string[] = [];',
      '    // TODO: implement validation rules',
      '    return { valid: errors.length === 0, errors };',
      '  }',
      '}',
    ].join('\n');
  }

  private resolveFilePath(options: CodeGenOptions): string {
    const kebab = options.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

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
