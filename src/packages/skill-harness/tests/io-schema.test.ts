import { describe, it, expect } from 'vitest';
import {
  SkillSchemaValidator,
  type SkillParameter,
} from '../src/io-schema.js';

function makeParam(overrides?: Partial<SkillParameter>): SkillParameter {
  return {
    name: 'field',
    type: 'string',
    required: false,
    description: 'A test field',
    ...overrides,
  };
}

describe('DES-SKL-002: SkillIOSchema', () => {
  const validator = new SkillSchemaValidator();

  describe('validateInput', () => {
    it('should pass for valid input', () => {
      const schema = [makeParam({ name: 'name', required: true })];
      const result = validator.validateInput({ name: 'hello' }, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing required field', () => {
      const schema = [makeParam({ name: 'name', required: true })];
      const result = validator.validateInput({}, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should fail for wrong type', () => {
      const schema = [makeParam({ name: 'count', type: 'number', required: true })];
      const result = validator.validateInput({ count: 'not-a-number' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be of type number');
    });

    it('should validate enum values', () => {
      const schema = [
        makeParam({
          name: 'level',
          required: true,
          validation: { enum: ['low', 'medium', 'high'] },
        }),
      ];
      const result = validator.validateInput({ level: 'invalid' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be one of');
    });

    it('should accept valid enum values', () => {
      const schema = [
        makeParam({
          name: 'level',
          required: true,
          validation: { enum: ['low', 'medium', 'high'] },
        }),
      ];
      const result = validator.validateInput({ level: 'medium' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should validate min/max for numbers', () => {
      const schema = [
        makeParam({ name: 'age', type: 'number', required: true, validation: { min: 0, max: 120 } }),
      ];
      const fail = validator.validateInput({ age: -1 }, schema);
      expect(fail.valid).toBe(false);
      expect(fail.errors[0]).toContain('>= 0');

      const failMax = validator.validateInput({ age: 200 }, schema);
      expect(failMax.valid).toBe(false);
      expect(failMax.errors[0]).toContain('<= 120');
    });

    it('should validate string patterns', () => {
      const schema = [
        makeParam({
          name: 'email',
          required: true,
          validation: { pattern: '^[^@]+@[^@]+$' },
        }),
      ];
      const fail = validator.validateInput({ email: 'nope' }, schema);
      expect(fail.valid).toBe(false);

      const pass = validator.validateInput({ email: 'a@b' }, schema);
      expect(pass.valid).toBe(true);
    });

    it('should skip optional fields when absent', () => {
      const schema = [makeParam({ name: 'opt', required: false })];
      const result = validator.validateInput({}, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateOutput', () => {
    it('should validate output the same as input', () => {
      const schema = [makeParam({ name: 'result', type: 'boolean', required: true })];
      const result = validator.validateOutput({ result: true }, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateExample', () => {
    it('should generate example values for each type', () => {
      const schema: SkillParameter[] = [
        makeParam({ name: 'str', type: 'string' }),
        makeParam({ name: 'num', type: 'number' }),
        makeParam({ name: 'bool', type: 'boolean' }),
        makeParam({ name: 'arr', type: 'array' }),
        makeParam({ name: 'obj', type: 'object' }),
      ];
      const example = validator.generateExample(schema);
      expect(typeof example['str']).toBe('string');
      expect(typeof example['num']).toBe('number');
      expect(typeof example['bool']).toBe('boolean');
      expect(Array.isArray(example['arr'])).toBe(true);
      expect(typeof example['obj']).toBe('object');
    });

    it('should use default values when available', () => {
      const schema = [makeParam({ name: 'field', default: 'hello' })];
      const example = validator.generateExample(schema);
      expect(example['field']).toBe('hello');
    });

    it('should use first enum value when available', () => {
      const schema = [makeParam({ name: 'lvl', validation: { enum: ['a', 'b'] } })];
      const example = validator.generateExample(schema);
      expect(example['lvl']).toBe('a');
    });
  });
});
