import { describe, it, expect } from 'vitest';
import {
  SDD_CORE_TURTLE,
  SDD_WORKFLOW_TURTLE,
  SDD_TRACEABILITY_TURTLE,
  SDD_GOVERNANCE_TURTLE,
  TurtleLoader,
  TurtleValidator,
  createTurtleLoader,
  createTurtleValidator,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Turtle string constants
// ---------------------------------------------------------------------------

describe('REQ-INT-003: Turtle constants', () => {
  it('SDD_CORE_TURTLE should contain core SDD concepts', () => {
    expect(SDD_CORE_TURTLE).toContain('Requirement');
    expect(SDD_CORE_TURTLE).toContain('Design');
    expect(SDD_CORE_TURTLE).toContain('Implementation');
    expect(SDD_CORE_TURTLE).toContain('Test');
    expect(SDD_CORE_TURTLE).toContain('@prefix');
  });

  it('SDD_WORKFLOW_TURTLE should contain workflow phases and transitions', () => {
    expect(SDD_WORKFLOW_TURTLE).toContain('Phase');
    expect(SDD_WORKFLOW_TURTLE).toContain('RequirementsPhase');
    expect(SDD_WORKFLOW_TURTLE).toContain('DesignPhase');
    expect(SDD_WORKFLOW_TURTLE).toContain('ImplementationPhase');
    expect(SDD_WORKFLOW_TURTLE).toContain('CompletionPhase');
    expect(SDD_WORKFLOW_TURTLE).toContain('transitionsTo');
  });

  it('SDD_TRACEABILITY_TURTLE should contain traceability links', () => {
    expect(SDD_TRACEABILITY_TURTLE).toContain('tracesTo');
    expect(SDD_TRACEABILITY_TURTLE).toContain('implements');
    expect(SDD_TRACEABILITY_TURTLE).toContain('tests');
    expect(SDD_TRACEABILITY_TURTLE).toContain('dependsOn');
    expect(SDD_TRACEABILITY_TURTLE).toContain('derivesFrom');
    expect(SDD_TRACEABILITY_TURTLE).toContain('validates');
  });

  it('SDD_GOVERNANCE_TURTLE should contain constitution articles and policies', () => {
    expect(SDD_GOVERNANCE_TURTLE).toContain('ConstitutionArticle');
    expect(SDD_GOVERNANCE_TURTLE).toContain('Policy');
    expect(SDD_GOVERNANCE_TURTLE).toContain('articleNumber');
    expect(SDD_GOVERNANCE_TURTLE).toContain('enforcedBy');
    expect(SDD_GOVERNANCE_TURTLE).toContain('governsPhase');
  });

  it('all Turtle strings should be valid non-empty strings', () => {
    for (const turtle of [SDD_CORE_TURTLE, SDD_WORKFLOW_TURTLE, SDD_TRACEABILITY_TURTLE, SDD_GOVERNANCE_TURTLE]) {
      expect(typeof turtle).toBe('string');
      expect(turtle.trim().length).toBeGreaterThan(50);
    }
  });
});

// ---------------------------------------------------------------------------
// TurtleLoader
// ---------------------------------------------------------------------------

describe('REQ-INT-003: TurtleLoader', () => {
  it('loadModule("core") should return an OntologyModule', () => {
    const loader = createTurtleLoader();
    const mod = loader.loadModule('core');
    expect(mod).toBeDefined();
    expect(mod.getAllDefinitions().length).toBeGreaterThan(0);
  });

  it('loadModule("workflow") should return an OntologyModule', () => {
    const loader = createTurtleLoader();
    const mod = loader.loadModule('workflow');
    expect(mod).toBeDefined();
  });

  it('loadModule("traceability") should return an OntologyModule', () => {
    const loader = createTurtleLoader();
    const mod = loader.loadModule('traceability');
    expect(mod).toBeDefined();
  });

  it('loadModule("governance") should return an OntologyModule', () => {
    const loader = createTurtleLoader();
    const mod = loader.loadModule('governance');
    expect(mod).toBeDefined();
  });

  it('loadModule with unknown name should throw', () => {
    const loader = createTurtleLoader();
    expect(() => loader.loadModule('nonexistent')).toThrow('Unknown Turtle module');
  });

  it('loadAll() should return 4 modules', () => {
    const loader = createTurtleLoader();
    const modules = loader.loadAll();
    expect(modules).toHaveLength(4);
  });

  it('getModuleNames() should return the 4 module names', () => {
    const loader = new TurtleLoader();
    const names = loader.getModuleNames();
    expect(names).toEqual(['core', 'workflow', 'traceability', 'governance']);
  });

  it('factory createTurtleLoader returns a TurtleLoader instance', () => {
    expect(createTurtleLoader()).toBeInstanceOf(TurtleLoader);
  });
});

// ---------------------------------------------------------------------------
// TurtleValidator
// ---------------------------------------------------------------------------

describe('REQ-INT-003: TurtleValidator.validateSyntax', () => {
  it('should validate correct Turtle syntax', () => {
    const validator = createTurtleValidator();
    const result = validator.validateSyntax(SDD_CORE_TURTLE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate all 4 Turtle modules as valid', () => {
    const validator = createTurtleValidator();
    for (const turtle of [SDD_CORE_TURTLE, SDD_WORKFLOW_TURTLE, SDD_TRACEABILITY_TURTLE, SDD_GOVERNANCE_TURTLE]) {
      const result = validator.validateSyntax(turtle);
      expect(result.valid).toBe(true);
    }
  });

  it('should detect missing prefix declarations', () => {
    const validator = createTurtleValidator();
    const result = validator.validateSyntax('sdd:Foo a owl:Class .');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('prefix'))).toBe(true);
  });

  it('should detect unclosed string literals', () => {
    const validator = createTurtleValidator();
    const turtle = '@prefix sdd: <http://example.org/> .\nsdd:Foo rdfs:label "unclosed ;';
    const result = validator.validateSyntax(turtle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Unclosed string literal'))).toBe(true);
  });

  it('factory createTurtleValidator returns a TurtleValidator instance', () => {
    expect(createTurtleValidator()).toBeInstanceOf(TurtleValidator);
  });
});

describe('REQ-INT-003: TurtleValidator.validateSemantics', () => {
  it('should report consistent when given all modules', () => {
    const loader = createTurtleLoader();
    const validator = createTurtleValidator();
    const modules = loader.loadAll();
    const result = validator.validateSemantics(modules);
    expect(result.consistent).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should report issues for empty module list', () => {
    const validator = createTurtleValidator();
    const result = validator.validateSemantics([]);
    expect(result.consistent).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
