/**
 * @musubix2/sdd-ontology — SDD Domain Ontology
 * @see DES-SDD-001 — 5フェーズワークフロー管理
 */

export type SDDPhase = 'requirements' | 'design' | 'task-breakdown' | 'implementation' | 'completion';

export type SDDConceptType =
  | 'requirement' | 'design-spec' | 'task' | 'source-code'
  | 'test-case' | 'decision' | 'pattern' | 'constraint' | 'policy';

export type SDDRelationType =
  | 'traces_to' | 'implements' | 'tests' | 'depends_on'
  | 'derives_from' | 'conflicts_with' | 'supersedes' | 'validates';

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
  { type: 'requirement', phase: 'requirements', description: 'EARS format requirement', requiredProperties: ['earsPattern', 'priority'], allowedRelations: ['traces_to', 'depends_on', 'conflicts_with'] },
  { type: 'design-spec', phase: 'design', description: 'Design specification', requiredProperties: ['traceability'], allowedRelations: ['implements', 'traces_to', 'depends_on', 'derives_from'] },
  { type: 'task', phase: 'task-breakdown', description: 'Implementation task', requiredProperties: ['desRef'], allowedRelations: ['implements', 'depends_on'] },
  { type: 'source-code', phase: 'implementation', description: 'Source code artifact', requiredProperties: ['filePath'], allowedRelations: ['implements', 'depends_on'] },
  { type: 'test-case', phase: 'implementation', description: 'Test case', requiredProperties: ['reqId'], allowedRelations: ['tests', 'validates'] },
  { type: 'decision', phase: 'design', description: 'Architecture Decision Record', requiredProperties: ['status'], allowedRelations: ['supersedes', 'derives_from'] },
  { type: 'pattern', phase: 'design', description: 'Design pattern usage', requiredProperties: ['patternName'], allowedRelations: ['implements'] },
  { type: 'constraint', phase: 'requirements', description: 'Non-functional constraint', requiredProperties: ['constraintType'], allowedRelations: ['depends_on', 'conflicts_with'] },
  { type: 'policy', phase: 'requirements', description: 'Constitution policy', requiredProperties: ['articleNumber'], allowedRelations: ['validates'] },
];

export const PHASE_ORDER: SDDPhase[] = ['requirements', 'design', 'task-breakdown', 'implementation', 'completion'];

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

  getStats(): { concepts: number; relations: number; byType: Record<string, number>; byPhase: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    for (const c of this.concepts.values()) {
      byType[c.type] = (byType[c.type] ?? 0) + 1;
      byPhase[c.phase] = (byPhase[c.phase] ?? 0) + 1;
    }
    return { concepts: this.concepts.size, relations: this.relations.length, byType, byPhase };
  }
}
