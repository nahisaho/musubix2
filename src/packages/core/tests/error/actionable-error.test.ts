import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActionableError,
  ErrorFormatter,
  ErrorCodes,
  CommonErrors,
} from '../../src/error/actionable-error.js';

describe('REQ-ARC-004: ActionableError', () => {
  beforeEach(() => {
    ErrorFormatter.setColorOutput(false);
  });

  describe('constructor', () => {
    it('should create error with required fields', () => {
      const err = new ActionableError('test error', { code: 'TEST_001' });
      expect(err.message).toBe('test error');
      expect(err.code).toBe('TEST_001');
      expect(err.severity).toBe('error');
      expect(err.context).toEqual({});
      expect(err.suggestions).toEqual([]);
      expect(err.name).toBe('ActionableError');
    });

    it('should create error with all options', () => {
      const cause = new Error('original');
      const err = new ActionableError('test', {
        code: 'TEST_002',
        severity: 'warning',
        context: { file: 'test.ts', line: 42 },
        suggestions: [{ action: 'Fix', description: 'Fix it' }],
        cause,
      });

      expect(err.severity).toBe('warning');
      expect(err.context.file).toBe('test.ts');
      expect(err.context.line).toBe(42);
      expect(err.suggestions).toHaveLength(1);
      expect(err.cause).toBe(cause);
    });
  });

  describe('static methods', () => {
    it('should create with withSuggestion', () => {
      const err = ActionableError.withSuggestion('msg', 'CODE', {
        action: 'Do',
        description: 'Do something',
        command: 'npm test',
      });
      expect(err.suggestions).toHaveLength(1);
      expect(err.suggestions[0].command).toBe('npm test');
    });

    it('should create from Error with fromError', () => {
      const original = new Error('boom');
      const err = ActionableError.fromError(original, 'WRAPPED');
      expect(err.message).toBe('boom');
      expect(err.code).toBe('WRAPPED');
      expect(err.cause).toBe(original);
    });

    it('should identify ActionableError with isActionableError', () => {
      const err = new ActionableError('test', { code: 'X' });
      expect(ActionableError.isActionableError(err)).toBe(true);
      expect(ActionableError.isActionableError(new Error('plain'))).toBe(false);
      expect(ActionableError.isActionableError(null)).toBe(false);
    });
  });

  describe('addSuggestion', () => {
    it('should add suggestion and return this for chaining', () => {
      const err = new ActionableError('test', { code: 'X' });
      const result = err.addSuggestion({ action: 'A', description: 'B' });
      expect(result).toBe(err);
      expect(err.suggestions).toHaveLength(1);
    });
  });
});

describe('REQ-ARC-004: ErrorFormatter', () => {
  beforeEach(() => {
    ErrorFormatter.setColorOutput(false);
  });

  it('should format error with all context', () => {
    const err = new ActionableError('something failed', {
      code: 'TEST_FMT',
      context: { file: 'src/main.ts', line: 10, column: 5, artifactId: 'REQ-001' },
      suggestions: [
        { action: 'Fix', description: 'Fix the code', command: 'npm run fix' },
      ],
    });

    const output = ErrorFormatter.format(err);
    expect(output).toContain('[TEST_FMT]');
    expect(output).toContain('something failed');
    expect(output).toContain('src/main.ts:10:5');
    expect(output).toContain('REQ-001');
    expect(output).toContain('Fix: Fix the code');
    expect(output).toContain('$ npm run fix');
  });

  it('should format empty errors list', () => {
    const output = ErrorFormatter.formatAll([]);
    expect(output).toContain('No errors');
  });

  it('should format multiple errors with counts', () => {
    const errors = [
      new ActionableError('err1', { code: 'E1', severity: 'error' }),
      new ActionableError('warn1', { code: 'W1', severity: 'warning' }),
    ];
    const output = ErrorFormatter.formatAll(errors);
    expect(output).toContain('2 issue(s)');
    expect(output).toContain('1 errors');
    expect(output).toContain('1 warnings');
  });

  it('should format as JSON', () => {
    const err = new ActionableError('test', { code: 'JSON_TEST' });
    const json = JSON.parse(ErrorFormatter.formatAsJson(err));
    expect(json.code).toBe('JSON_TEST');
    expect(json.message).toBe('test');
  });
});

describe('REQ-ARC-004: ErrorCodes', () => {
  it('should have all predefined codes', () => {
    expect(ErrorCodes.EARS_VALIDATION_FAILED).toBe('EARS_VALIDATION_FAILED');
    expect(ErrorCodes.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
    expect(ErrorCodes.PHASE_TRANSITION_BLOCKED).toBe('PHASE_TRANSITION_BLOCKED');
    expect(ErrorCodes.QUALITY_GATE_FAILED).toBe('QUALITY_GATE_FAILED');
    expect(ErrorCodes.CODEGEN_FAILED).toBe('CODEGEN_FAILED');
  });
});

describe('REQ-ARC-004: CommonErrors', () => {
  beforeEach(() => {
    ErrorFormatter.setColorOutput(false);
  });

  it('should create fileNotFound error', () => {
    const err = CommonErrors.fileNotFound('/path/to/file.ts');
    expect(err.code).toBe('FILE_NOT_FOUND');
    expect(err.context.file).toBe('/path/to/file.ts');
    expect(err.suggestions.length).toBeGreaterThan(0);
  });

  it('should create earsValidationFailed error', () => {
    const err = CommonErrors.earsValidationFailed('req.md', ['issue1', 'issue2']);
    expect(err.code).toBe('EARS_VALIDATION_FAILED');
    expect(err.message).toContain('2 issue(s)');
  });

  it('should create traceabilityMissing warning', () => {
    const err = CommonErrors.traceabilityMissing('REQ-001', 'DES-001');
    expect(err.severity).toBe('warning');
    expect(err.code).toBe('TRACEABILITY_MISSING');
  });

  it('should create phaseTransitionBlocked error', () => {
    const err = CommonErrors.phaseTransitionBlocked('design', 'implementation', 'not approved');
    expect(err.code).toBe('PHASE_TRANSITION_BLOCKED');
    expect(err.message).toContain('design');
  });

  it('should create qualityGateFailed error', () => {
    const err = CommonErrors.qualityGateFailed('coverage', 'Below 80%');
    expect(err.code).toBe('QUALITY_GATE_FAILED');
    expect(err.suggestions[0].description).toBe('Below 80%');
  });
});
