/**
 * @musubix2/sdd-ontology — SDD Domain Ontology
 * @see DES-SDD-001 — 5フェーズワークフロー管理
 * @see REQ-INT-003 — Turtle definitions
 */

export type SDDPhase =
  | 'requirements'
  | 'design'
  | 'task-breakdown'
  | 'implementation'
  | 'completion';

export type SDDConceptType =
  | 'requirement'
  | 'design-spec'
  | 'task'
  | 'source-code'
  | 'test-case'
  | 'decision'
  | 'pattern'
  | 'constraint'
  | 'policy';

export type SDDRelationType =
  | 'traces_to'
  | 'implements'
  | 'tests'
  | 'depends_on'
  | 'derives_from'
  | 'conflicts_with'
  | 'supersedes'
  | 'validates';

export interface SDDConcept {
  id: string;
  type: SDDConceptType;
  name: string;
  description: string;
  phase: SDDPhase;
  properties: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SDDRelation {
  id: string;
  source: string;
  target: string;
  type: SDDRelationType;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface ConceptDefinition {
  type: SDDConceptType;
  phase: SDDPhase;
  description: string;
  requiredProperties: string[];
  allowedRelations: SDDRelationType[];
}

export interface OntologyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const CONCEPT_DEFINITIONS: ConceptDefinition[] = [
  {
    type: 'requirement',
    phase: 'requirements',
    description: 'EARS format requirement',
    requiredProperties: ['earsPattern', 'priority'],
    allowedRelations: ['traces_to', 'depends_on', 'conflicts_with'],
  },
  {
    type: 'design-spec',
    phase: 'design',
    description: 'Design specification',
    requiredProperties: ['traceability'],
    allowedRelations: ['implements', 'traces_to', 'depends_on', 'derives_from'],
  },
  {
    type: 'task',
    phase: 'task-breakdown',
    description: 'Implementation task',
    requiredProperties: ['desRef'],
    allowedRelations: ['implements', 'depends_on'],
  },
  {
    type: 'source-code',
    phase: 'implementation',
    description: 'Source code artifact',
    requiredProperties: ['filePath'],
    allowedRelations: ['implements', 'depends_on'],
  },
  {
    type: 'test-case',
    phase: 'implementation',
    description: 'Test case',
    requiredProperties: ['reqId'],
    allowedRelations: ['tests', 'validates'],
  },
  {
    type: 'decision',
    phase: 'design',
    description: 'Architecture Decision Record',
    requiredProperties: ['status'],
    allowedRelations: ['supersedes', 'derives_from'],
  },
  {
    type: 'pattern',
    phase: 'design',
    description: 'Design pattern usage',
    requiredProperties: ['patternName'],
    allowedRelations: ['implements'],
  },
  {
    type: 'constraint',
    phase: 'requirements',
    description: 'Non-functional constraint',
    requiredProperties: ['constraintType'],
    allowedRelations: ['depends_on', 'conflicts_with'],
  },
  {
    type: 'policy',
    phase: 'requirements',
    description: 'Constitution policy',
    requiredProperties: ['articleNumber'],
    allowedRelations: ['validates'],
  },
];

export const PHASE_ORDER: SDDPhase[] = [
  'requirements',
  'design',
  'task-breakdown',
  'implementation',
  'completion',
];

export class OntologyModule {
  private definitions: Map<SDDConceptType, ConceptDefinition> = new Map();
  private concepts: Map<string, SDDConcept> = new Map();
  private relations: SDDRelation[] = [];

  constructor() {
    for (const def of CONCEPT_DEFINITIONS) {
      this.definitions.set(def.type, def);
    }
  }

  getDefinition(type: SDDConceptType): ConceptDefinition | undefined {
    return this.definitions.get(type);
  }

  getAllDefinitions(): ConceptDefinition[] {
    return [...this.definitions.values()];
  }

  addConcept(concept: SDDConcept): OntologyValidationResult {
    const validation = this.validateConcept(concept);
    if (validation.valid) {
      this.concepts.set(concept.id, concept);
    }
    return validation;
  }

  getConcept(id: string): SDDConcept | undefined {
    return this.concepts.get(id);
  }

  getConceptsByType(type: SDDConceptType): SDDConcept[] {
    return [...this.concepts.values()].filter((c) => c.type === type);
  }

  getConceptsByPhase(phase: SDDPhase): SDDConcept[] {
    return [...this.concepts.values()].filter((c) => c.phase === phase);
  }

  addRelation(relation: SDDRelation): OntologyValidationResult {
    const validation = this.validateRelation(relation);
    if (validation.valid) {
      this.relations.push(relation);
    }
    return validation;
  }

  getRelationsFor(conceptId: string): SDDRelation[] {
    return this.relations.filter((r) => r.source === conceptId || r.target === conceptId);
  }

  validateConcept(concept: SDDConcept): OntologyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const def = this.definitions.get(concept.type);

    if (!def) {
      errors.push(`Unknown concept type: ${concept.type}`);
      return { valid: false, errors, warnings };
    }

    if (concept.phase !== def.phase) {
      warnings.push(`Concept phase ${concept.phase} differs from expected ${def.phase}`);
    }

    for (const prop of def.requiredProperties) {
      if (concept.properties[prop] === undefined) {
        errors.push(`Missing required property: ${prop}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateRelation(relation: SDDRelation): OntologyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const source = this.concepts.get(relation.source);

    if (!source) {
      errors.push(`Source concept not found: ${relation.source}`);
      return { valid: false, errors, warnings };
    }

    const def = this.definitions.get(source.type);
    if (def && !def.allowedRelations.includes(relation.type)) {
      warnings.push(`Relation type ${relation.type} not typically allowed for ${source.type}`);
    }

    if (!this.concepts.has(relation.target)) {
      errors.push(`Target concept not found: ${relation.target}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  getPhaseIndex(phase: SDDPhase): number {
    return PHASE_ORDER.indexOf(phase);
  }

  isValidTransition(from: SDDPhase, to: SDDPhase): boolean {
    const fromIdx = this.getPhaseIndex(from);
    const toIdx = this.getPhaseIndex(to);
    return toIdx === fromIdx + 1;
  }

  getStats(): {
    concepts: number;
    relations: number;
    byType: Record<string, number>;
    byPhase: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    for (const c of this.concepts.values()) {
      byType[c.type] = (byType[c.type] ?? 0) + 1;
      byPhase[c.phase] = (byPhase[c.phase] ?? 0) + 1;
    }
    return { concepts: this.concepts.size, relations: this.relations.length, byType, byPhase };
  }
}

// ---------------------------------------------------------------------------
// REQ-INT-003: Turtle Module Definitions
// ---------------------------------------------------------------------------

export const SDD_CORE_TURTLE = `
@prefix sdd: <http://musubix2.dev/ontology/sdd#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

sdd:Requirement a owl:Class ;
  rdfs:label "Requirement" ;
  rdfs:comment "An EARS-format requirement capturing stakeholder needs." .

sdd:Design a owl:Class ;
  rdfs:label "Design" ;
  rdfs:comment "A design specification derived from requirements." .

sdd:Implementation a owl:Class ;
  rdfs:label "Implementation" ;
  rdfs:comment "Source code artifact implementing a design." .

sdd:Test a owl:Class ;
  rdfs:label "Test" ;
  rdfs:comment "A test case validating a requirement or implementation." .

sdd:hasId a owl:DatatypeProperty ;
  rdfs:domain sdd:Requirement ;
  rdfs:label "hasId" .

sdd:hasName a owl:DatatypeProperty ;
  rdfs:label "hasName" .

sdd:hasDescription a owl:DatatypeProperty ;
  rdfs:label "hasDescription" .
`;

export const SDD_WORKFLOW_TURTLE = `
@prefix sdd: <http://musubix2.dev/ontology/sdd#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

sdd:Phase a owl:Class ;
  rdfs:label "Phase" ;
  rdfs:comment "A workflow phase in the SDD lifecycle." .

sdd:RequirementsPhase a sdd:Phase ;
  rdfs:label "Requirements Phase" ;
  sdd:order 1 .

sdd:DesignPhase a sdd:Phase ;
  rdfs:label "Design Phase" ;
  sdd:order 2 .

sdd:TaskBreakdownPhase a sdd:Phase ;
  rdfs:label "Task Breakdown Phase" ;
  sdd:order 3 .

sdd:ImplementationPhase a sdd:Phase ;
  rdfs:label "Implementation Phase" ;
  sdd:order 4 .

sdd:CompletionPhase a sdd:Phase ;
  rdfs:label "Completion Phase" ;
  sdd:order 5 .

sdd:transitionsTo a owl:ObjectProperty ;
  rdfs:domain sdd:Phase ;
  rdfs:range sdd:Phase ;
  rdfs:label "transitionsTo" .

sdd:RequirementsPhase sdd:transitionsTo sdd:DesignPhase .
sdd:DesignPhase sdd:transitionsTo sdd:TaskBreakdownPhase .
sdd:TaskBreakdownPhase sdd:transitionsTo sdd:ImplementationPhase .
sdd:ImplementationPhase sdd:transitionsTo sdd:CompletionPhase .
`;

export const SDD_TRACEABILITY_TURTLE = `
@prefix sdd: <http://musubix2.dev/ontology/sdd#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

sdd:tracesTo a owl:ObjectProperty ;
  rdfs:label "tracesTo" ;
  rdfs:comment "Links a downstream artifact to its upstream source." .

sdd:implements a owl:ObjectProperty ;
  rdfs:subPropertyOf sdd:tracesTo ;
  rdfs:domain sdd:Implementation ;
  rdfs:range sdd:Design ;
  rdfs:label "implements" .

sdd:tests a owl:ObjectProperty ;
  rdfs:subPropertyOf sdd:tracesTo ;
  rdfs:domain sdd:Test ;
  rdfs:range sdd:Requirement ;
  rdfs:label "tests" .

sdd:dependsOn a owl:ObjectProperty ;
  rdfs:label "dependsOn" ;
  rdfs:comment "Declares a dependency between two artifacts." .

sdd:derivesFrom a owl:ObjectProperty ;
  rdfs:label "derivesFrom" ;
  rdfs:comment "Indicates that one artifact is derived from another." .

sdd:conflictsWith a owl:ObjectProperty ;
  rdfs:label "conflictsWith" ;
  rdfs:comment "Indicates a conflict between two artifacts." .

sdd:validates a owl:ObjectProperty ;
  rdfs:label "validates" ;
  rdfs:comment "Indicates that one artifact validates another." .
`;

export const SDD_GOVERNANCE_TURTLE = `
@prefix sdd: <http://musubix2.dev/ontology/sdd#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

sdd:ConstitutionArticle a owl:Class ;
  rdfs:label "Constitution Article" ;
  rdfs:comment "An article in the MUSUBIX2 constitution governing development." .

sdd:Policy a owl:Class ;
  rdfs:label "Policy" ;
  rdfs:comment "A governance policy derived from constitution articles." .

sdd:articleNumber a owl:DatatypeProperty ;
  rdfs:domain sdd:ConstitutionArticle ;
  rdfs:label "articleNumber" .

sdd:articleTitle a owl:DatatypeProperty ;
  rdfs:domain sdd:ConstitutionArticle ;
  rdfs:label "articleTitle" .

sdd:policyName a owl:DatatypeProperty ;
  rdfs:domain sdd:Policy ;
  rdfs:label "policyName" .

sdd:enforcedBy a owl:ObjectProperty ;
  rdfs:domain sdd:Policy ;
  rdfs:range sdd:ConstitutionArticle ;
  rdfs:label "enforcedBy" .

sdd:governsPhase a owl:ObjectProperty ;
  rdfs:domain sdd:Policy ;
  rdfs:range sdd:Phase ;
  rdfs:label "governsPhase" .
`;

// ---------------------------------------------------------------------------
// Turtle Module Names
// ---------------------------------------------------------------------------

const TURTLE_MODULES: Record<string, string> = {
  core: SDD_CORE_TURTLE,
  workflow: SDD_WORKFLOW_TURTLE,
  traceability: SDD_TRACEABILITY_TURTLE,
  governance: SDD_GOVERNANCE_TURTLE,
};

// ---------------------------------------------------------------------------
// TurtleLoader
// ---------------------------------------------------------------------------

interface TurtleConcept {
  uri: string;
  label: string;
  comment?: string;
  type?: string;
}

export class TurtleLoader {
  loadModule(name: string): OntologyModule {
    const turtle = TURTLE_MODULES[name];
    if (!turtle) {
      throw new Error(`Unknown Turtle module: ${name}. Valid: ${Object.keys(TURTLE_MODULES).join(', ')}`);
    }
    const mod = new OntologyModule();
    const concepts = this.extractConcepts(turtle);
    const now = new Date().toISOString();

    for (const concept of concepts) {
      mod.addConcept({
        id: concept.uri,
        type: this.inferConceptType(concept),
        name: concept.label,
        description: concept.comment ?? '',
        phase: 'requirements',
        properties: {},
        tags: [name],
        createdAt: now,
        updatedAt: now,
      });
    }

    return mod;
  }

  loadAll(): OntologyModule[] {
    return Object.keys(TURTLE_MODULES).map((name) => this.loadModule(name));
  }

  getModuleNames(): string[] {
    return Object.keys(TURTLE_MODULES);
  }

  private extractConcepts(turtle: string): TurtleConcept[] {
    const concepts: TurtleConcept[] = [];
    const lines = turtle.split('\n');

    let currentUri = '';
    let currentLabel = '';
    let currentComment = '';
    let currentType = '';

    for (const line of lines) {
      const trimmed = line.trim();

      const subjectMatch = /^(sdd:\w+)\s+a\s+([\w:]+)/.exec(trimmed);
      if (subjectMatch) {
        if (currentUri && currentLabel) {
          concepts.push({ uri: currentUri, label: currentLabel, comment: currentComment || undefined, type: currentType || undefined });
        }
        currentUri = subjectMatch[1];
        currentType = subjectMatch[2];
        currentLabel = '';
        currentComment = '';
        continue;
      }

      const labelMatch = /rdfs:label\s+"([^"]+)"/.exec(trimmed);
      if (labelMatch && currentUri) {
        currentLabel = labelMatch[1];
        continue;
      }

      const commentMatch = /rdfs:comment\s+"([^"]+)"/.exec(trimmed);
      if (commentMatch && currentUri) {
        currentComment = commentMatch[1];
      }
    }

    if (currentUri && currentLabel) {
      concepts.push({ uri: currentUri, label: currentLabel, comment: currentComment || undefined, type: currentType || undefined });
    }

    return concepts;
  }

  private inferConceptType(concept: TurtleConcept): SDDConceptType {
    const label = concept.label.toLowerCase();
    if (label.includes('requirement') || label.includes('constraint')) return 'requirement';
    if (label.includes('design') || label.includes('pattern')) return 'design-spec';
    if (label.includes('test')) return 'test-case';
    if (label.includes('implementation') || label.includes('source')) return 'source-code';
    if (label.includes('decision')) return 'decision';
    if (label.includes('policy') || label.includes('article') || label.includes('constitution')) return 'policy';
    if (label.includes('phase') || label.includes('task') || label.includes('workflow')) return 'task';
    return 'constraint';
  }
}

// ---------------------------------------------------------------------------
// TurtleValidator
// ---------------------------------------------------------------------------

export interface TurtleSyntaxResult {
  valid: boolean;
  errors: string[];
}

export interface TurtleSemanticsResult {
  consistent: boolean;
  issues: string[];
}

export class TurtleValidator {
  validateSyntax(turtle: string): TurtleSyntaxResult {
    const errors: string[] = [];
    const lines = turtle.split('\n');

    let hasPrefix = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('@prefix')) {
        hasPrefix = true;
        if (!trimmed.endsWith('.')) {
          errors.push(`Prefix declaration must end with '.': ${trimmed}`);
        }
        continue;
      }

      if (trimmed.includes('rdfs:') && !hasPrefix) {
        errors.push('rdfs prefix used but not declared');
      }
      if (trimmed.includes('owl:') && !hasPrefix) {
        errors.push('owl prefix used but not declared');
      }

      // Check for unclosed string literals
      const quoteCount = (trimmed.match(/"/g) ?? []).length;
      if (quoteCount % 2 !== 0) {
        errors.push(`Unclosed string literal on line: ${trimmed}`);
      }
    }

    if (!hasPrefix) {
      errors.push('No @prefix declarations found');
    }

    return { valid: errors.length === 0, errors };
  }

  validateSemantics(modules: OntologyModule[]): TurtleSemanticsResult {
    const issues: string[] = [];

    if (modules.length === 0) {
      issues.push('No modules provided for semantic validation');
      return { consistent: false, issues };
    }

    const allDefinitions = new Set<string>();
    for (const mod of modules) {
      for (const def of mod.getAllDefinitions()) {
        allDefinitions.add(def.type);
      }
    }

    if (allDefinitions.size === 0) {
      issues.push('No concept definitions found in any module');
    }

    // Check that core concept types are covered
    const coreTypes: SDDConceptType[] = ['requirement', 'design-spec', 'source-code', 'test-case'];
    for (const ct of coreTypes) {
      if (!allDefinitions.has(ct)) {
        issues.push(`Core concept type "${ct}" not defined in any module`);
      }
    }

    return { consistent: issues.length === 0, issues };
  }
}

export function createTurtleLoader(): TurtleLoader {
  return new TurtleLoader();
}

export function createTurtleValidator(): TurtleValidator {
  return new TurtleValidator();
}
