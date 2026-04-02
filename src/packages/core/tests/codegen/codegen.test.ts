import { describe, it, expect } from 'vitest';
import {
  CodeGenerator,
  createCodeGenerator,
  type CodeGenOptions,
} from '../../src/codegen/index.js';

describe('DES-COD-001: CodeGenerator', () => {
  it('should generate a class skeleton', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'class',
      name: 'UserService',
      description: 'Manages users',
      methods: [
        { name: 'findById', params: 'id: string', returnType: 'User' },
      ],
    });

    expect(result.templateType).toBe('class');
    expect(result.code).toContain('export class UserService');
    expect(result.code).toContain('findById(id: string): User');
    expect(result.code).toContain('constructor');
    expect(result.filePath).toContain('user-service.ts');
  });

  it('should generate an interface', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'interface',
      name: 'IUserRepo',
      methods: [
        { name: 'find', params: 'id: string', returnType: 'User' },
        { name: 'save', params: 'user: User', returnType: 'void' },
      ],
    });

    expect(result.code).toContain('export interface IUserRepo');
    expect(result.code).toContain('find(id: string): User;');
    expect(result.code).toContain('save(user: User): void;');
  });

  it('should generate an exported function', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'function',
      name: 'calculateTotal',
      methods: [{ name: 'calculateTotal', params: 'items: Item[]', returnType: 'number' }],
    });

    expect(result.code).toContain('export function calculateTotal(items: Item[]): number');
  });

  it('should generate a vitest test skeleton', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'test',
      name: 'UserService',
      methods: [
        { name: 'create user', params: '', returnType: '' },
        { name: 'delete user', params: '', returnType: '' },
      ],
    });

    expect(result.code).toContain("import { describe, it, expect } from 'vitest'");
    expect(result.code).toContain("describe('UserService'");
    expect(result.code).toContain('should handle create user');
    expect(result.code).toContain('should handle delete user');
    expect(result.filePath).toContain('.test.ts');
  });

  it('should generate a module barrel export', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'module',
      name: 'Auth',
      description: 'Authentication module',
    });

    expect(result.code).toContain('Auth');
    expect(result.code).toContain('Authentication module');
    expect(result.filePath).toContain('index.ts');
  });

  it('should generate a CLI command', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'cli-command',
      name: 'init',
      description: 'Initialize project',
    });

    expect(result.code).toContain("import { Command } from 'commander'");
    expect(result.code).toContain("new Command('init')");
    expect(result.code).toContain('Initialize project');
    expect(result.filePath).toContain('commands/');
  });

  it('should support implements for class', () => {
    const gen = new CodeGenerator();
    const result = gen.generate({
      templateType: 'class',
      name: 'SqlRepo',
      implements: 'IRepository',
    });

    expect(result.code).toContain('implements IRepository');
  });

  it('should list all template types', () => {
    const gen = new CodeGenerator();
    const types = gen.getTemplateTypes();

    expect(types).toContain('class');
    expect(types).toContain('interface');
    expect(types).toContain('function');
    expect(types).toContain('test');
    expect(types).toContain('module');
    expect(types).toContain('cli-command');
    expect(types).toHaveLength(6);
  });

  it('should be created by factory function', () => {
    const gen = createCodeGenerator();
    expect(gen).toBeInstanceOf(CodeGenerator);
  });
});
