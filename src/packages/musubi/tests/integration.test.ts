import { describe, it, expect, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

// Import from core
import {
  EARSValidator,
  createEARSValidator,
  DesignGenerator,
  createDesignGenerator,
  SOLIDValidator,
  createSOLIDValidator,
  TraceabilityValidator,
  createTraceabilityValidator,
  CodeGenerator,
  createCodeGenerator,
  type ParsedRequirementInput,
  type TraceLink,
} from '../../core/src/index.js';

// Import from other packages
import { PolicyEngine, type PolicyContext, type PolicyResult } from '../../policy/src/index.js';
import { DecisionManager, createDecisionManager } from '../../decisions/src/index.js';
import { FileKnowledgeStore, createKnowledgeStore, type Entity, type Relation } from '../../knowledge/src/index.js';
import { PhaseController, StateTracker, createStateTracker, createPhaseController } from '../../workflow-engine/src/index.js';

describe('Integration: SDD Workflow', () => {
  it('EARS → Design pipeline: parse, generate, validate SOLID', () => {
    const validator = createEARSValidator();
    const designGen = createDesignGenerator();
    const solidValidator = createSOLIDValidator();

    // Step 1: Validate an EARS requirement
    const result = validator.validate('When the user submits a form, the system shall save the data.');
    expect(result).toBeDefined();
    expect(result.valid).toBe(true);

    // Step 2: Generate design from requirements
    const requirements: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'Form Submission', text: 'When the user submits a form, the system shall save the data.', pattern: 'event-driven' },
      { id: 'REQ-002', title: 'Validation', text: 'The system shall validate all input fields before saving.', pattern: 'ubiquitous' },
    ];
    const design = designGen.generate(requirements);
    expect(design).toBeDefined();
    expect(design.id).toBeTruthy();
    expect(design.sections.length).toBeGreaterThan(0);

    // Step 3: Validate SOLID principles
    const solidReport = solidValidator.validate(design);
    expect(solidReport).toBeDefined();
    expect(typeof solidReport.score).toBe('number');
    expect(solidReport.principleScores).toBeDefined();
  });

  it('Traceability chain: requirements → designs → tests coverage', () => {
    const traceValidator = createTraceabilityValidator();

    const requirementIds = ['REQ-001', 'REQ-002', 'REQ-003'];
    const designIds = ['DES-001', 'DES-002'];
    const testIds = ['TEST-001', 'TEST-002'];

    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
      { sourceId: 'REQ-002', targetId: 'DES-002', type: 'requirement-to-design' },
      { sourceId: 'DES-001', targetId: 'TEST-001', type: 'design-to-test' },
      { sourceId: 'DES-002', targetId: 'TEST-002', type: 'design-to-test' },
    ];

    const report = traceValidator.validateCoverage(requirementIds, designIds, testIds, links);
    expect(report).toBeDefined();
    expect(report.totalRequirements).toBe(3);
    // REQ-003 has no link
    expect(report.gaps.length).toBeGreaterThan(0);
    expect(report.coveragePercent).toBeLessThan(100);
  });

  it('Workflow phase management: approve and transition sequentially', async () => {
    const tracker = createStateTracker();
    const controller = createPhaseController(tracker);

    // Start in requirements phase
    expect(controller.getCurrentPhase()).toBe('requirements');

    // Add artifacts and approve requirements phase
    tracker.addArtifact('requirements', 'REQ-001.md');
    tracker.approve('requirements');
    expect(tracker.isApproved('requirements')).toBe(true);

    // Transition to design
    const result = await controller.transitionTo('design');
    expect(result).toBeDefined();
    expect(controller.getCurrentPhase()).toBe('design');

    // Approve design and continue
    tracker.addArtifact('design', 'DES-001.md');
    tracker.approve('design');

    const nextResult = await controller.transitionTo('task-breakdown');
    expect(nextResult).toBeDefined();
    expect(controller.getCurrentPhase()).toBe('task-breakdown');
  });

  it('Policy enforcement: register and validate policy', async () => {
    const engine = new PolicyEngine();

    engine.register({
      id: 'CONST-001',
      name: 'Test-First Policy',
      article: 1,
      severity: 'critical',
      description: 'Tests must be written before implementation',
      async validate(context: PolicyContext): Promise<PolicyResult> {
        return { passed: true, violations: [] };
      },
    });

    const policies = engine.listPolicies();
    expect(policies.length).toBeGreaterThan(0);
    expect(policies[0].id).toBe('CONST-001');

    const report = await engine.validateAll({ projectPath: '/test-project' });
    expect(report).toBeDefined();
    expect(report.overallPass).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('Knowledge graph round-trip: entities, relations, query, traverse', async () => {
    const store = createKnowledgeStore('/knowledge-test');

    const now = new Date().toISOString();

    // Add entities
    const reqEntity: Entity = {
      id: 'req-1',
      type: 'requirement',
      name: 'User Login',
      description: 'User authentication requirement',
      properties: { priority: 'high' },
      tags: ['auth', 'security'],
      createdAt: now,
      updatedAt: now,
    };

    const designEntity: Entity = {
      id: 'des-1',
      type: 'design',
      name: 'Auth Module Design',
      description: 'Design for authentication module',
      properties: { pattern: 'strategy' },
      tags: ['auth'],
      createdAt: now,
      updatedAt: now,
    };

    await store.putEntity(reqEntity);
    await store.putEntity(designEntity);

    // Add relation
    const relation: Relation = {
      id: 'rel-1',
      source: 'req-1',
      target: 'des-1',
      type: 'traces_to',
    };
    await store.addRelation(relation);

    // Query entities
    const entities = await store.query({ type: 'requirement' });
    expect(entities.length).toBeGreaterThanOrEqual(1);
    expect(entities[0].id).toBe('req-1');

    // Get relations
    const relations = await store.getRelations('req-1', 'out');
    expect(relations.length).toBe(1);
    expect(relations[0].target).toBe('des-1');

    // Traverse graph
    const traversed = await store.traverse('req-1', { maxDepth: 2 });
    expect(traversed.length).toBeGreaterThanOrEqual(1);

    // Stats
    const stats = store.getStats();
    expect(stats.entityCount).toBe(2);
    expect(stats.relationCount).toBe(1);
  });

  it('Code generation from design document', () => {
    const designGen = createDesignGenerator();
    const codeGen = createCodeGenerator();

    const requirements: ParsedRequirementInput[] = [
      { id: 'REQ-010', title: 'Payment Processing', text: 'The system shall process payments.', pattern: 'ubiquitous' },
    ];

    // Generate design
    const design = designGen.generate(requirements);
    expect(design.sections.length).toBeGreaterThan(0);

    // Generate code from the design
    const code = codeGen.generate({
      templateType: 'class',
      name: 'PaymentProcessor',
      description: 'Processes payments based on design',
      methods: [
        { name: 'processPayment', params: 'amount: number', returnType: 'Promise<boolean>' },
        { name: 'refund', params: 'transactionId: string', returnType: 'Promise<void>' },
      ],
    });

    expect(code).toBeDefined();
    expect(code.code).toContain('PaymentProcessor');
    expect(code.code).toContain('processPayment');
  });

  it('Full SDD cycle: requirements → design → traceability → code generation', () => {
    const earsValidator = createEARSValidator();
    const designGen = createDesignGenerator();
    const solidValidator = createSOLIDValidator();
    const traceValidator = createTraceabilityValidator();
    const codeGen = createCodeGenerator();

    // Phase 1: Requirements
    const reqTexts = [
      'When the user logs in, the system shall create a session.',
      'The system shall encrypt all stored passwords.',
    ];
    for (const text of reqTexts) {
      const result = earsValidator.validate(text);
      expect(result.valid).toBe(true);
    }

    // Phase 2: Design
    const requirements: ParsedRequirementInput[] = [
      { id: 'REQ-100', title: 'Session Creation', text: reqTexts[0], pattern: 'event-driven' },
      { id: 'REQ-101', title: 'Password Encryption', text: reqTexts[1], pattern: 'ubiquitous' },
    ];
    const design = designGen.generate(requirements);
    expect(design.sections.length).toBeGreaterThan(0);

    // Phase 2b: SOLID validation
    const solidReport = solidValidator.validate(design);
    expect(solidReport.score).toBeGreaterThanOrEqual(0);

    // Phase 3: Traceability
    const links: TraceLink[] = [
      { sourceId: 'REQ-100', targetId: design.sections[0]?.title ?? 'DES-100', type: 'requirement-to-design' },
      { sourceId: 'REQ-101', targetId: design.sections[0]?.title ?? 'DES-101', type: 'requirement-to-design' },
    ];
    const traceReport = traceValidator.validateCoverage(
      ['REQ-100', 'REQ-101'],
      [design.sections[0]?.title ?? 'DES-100'],
      [],
      links,
    );
    expect(traceReport.totalRequirements).toBe(2);

    // Phase 4: Code generation
    const code = codeGen.generate({
      templateType: 'class',
      name: 'SessionManager',
      description: 'Manages user sessions from REQ-100',
      methods: [
        { name: 'createSession', params: 'userId: string', returnType: 'Session' },
        { name: 'destroySession', params: 'sessionId: string', returnType: 'void' },
      ],
    });
    expect(code.code).toContain('SessionManager');
    expect(code.code).toContain('createSession');
  });

  const tempDirs: string[] = [];
  afterAll(() => {
    for (const d of tempDirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it('Decision management: create and retrieve ADRs', async () => {
    const testDir = join(__dirname, '.test-decisions-' + Date.now());
    tempDirs.push(testDir);
    const manager = createDecisionManager(testDir);

    const adr = await manager.create({
      title: 'Use TypeScript for all packages',
      context: 'Need a typed language for SDD tooling',
      decision: 'We will use TypeScript with strict mode enabled',
      consequences: ['Type safety across codebase', 'Compilation step required'],
    });

    expect(adr).toBeDefined();
    expect(adr.title).toBe('Use TypeScript for all packages');

    const list = await manager.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
