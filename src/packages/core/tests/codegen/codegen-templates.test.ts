import { describe, it, expect } from 'vitest';
import { CodeGenerator, type TemplateType } from '../../src/codegen/index.js';

describe('REQ-COD-001: CodeGenerator — 12 template types', () => {
  const gen = new CodeGenerator();

  it('should list all 12 template types', () => {
    const types = gen.getTemplateTypes();
    expect(types).toHaveLength(12);
    const expected: TemplateType[] = [
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
    for (const t of expected) {
      expect(types).toContain(t);
    }
  });

  it('should generate enum code', () => {
    const result = gen.generate({
      templateType: 'enum',
      name: 'Status',
      description: 'Task status',
      methods: [
        { name: 'Active', params: '', returnType: '' },
        { name: 'Inactive', params: '', returnType: '' },
      ],
    });

    expect(result.templateType).toBe('enum');
    expect(result.code).toContain('export enum Status');
    expect(result.code).toContain("Active = 'Active'");
    expect(result.code).toContain("Inactive = 'Inactive'");
  });

  it('should generate repository code', () => {
    const result = gen.generate({
      templateType: 'repository',
      name: 'UserRepository',
      description: 'User persistence',
    });

    expect(result.templateType).toBe('repository');
    expect(result.code).toContain('export interface IUserRepository');
    expect(result.code).toContain('findById(id: string)');
    expect(result.code).toContain('export class InMemoryUserRepository');
    expect(result.code).toContain('implements IUserRepository');
  });

  it('should generate factory code', () => {
    const result = gen.generate({
      templateType: 'factory',
      name: 'UserFactory',
      description: 'Creates User instances',
    });

    expect(result.templateType).toBe('factory');
    expect(result.code).toContain('export function createUser');
  });

  it('should generate event code', () => {
    const result = gen.generate({
      templateType: 'event',
      name: 'UserCreatedEvent',
      description: 'Fired when a user is created',
    });

    expect(result.templateType).toBe('event');
    expect(result.code).toContain('export interface UserCreatedEvent');
    expect(result.code).toContain('type: string');
    expect(result.code).toContain('timestamp: Date');
    expect(result.code).toContain('export type UserCreatedEventHandler');
  });

  it('should generate dto code', () => {
    const result = gen.generate({
      templateType: 'dto',
      name: 'UserDTO',
      description: 'User data transfer object',
      methods: [
        { name: 'id', params: '', returnType: 'string' },
        { name: 'email', params: '', returnType: 'string' },
      ],
    });

    expect(result.templateType).toBe('dto');
    expect(result.code).toContain('export interface UserDTO');
    expect(result.code).toContain('readonly id: string');
    expect(result.code).toContain('readonly email: string');
  });

  it('should generate validator code', () => {
    const result = gen.generate({
      templateType: 'validator',
      name: 'EmailValidator',
      description: 'Validates email addresses',
    });

    expect(result.templateType).toBe('validator');
    expect(result.code).toContain('export class EmailValidator');
    expect(result.code).toContain('validate(input: unknown)');
    expect(result.code).toContain('valid: boolean');
    expect(result.code).toContain('errors: string[]');
  });

  it('should generate valid code for every template type', () => {
    const types = gen.getTemplateTypes();
    for (const t of types) {
      const result = gen.generate({
        templateType: t,
        name: 'TestItem',
        description: 'Test description',
      });
      expect(result.code).toBeTruthy();
      expect(result.code.length).toBeGreaterThan(10);
      expect(result.templateType).toBe(t);
      expect(result.filePath).toBeTruthy();
    }
  });
});
