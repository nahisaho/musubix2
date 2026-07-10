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

  // v0.5.57 — detected design patterns scaffold structure into a class.
  describe('pattern-aware class scaffolding', () => {
    it('scaffolds a Feature Toggle guard and enabled flag', () => {
      const r = gen.generate({
        templateType: 'class',
        name: 'EcoModeService',
        methods: [{ name: 'lowerTarget', params: '', returnType: 'void' }],
        patterns: ['Feature Toggle'],
      });
      expect(r.code).toContain('constructor(private readonly enabled: boolean = false)');
      expect(r.code).toContain('if (!this.enabled) { return; }');
    });

    it('returns a typed default from a toggle-guarded non-void method', () => {
      const r = gen.generate({
        templateType: 'class',
        name: 'GateService',
        methods: [{ name: 'isAllowed', params: '', returnType: 'boolean' }],
        patterns: ['Feature Toggle'],
      });
      expect(r.code).toContain('if (!this.enabled) { return false; }');
    });

    it('scaffolds an Observer listener registry', () => {
      const r = gen.generate({
        templateType: 'class',
        name: 'SetpointService',
        methods: [{ name: 'adjust', params: '', returnType: 'void' }],
        patterns: ['Observer'],
      });
      expect(r.code).toContain('private readonly listeners: Array<(event: unknown) => void> = []');
      expect(r.code).toContain('on(handler: (event: unknown) => void): void');
      expect(r.code).toContain('private emit(event: unknown): void');
    });

    it('scaffolds a State enum and state field', () => {
      const r = gen.generate({
        templateType: 'class',
        name: 'HeaterService',
        methods: [{ name: 'activate', params: '', returnType: 'void' }],
        patterns: ['State'],
      });
      expect(r.code).toContain('export enum HeaterServiceState');
      expect(r.code).toContain('private state: HeaterServiceState = HeaterServiceState.Idle');
    });

    it('composes multiple patterns in one class', () => {
      const r = gen.generate({
        templateType: 'class',
        name: 'NightService',
        methods: [{ name: 'apply', params: '', returnType: 'void' }],
        patterns: ['Observer', 'State'],
      });
      expect(r.code).toContain('export enum NightServiceState');
      expect(r.code).toContain('private readonly listeners');
    });

    it('is unchanged when no patterns are supplied', () => {
      const r = gen.generate({
        templateType: 'class',
        name: 'PlainService',
        methods: [{ name: 'run', params: '', returnType: 'void' }],
      });
      expect(r.code).toContain('constructor() {');
      expect(r.code).not.toContain('this.enabled');
      expect(r.code).not.toContain('export enum');
    });
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
