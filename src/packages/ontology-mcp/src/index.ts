/**
 * @musubix2/ontology-mcp — N3 Triplestore & Reasoning
 *
 * In-memory triple store with OWL 2 RL-like inference,
 * consistency validation, and privacy protection.
 *
 * @see DES-INT-002 — ニューロシンボリック統合
 */

// ── Types ──

export interface Triple {
  subject: string;
  predicate: string;
  object: string;
  graph?: string;
}

export interface TriplePattern {
  subject?: string;
  predicate?: string;
  object?: string;
  graph?: string;
}

export interface InferenceResult {
  inferred: Triple[];
  rulesFired: number;
  duration: number;
}

export interface ConsistencyResult {
  consistent: boolean;
  violations: ConsistencyViolation[];
}

export interface ConsistencyViolation {
  type: 'disjoint' | 'functional' | 'circular' | 'missing-range' | 'orphan';
  message: string;
  triples: Triple[];
}

export interface PrivacyPolicy {
  sensitivePredicates: string[];
  redactValue: string;
}

export interface PrivacyValidationResult {
  valid: boolean;
  sensitiveTriples: Triple[];
}

export type InferenceRule = {
  name: string;
  description: string;
  condition: (store: N3Store) => Triple[];
  conclusion: (matchedTriples: Triple[]) => Triple[];
};

// ── N3Store ──

export class N3Store {
  private triples: Triple[] = [];

  addTriple(triple: Triple): void {
    if (!this.hasTriple(triple)) {
      this.triples.push({ ...triple });
    }
  }

  addTriples(triples: Triple[]): void {
    for (const t of triples) {
      this.addTriple(t);
    }
  }

  deleteTriple(pattern: TriplePattern): number {
    const before = this.triples.length;
    this.triples = this.triples.filter((t) => !this.matchesPattern(t, pattern));
    return before - this.triples.length;
  }

  query(pattern: TriplePattern): Triple[] {
    return this.triples.filter((t) => this.matchesPattern(t, pattern));
  }

  getAll(): Triple[] {
    return [...this.triples];
  }

  size(): number {
    return this.triples.length;
  }

  clear(): void {
    this.triples = [];
  }

  private hasTriple(triple: Triple): boolean {
    return this.triples.some(
      (t) =>
        t.subject === triple.subject &&
        t.predicate === triple.predicate &&
        t.object === triple.object &&
        (t.graph ?? '') === (triple.graph ?? ''),
    );
  }

  private matchesPattern(triple: Triple, pattern: TriplePattern): boolean {
    if (pattern.subject !== undefined && triple.subject !== pattern.subject) {
      return false;
    }
    if (pattern.predicate !== undefined && triple.predicate !== pattern.predicate) {
      return false;
    }
    if (pattern.object !== undefined && triple.object !== pattern.object) {
      return false;
    }
    if (pattern.graph !== undefined && (triple.graph ?? '') !== pattern.graph) {
      return false;
    }
    return true;
  }
}

// ── RuleEngine ──

export class RuleEngine {
  private rules: InferenceRule[] = [];

  addRule(rule: InferenceRule): void {
    this.rules.push(rule);
  }

  addDefaultRules(): void {
    this.rules.push({
      name: 'transitivity',
      description: 'OWL 2 RL transitivity for rdfs:subClassOf',
      condition: (store: N3Store) => {
        const subClassTriples = store.query({ predicate: 'rdfs:subClassOf' });
        const inferred: Triple[] = [];
        for (const ab of subClassTriples) {
          for (const bc of subClassTriples) {
            if (ab.object === bc.subject && ab.subject !== bc.object) {
              const newTriple: Triple = {
                subject: ab.subject,
                predicate: 'rdfs:subClassOf',
                object: bc.object,
              };
              inferred.push(newTriple);
            }
          }
        }
        return inferred;
      },
      conclusion: (matched) => matched,
    });

    this.rules.push({
      name: 'type-propagation',
      description: 'Propagate rdf:type through subClassOf',
      condition: (store: N3Store) => {
        const types = store.query({ predicate: 'rdf:type' });
        const subClasses = store.query({ predicate: 'rdfs:subClassOf' });
        const inferred: Triple[] = [];
        for (const typeTriple of types) {
          for (const sc of subClasses) {
            if (typeTriple.object === sc.subject) {
              inferred.push({
                subject: typeTriple.subject,
                predicate: 'rdf:type',
                object: sc.object,
              });
            }
          }
        }
        return inferred;
      },
      conclusion: (matched) => matched,
    });
  }

  applyRules(store: N3Store, maxIterations: number = 10): InferenceResult {
    const start = Date.now();
    let totalInferred = 0;
    let totalRulesFired = 0;

    for (let i = 0; i < maxIterations; i++) {
      let newInThisIteration = 0;

      for (const rule of this.rules) {
        const candidates = rule.condition(store);
        const conclusions = rule.conclusion(candidates);

        for (const triple of conclusions) {
          const existing = store.query({
            subject: triple.subject,
            predicate: triple.predicate,
            object: triple.object,
          });
          if (existing.length === 0) {
            store.addTriple(triple);
            newInThisIteration++;
            totalRulesFired++;
          }
        }
      }

      totalInferred += newInThisIteration;
      if (newInThisIteration === 0) {
        break;
      }
    }

    return {
      inferred: store.getAll().slice(-totalInferred),
      rulesFired: totalRulesFired,
      duration: Date.now() - start,
    };
  }
}

// ── ConsistencyValidator ──

export class ConsistencyValidator {
  private disjointPairs: Array<[string, string]> = [];
  private functionalProperties: string[] = [];

  addDisjointPair(classA: string, classB: string): void {
    this.disjointPairs.push([classA, classB]);
  }

  addFunctionalProperty(predicate: string): void {
    this.functionalProperties.push(predicate);
  }

  validate(store: N3Store): ConsistencyResult {
    const violations: ConsistencyViolation[] = [];

    for (const [classA, classB] of this.disjointPairs) {
      const typesA = store.query({ predicate: 'rdf:type', object: classA });
      const typesB = store.query({ predicate: 'rdf:type', object: classB });

      for (const a of typesA) {
        for (const b of typesB) {
          if (a.subject === b.subject) {
            violations.push({
              type: 'disjoint',
              message: `${a.subject} is both ${classA} and ${classB}, which are disjoint`,
              triples: [a, b],
            });
          }
        }
      }
    }

    for (const prop of this.functionalProperties) {
      const triples = store.query({ predicate: prop });
      const bySubject = new Map<string, Triple[]>();
      for (const t of triples) {
        const arr = bySubject.get(t.subject) ?? [];
        arr.push(t);
        bySubject.set(t.subject, arr);
      }
      for (const [subject, subjectTriples] of bySubject) {
        if (subjectTriples.length > 1) {
          violations.push({
            type: 'functional',
            message: `${subject} has ${subjectTriples.length} values for functional property ${prop}`,
            triples: subjectTriples,
          });
        }
      }
    }

    const subClassTriples = store.query({ predicate: 'rdfs:subClassOf' });
    const graph = new Map<string, Set<string>>();
    for (const t of subClassTriples) {
      const set = graph.get(t.subject) ?? new Set();
      set.add(t.object);
      graph.set(t.subject, set);
    }

    for (const startNode of graph.keys()) {
      const visited = new Set<string>();
      const stack = [startNode];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === startNode && visited.size > 0) {
          violations.push({
            type: 'circular',
            message: `Circular subClassOf chain detected involving ${startNode}`,
            triples: subClassTriples.filter((t) => visited.has(t.subject)),
          });
          break;
        }
        if (visited.has(current)) {
          continue;
        }
        visited.add(current);
        const neighbors = graph.get(current);
        if (neighbors) {
          for (const n of neighbors) {
            stack.push(n);
          }
        }
      }
    }

    return {
      consistent: violations.length === 0,
      violations,
    };
  }
}

// ── PrivacyGuard ──

export class PrivacyGuard {
  redactSensitiveTriples(triples: Triple[], policy: PrivacyPolicy): Triple[] {
    return triples.map((t) => {
      if (policy.sensitivePredicates.includes(t.predicate)) {
        return { ...t, object: policy.redactValue };
      }
      return { ...t };
    });
  }

  validateExport(triples: Triple[], policy: PrivacyPolicy): PrivacyValidationResult {
    const sensitiveTriples = triples.filter((t) =>
      policy.sensitivePredicates.includes(t.predicate),
    );
    return {
      valid: sensitiveTriples.length === 0,
      sensitiveTriples,
    };
  }
}

// ── SparqlLikeQueryEngine ──

export class SparqlLikeQueryEngine {
  constructor(private store: N3Store) {}

  /**
   * Simple SPARQL-like query. Supports basic triple pattern matching.
   * Query format: "?s predicate object" or "subject ?p object" etc.
   * Variables start with '?'
   */
  search(query: string): Triple[] {
    const parts = query.trim().split(/\s+/);
    if (parts.length < 2) {
      return [];
    }

    const pattern: TriplePattern = {};
    if (parts[0] && !parts[0].startsWith('?')) {
      pattern.subject = parts[0];
    }
    if (parts[1] && !parts[1].startsWith('?')) {
      pattern.predicate = parts[1];
    }
    if (parts[2] && !parts[2].startsWith('?')) {
      pattern.object = parts.slice(2).join(' ');
    }

    return this.store.query(pattern);
  }
}

// ── Factory ──

export function createOntologyStore(): N3Store {
  return new N3Store();
}

export function createRuleEngine(withDefaults: boolean = true): RuleEngine {
  const engine = new RuleEngine();
  if (withDefaults) {
    engine.addDefaultRules();
  }
  return engine;
}

export function createConsistencyValidator(): ConsistencyValidator {
  return new ConsistencyValidator();
}

export function createPrivacyGuard(): PrivacyGuard {
  return new PrivacyGuard();
}
