import { describe, it, expect, beforeEach } from 'vitest';
import {
  OntologyModule,
  CONCEPT_DEFINITIONS,
  PHASE_ORDER,
  type SDDConcept,
  type SDDRelation,
} from '../src/index.js';

function makeConcept(overrides: Partial<SDDConcept> = {}): SDDConcept {
  return {
    id: 'req-001',
    type: 'requirement',
    name: 'Test Requirement',
    description: 'A test requirement',
    phase: 'requirements',
    properties: { earsPattern: 'when', priority: 'high' },
    tags: ['test'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('REQ-SDD-001: OntologyModule constructor', () => {
  it('should load all 9 concept definitions', () => {
    const mod = new OntologyModule();
    expect(mod.getAllDefinitions()).toHaveLength(9);
  });

  it('should make each definition retrievable by type', () => {
    const mod = new OntologyModule();
    for (const def of CONCEPT_DEFINITIONS) {
      expect(mod.getDefinition(def.type)).toEqual(def);
    }
  });
});

describe('REQ-SDD-001: PHASE_ORDER', () => {
  it('should contain exactly 5 phases', () => {
    expect(PHASE_ORDER).toHaveLength(5);
  });

  it('should be in correct sequential order', () => {
    expect(PHASE_ORDER).toEqual([
      'requirements',
      'design',
      'task-breakdown',
      'implementation',
      'completion',
    ]);
  });
});

describe('REQ-SDD-001: addConcept validation', () => {
  let mod: OntologyModule;

  beforeEach(() => {
    mod = new OntologyModule();
  });

  it('should accept a valid concept', () => {
    const result = mod.addConcept(makeConcept());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject a concept with missing required properties', () => {
    const concept = makeConcept({ properties: {} });
    const result = mod.addConcept(concept);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required property: earsPattern');
    expect(result.errors).toContain('Missing required property: priority');
  });

  it('should reject a concept with unknown type', () => {
    const concept = makeConcept({ type: 'unknown' as never });
    const result = mod.addConcept(concept);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unknown concept type');
  });

  it('should warn when phase differs from expected', () => {
    const concept = makeConcept({ phase: 'design' });
    const result = mod.addConcept(concept);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('differs from expected');
  });

  it('should not store a concept that fails validation', () => {
    const concept = makeConcept({ type: 'unknown' as never });
    mod.addConcept(concept);
    expect(mod.getConcept(concept.id)).toBeUndefined();
  });
});

describe('REQ-SDD-001: getConcept / getConceptsByType / getConceptsByPhase', () => {
  let mod: OntologyModule;

  beforeEach(() => {
    mod = new OntologyModule();
    mod.addConcept(makeConcept({ id: 'req-001' }));
    mod.addConcept(
      makeConcept({
        id: 'des-001',
        type: 'design-spec',
        phase: 'design',
        properties: { traceability: 'REQ-001' },
      }),
    );
    mod.addConcept(
      makeConcept({
        id: 'req-002',
        type: 'requirement',
        phase: 'requirements',
        properties: { earsPattern: 'if', priority: 'low' },
      }),
    );
  });

  it('should retrieve a concept by id', () => {
    const c = mod.getConcept('req-001');
    expect(c).toBeDefined();
    expect(c!.id).toBe('req-001');
  });

  it('should return undefined for unknown id', () => {
    expect(mod.getConcept('nonexistent')).toBeUndefined();
  });

  it('should filter concepts by type', () => {
    const reqs = mod.getConceptsByType('requirement');
    expect(reqs).toHaveLength(2);
    expect(reqs.every((c) => c.type === 'requirement')).toBe(true);
  });

  it('should filter concepts by phase', () => {
    const design = mod.getConceptsByPhase('design');
    expect(design).toHaveLength(1);
    expect(design[0]!.id).toBe('des-001');
  });
});

describe('REQ-SDD-001: addRelation / getRelationsFor', () => {
  let mod: OntologyModule;

  beforeEach(() => {
    mod = new OntologyModule();
    mod.addConcept(makeConcept({ id: 'req-001' }));
    mod.addConcept(
      makeConcept({
        id: 'des-001',
        type: 'design-spec',
        phase: 'design',
        properties: { traceability: 'REQ-001' },
      }),
    );
  });

  it('should accept a valid relation', () => {
    const relation: SDDRelation = {
      id: 'rel-001',
      source: 'req-001',
      target: 'des-001',
      type: 'traces_to',
    };
    const result = mod.addRelation(relation);
    expect(result.valid).toBe(true);
  });

  it('should reject a relation with missing source', () => {
    const relation: SDDRelation = {
      id: 'rel-002',
      source: 'nonexistent',
      target: 'des-001',
      type: 'traces_to',
    };
    const result = mod.addRelation(relation);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Source concept not found');
  });

  it('should reject a relation with missing target', () => {
    const relation: SDDRelation = {
      id: 'rel-003',
      source: 'req-001',
      target: 'nonexistent',
      type: 'traces_to',
    };
    const result = mod.addRelation(relation);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Target concept not found');
  });

  it('should warn for disallowed relation type on source concept', () => {
    const relation: SDDRelation = {
      id: 'rel-004',
      source: 'req-001',
      target: 'des-001',
      type: 'implements',
    };
    const result = mod.addRelation(relation);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('not typically allowed');
  });

  it('should return relations for a given concept id', () => {
    mod.addRelation({
      id: 'rel-001',
      source: 'req-001',
      target: 'des-001',
      type: 'traces_to',
    });
    const rels = mod.getRelationsFor('req-001');
    expect(rels).toHaveLength(1);
    const relsTarget = mod.getRelationsFor('des-001');
    expect(relsTarget).toHaveLength(1);
  });
});

describe('REQ-SDD-001: isValidTransition', () => {
  let mod: OntologyModule;

  beforeEach(() => {
    mod = new OntologyModule();
  });

  it('should allow sequential forward transitions', () => {
    expect(mod.isValidTransition('requirements', 'design')).toBe(true);
    expect(mod.isValidTransition('design', 'task-breakdown')).toBe(true);
    expect(mod.isValidTransition('task-breakdown', 'implementation')).toBe(true);
    expect(mod.isValidTransition('implementation', 'completion')).toBe(true);
  });

  it('should reject non-sequential transitions', () => {
    expect(mod.isValidTransition('requirements', 'implementation')).toBe(false);
    expect(mod.isValidTransition('design', 'completion')).toBe(false);
  });

  it('should reject backward transitions', () => {
    expect(mod.isValidTransition('design', 'requirements')).toBe(false);
    expect(mod.isValidTransition('completion', 'requirements')).toBe(false);
  });
});

describe('REQ-SDD-001: getStats', () => {
  it('should return correct statistics', () => {
    const mod = new OntologyModule();
    mod.addConcept(makeConcept({ id: 'req-001' }));
    mod.addConcept(
      makeConcept({
        id: 'req-002',
        properties: { earsPattern: 'if', priority: 'low' },
      }),
    );
    mod.addConcept(
      makeConcept({
        id: 'des-001',
        type: 'design-spec',
        phase: 'design',
        properties: { traceability: 'REQ-001' },
      }),
    );
    mod.addRelation({
      id: 'rel-001',
      source: 'req-001',
      target: 'des-001',
      type: 'traces_to',
    });

    const stats = mod.getStats();
    expect(stats.concepts).toBe(3);
    expect(stats.relations).toBe(1);
    expect(stats.byType['requirement']).toBe(2);
    expect(stats.byType['design-spec']).toBe(1);
    expect(stats.byPhase['requirements']).toBe(2);
    expect(stats.byPhase['design']).toBe(1);
  });

  it('should return empty stats for a fresh module', () => {
    const mod = new OntologyModule();
    const stats = mod.getStats();
    expect(stats.concepts).toBe(0);
    expect(stats.relations).toBe(0);
    expect(Object.keys(stats.byType)).toHaveLength(0);
    expect(Object.keys(stats.byPhase)).toHaveLength(0);
  });
});
