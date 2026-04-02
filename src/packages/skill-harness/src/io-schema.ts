/**
 * DES-SKL-002: SkillIOSchema
 * Typed I/O schema definition and validation for skill parameters.
 */

// --- Types ---

export type SkillParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface SkillParameter {
  name: string;
  type: SkillParameterType;
  required: boolean;
  description: string;
  default?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  };
}

export interface SkillSchema {
  inputSchema: SkillParameter[];
  outputSchema: SkillParameter[];
}

// --- Validator ---

export class SkillSchemaValidator {
  validateInput(
    input: Record<string, unknown>,
    schema: SkillParameter[],
  ): { valid: boolean; errors: string[] } {
    return this._validate(input, schema, 'input');
  }

  validateOutput(
    output: Record<string, unknown>,
    schema: SkillParameter[],
  ): { valid: boolean; errors: string[] } {
    return this._validate(output, schema, 'output');
  }

  generateExample(schema: SkillParameter[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const param of schema) {
      if (param.default !== undefined) {
        result[param.name] = param.default;
        continue;
      }
      if (param.validation?.enum && param.validation.enum.length > 0) {
        result[param.name] = param.validation.enum[0];
        continue;
      }
      switch (param.type) {
        case 'string':
          result[param.name] = param.validation?.pattern ?? 'example';
          break;
        case 'number':
          result[param.name] = param.validation?.min ?? 0;
          break;
        case 'boolean':
          result[param.name] = false;
          break;
        case 'array':
          result[param.name] = [];
          break;
        case 'object':
          result[param.name] = {};
          break;
      }
    }
    return result;
  }

  private _validate(
    data: Record<string, unknown>,
    schema: SkillParameter[],
    _context: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of schema) {
      const value = data[param.name];

      // Required check
      if (param.required && (value === undefined || value === null)) {
        errors.push(`${param.name} is required`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type check
      if (!this._checkType(value, param.type)) {
        errors.push(`${param.name} must be of type ${param.type}`);
        continue;
      }

      // Validation rules
      if (param.validation) {
        const v = param.validation;

        if (v.enum && !v.enum.includes(value)) {
          errors.push(`${param.name} must be one of: ${v.enum.join(', ')}`);
        }

        if (typeof value === 'number') {
          if (v.min !== undefined && value < v.min) {
            errors.push(`${param.name} must be >= ${v.min}`);
          }
          if (v.max !== undefined && value > v.max) {
            errors.push(`${param.name} must be <= ${v.max}`);
          }
        }

        if (typeof value === 'string' && v.pattern) {
          const re = new RegExp(v.pattern);
          if (!re.test(value)) {
            errors.push(`${param.name} must match pattern: ${v.pattern}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private _checkType(value: unknown, type: SkillParameterType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null;
      default:
        return false;
    }
  }
}
