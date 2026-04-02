import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSemanticCodeFilterPipeline,
  createHallucinationDetector,
  SemanticCodeFilterPipeline,
  HallucinationDetector,
} from '../../src/neurosymbolic/index.js';
import type { SemanticFilter, FilterResult } from '../../src/neurosymbolic/index.js';

describe('DES-INT-001: SemanticCodeFilterPipeline', () => {
  let pipeline: SemanticCodeFilterPipeline;

  beforeEach(() => {
    pipeline = createSemanticCodeFilterPipeline();
  });

  it('should create a pipeline via factory', () => {
    expect(pipeline).toBeInstanceOf(SemanticCodeFilterPipeline);
  });

  it('should add filters and retrieve them', () => {
    const filter: SemanticFilter = {
      name: 'test-filter',
      filter: () => ({ stage: 'input', passed: true, confidence: 0.9, reason: 'ok' }),
    };
    pipeline.addFilter(filter);
    expect(pipeline.getFilters()).toHaveLength(1);
    expect(pipeline.getFilters()[0].name).toBe('test-filter');
  });

  it('should process input through all filters in sequence', () => {
    const filter1: SemanticFilter = {
      name: 'input-check',
      filter: () => ({ stage: 'input', passed: true, confidence: 0.9, reason: 'valid input' }),
    };
    const filter2: SemanticFilter = {
      name: 'semantic-check',
      filter: () => ({ stage: 'semantic', passed: true, confidence: 0.8, reason: 'semantically correct' }),
    };
    pipeline.addFilter(filter1);
    pipeline.addFilter(filter2);

    const result = pipeline.process('const x = 1;');
    expect(result.passed).toBe(true);
    expect(result.stages).toHaveLength(2);
    expect(result.finalConfidence).toBe(0.8);
    expect(result.hallucinationDetected).toBe(false);
  });

  it('should stop on first failure', () => {
    const filter1: SemanticFilter = {
      name: 'failing-filter',
      filter: () => ({ stage: 'semantic', passed: false, confidence: 0.2, reason: 'hallucination detected' }),
    };
    const filter2: SemanticFilter = {
      name: 'never-reached',
      filter: () => ({ stage: 'output', passed: true, confidence: 1.0, reason: 'ok' }),
    };
    pipeline.addFilter(filter1);
    pipeline.addFilter(filter2);

    const result = pipeline.process('bad code');
    expect(result.passed).toBe(false);
    expect(result.stages).toHaveLength(1);
    expect(result.hallucinationDetected).toBe(true);
  });

  it('should pass with empty pipeline', () => {
    const result = pipeline.process('any input');
    expect(result.passed).toBe(true);
    expect(result.stages).toHaveLength(0);
    expect(result.finalConfidence).toBe(1.0);
  });

  it('should pass context to filters', () => {
    let receivedContext: Record<string, unknown> | undefined;
    const filter: SemanticFilter = {
      name: 'context-check',
      filter: (_input: string, context?: Record<string, unknown>): FilterResult => {
        receivedContext = context;
        return { stage: 'input', passed: true, confidence: 1.0, reason: 'ok' };
      },
    };
    pipeline.addFilter(filter);

    const ctx = { language: 'typescript' };
    pipeline.process('code', ctx);
    expect(receivedContext).toEqual(ctx);
  });
});

describe('DES-INT-001: HallucinationDetector', () => {
  let detector: HallucinationDetector;

  beforeEach(() => {
    detector = createHallucinationDetector();
  });

  it('should create a detector via factory', () => {
    expect(detector).toBeInstanceOf(HallucinationDetector);
  });

  it('should detect unknown type references', () => {
    const code = 'const user: FakeUserModel = new FakeUserModel();';
    const result = detector.detect(code, {
      existingTypes: ['User', 'Account'],
      existingFunctions: [],
    });
    expect(result.detected).toBe(true);
    expect(result.issues.some(i => i.type === 'unknown-type' && i.identifier === 'FakeUserModel')).toBe(true);
  });

  it('should detect unknown function references', () => {
    const code = 'const result = fabricatedHelper(data);';
    const result = detector.detect(code, {
      existingTypes: [],
      existingFunctions: ['processData', 'validateInput'],
    });
    expect(result.detected).toBe(true);
    expect(result.issues.some(i => i.type === 'unknown-function' && i.identifier === 'fabricatedHelper')).toBe(true);
  });

  it('should pass for known references', () => {
    const code = 'const user: User = createUser(data);';
    const result = detector.detect(code, {
      existingTypes: ['User'],
      existingFunctions: ['createUser'],
    });
    expect(result.detected).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('should not flag built-in types', () => {
    const code = 'const d: Date = new Date(); const p: Promise = new Promise();';
    const result = detector.detect(code, {
      existingTypes: [],
      existingFunctions: [],
    });
    const typeIssues = result.issues.filter(i => i.type === 'unknown-type');
    const flaggedIds = typeIssues.map(i => i.identifier);
    expect(flaggedIds).not.toContain('Date');
    expect(flaggedIds).not.toContain('Promise');
  });

  it('should not flag built-in functions', () => {
    const code = 'const n = parseInt(str); console(msg);';
    const result = detector.detect(code, {
      existingTypes: [],
      existingFunctions: [],
    });
    const funcIssues = result.issues.filter(i => i.type === 'unknown-function');
    const flaggedIds = funcIssues.map(i => i.identifier);
    expect(flaggedIds).not.toContain('parseInt');
    expect(flaggedIds).not.toContain('console');
  });
});
