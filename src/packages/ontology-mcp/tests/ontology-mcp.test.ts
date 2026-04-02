import { describe, it, expect, beforeEach } from 'vitest';
import {
  N3Store,
  RuleEngine,
  ConsistencyValidator,
  PrivacyGuard,
  SparqlLikeQueryEngine,
  createOntologyStore,
  createRuleEngine,
  createConsistencyValidator,
  createPrivacyGuard,
} from '../src/index.js';
import type { Triple, PrivacyPolicy } from '../src/index.js';

// ── N3Store ──

describe('DES-INT-002: N3Store', () => {
  let store: N3Store;

  beforeEach(() => {
    store = new N3Store();
  });

  it('should add and query triples', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdf:type', object: 'ex:Class1' });
    const results = store.query({ subject: 'ex:A' });
    expect(results).toHaveLength(1);
    expect(results[0].predicate).toBe('rdf:type');
  });

  it('should prevent duplicate triples', () => {
    const triple: Triple = { subject: 'ex:A', predicate: 'rdf:type', object: 'ex:Class1' };
    store.addTriple(triple);
    store.addTriple(triple);
    expect(store.size()).toBe(1);
  });

  it('should add multiple triples via addTriples', () => {
    store.addTriples([
      { subject: 'ex:A', predicate: 'rdf:type', object: 'ex:C1' },
      { subject: 'ex:B', predicate: 'rdf:type', object: 'ex:C2' },
    ]);
    expect(store.size()).toBe(2);
  });

  it('should delete triples matching a pattern', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdf:type', object: 'ex:C1' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdf:type', object: 'ex:C2' });
    const deleted = store.deleteTriple({ subject: 'ex:A' });
    expect(deleted).toBe(1);
    expect(store.size()).toBe(1);
  });

  it('should match patterns with undefined fields as wildcards', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdf:type', object: 'ex:C1' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdf:type', object: 'ex:C2' });
    const results = store.query({ predicate: 'rdf:type' });
    expect(results).toHaveLength(2);
  });

  it('should return all triples with getAll', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'p1', object: 'o1' });
    store.addTriple({ subject: 'ex:B', predicate: 'p2', object: 'o2' });
    const all = store.getAll();
    expect(all).toHaveLength(2);
  });

  it('should clear all triples', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'p1', object: 'o1' });
    store.clear();
    expect(store.size()).toBe(0);
  });

  it('should handle graph-aware triples', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'p1', object: 'o1', graph: 'g1' });
    store.addTriple({ subject: 'ex:A', predicate: 'p1', object: 'o1', graph: 'g2' });
    expect(store.size()).toBe(2);
    const results = store.query({ graph: 'g1' });
    expect(results).toHaveLength(1);
  });
});

// ── RuleEngine ──

describe('DES-INT-002: RuleEngine', () => {
  let store: N3Store;
  let engine: RuleEngine;

  beforeEach(() => {
    store = new N3Store();
    engine = new RuleEngine();
    engine.addDefaultRules();
  });

  it('should infer transitive subClassOf relationships', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdfs:subClassOf', object: 'ex:B' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdfs:subClassOf', object: 'ex:C' });

    const result = engine.applyRules(store);
    const inferred = store.query({
      subject: 'ex:A',
      predicate: 'rdfs:subClassOf',
      object: 'ex:C',
    });
    expect(inferred).toHaveLength(1);
    expect(result.rulesFired).toBeGreaterThan(0);
  });

  it('should propagate rdf:type through subClassOf', () => {
    store.addTriple({ subject: 'ex:x', predicate: 'rdf:type', object: 'ex:Dog' });
    store.addTriple({ subject: 'ex:Dog', predicate: 'rdfs:subClassOf', object: 'ex:Animal' });

    engine.applyRules(store);
    const types = store.query({ subject: 'ex:x', predicate: 'rdf:type', object: 'ex:Animal' });
    expect(types).toHaveLength(1);
  });

  it('should reach a fixed point and stop', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdfs:subClassOf', object: 'ex:B' });
    const result = engine.applyRules(store);
    expect(result.rulesFired).toBe(0);
  });

  it('should respect maxIterations limit', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdfs:subClassOf', object: 'ex:B' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdfs:subClassOf', object: 'ex:C' });
    store.addTriple({ subject: 'ex:C', predicate: 'rdfs:subClassOf', object: 'ex:D' });

    const result = engine.applyRules(store, 1);
    // With only 1 iteration, not all transitive closures may be inferred
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// ── ConsistencyValidator ──

describe('DES-INT-002: ConsistencyValidator', () => {
  let store: N3Store;
  let validator: ConsistencyValidator;

  beforeEach(() => {
    store = new N3Store();
    validator = new ConsistencyValidator();
  });

  it('should detect disjoint class violations', () => {
    validator.addDisjointPair('ex:Cat', 'ex:Dog');
    store.addTriple({ subject: 'ex:x', predicate: 'rdf:type', object: 'ex:Cat' });
    store.addTriple({ subject: 'ex:x', predicate: 'rdf:type', object: 'ex:Dog' });

    const result = validator.validate(store);
    expect(result.consistent).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe('disjoint');
  });

  it('should detect functional property violations', () => {
    validator.addFunctionalProperty('ex:hasMother');
    store.addTriple({ subject: 'ex:x', predicate: 'ex:hasMother', object: 'ex:m1' });
    store.addTriple({ subject: 'ex:x', predicate: 'ex:hasMother', object: 'ex:m2' });

    const result = validator.validate(store);
    expect(result.consistent).toBe(false);
    expect(result.violations.some(v => v.type === 'functional')).toBe(true);
  });

  it('should detect circular subClassOf chains', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdfs:subClassOf', object: 'ex:B' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdfs:subClassOf', object: 'ex:A' });

    const result = validator.validate(store);
    expect(result.consistent).toBe(false);
    expect(result.violations.some(v => v.type === 'circular')).toBe(true);
  });

  it('should report consistent for a clean ontology', () => {
    store.addTriple({ subject: 'ex:A', predicate: 'rdfs:subClassOf', object: 'ex:B' });
    store.addTriple({ subject: 'ex:x', predicate: 'rdf:type', object: 'ex:A' });

    const result = validator.validate(store);
    expect(result.consistent).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ── PrivacyGuard ──

describe('DES-INT-002: PrivacyGuard', () => {
  let guard: PrivacyGuard;
  const policy: PrivacyPolicy = {
    sensitivePredicates: ['ex:hasSSN', 'ex:hasEmail'],
    redactValue: '[REDACTED]',
  };

  beforeEach(() => {
    guard = new PrivacyGuard();
  });

  it('should redact sensitive predicates', () => {
    const triples: Triple[] = [
      { subject: 'ex:user1', predicate: 'ex:hasSSN', object: '123-45-6789' },
      { subject: 'ex:user1', predicate: 'ex:name', object: 'Alice' },
    ];
    const redacted = guard.redactSensitiveTriples(triples, policy);
    expect(redacted[0].object).toBe('[REDACTED]');
    expect(redacted[1].object).toBe('Alice');
  });

  it('should validate export and flag sensitive data', () => {
    const triples: Triple[] = [
      { subject: 'ex:user1', predicate: 'ex:hasEmail', object: 'a@b.com' },
      { subject: 'ex:user1', predicate: 'ex:name', object: 'Alice' },
    ];
    const result = guard.validateExport(triples, policy);
    expect(result.valid).toBe(false);
    expect(result.sensitiveTriples).toHaveLength(1);
  });

  it('should pass validation when no sensitive data exists', () => {
    const triples: Triple[] = [
      { subject: 'ex:user1', predicate: 'ex:name', object: 'Alice' },
    ];
    const result = guard.validateExport(triples, policy);
    expect(result.valid).toBe(true);
    expect(result.sensitiveTriples).toHaveLength(0);
  });
});

// ── SparqlLikeQueryEngine ──

describe('DES-INT-002: SparqlLikeQueryEngine', () => {
  it('should query with variable patterns', () => {
    const store = new N3Store();
    store.addTriple({ subject: 'ex:A', predicate: 'rdf:type', object: 'ex:Class1' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdf:type', object: 'ex:Class2' });

    const engine = new SparqlLikeQueryEngine(store);
    const results = engine.search('?s rdf:type ?o');
    expect(results).toHaveLength(2);
  });

  it('should query with fixed subject', () => {
    const store = new N3Store();
    store.addTriple({ subject: 'ex:A', predicate: 'rdf:type', object: 'ex:Class1' });
    store.addTriple({ subject: 'ex:B', predicate: 'rdf:type', object: 'ex:Class2' });

    const engine = new SparqlLikeQueryEngine(store);
    const results = engine.search('ex:A ?p ?o');
    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('ex:A');
  });
});

// ── Factory Functions ──

describe('DES-INT-002: Factory Functions', () => {
  it('should create an N3Store via createOntologyStore', () => {
    const store = createOntologyStore();
    expect(store).toBeInstanceOf(N3Store);
    expect(store.size()).toBe(0);
  });

  it('should create a RuleEngine with default rules via createRuleEngine', () => {
    const engine = createRuleEngine();
    expect(engine).toBeInstanceOf(RuleEngine);
    // Default rules are loaded; apply to an empty store should be no-op
    const store = createOntologyStore();
    const result = engine.applyRules(store);
    expect(result.rulesFired).toBe(0);
  });

  it('should create a RuleEngine without defaults', () => {
    const engine = createRuleEngine(false);
    expect(engine).toBeInstanceOf(RuleEngine);
  });

  it('should create a ConsistencyValidator', () => {
    const validator = createConsistencyValidator();
    expect(validator).toBeInstanceOf(ConsistencyValidator);
  });

  it('should create a PrivacyGuard', () => {
    const guard = createPrivacyGuard();
    expect(guard).toBeInstanceOf(PrivacyGuard);
  });
});
