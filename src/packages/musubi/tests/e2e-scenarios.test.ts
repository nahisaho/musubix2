/**
 * E2E Cross-Package Integration Tests
 *
 * Verifies the full SDD pipeline across all @musubix2 packages.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── @musubix2/core ──────────────────────────────────────────────────────────
import {
  createProjectInitializer,
  createEARSValidator,
  RequirementWizard,
  createDesignGenerator,
  createSOLIDValidator,
  createTraceabilityManager,
  createStaticAnalyzer,
  createQualityMetricsCalculator,
  createPatternExtractor,
  createLearningEngine,
  type ParsedRequirementInput,
} from '../../core/src/index.js';

// ─── @musubix2/workflow-engine ───────────────────────────────────────────────
import {
  createPhaseController,
  createStateTracker,
  createTaskBreakdownManager,
  createExtendedQualityGateRunner,
  type TaskInfo,
  type GateCheckContext,
} from '../../workflow-engine/src/index.js';

// ─── @musubix2/knowledge ────────────────────────────────────────────────────
import {
  createKnowledgeStore,
  type Entity,
  type Relation,
} from '../../knowledge/src/index.js';

// ─── @musubix2/policy ───────────────────────────────────────────────────────
import {
  PolicyEngine,
  type PolicyContext,
  type PolicyResult,
} from '../../policy/src/index.js';

// ─── @musubix2/codegraph ───────────────────────────────────────────────────
import { createASTParser } from '../../codegraph/src/index.js';

// ─── @musubix2/dfg ──────────────────────────────────────────────────────────
import { createDataFlowAnalyzer, type SimpleStatement } from '../../dfg/src/index.js';

// ─── @musubix2/security ─────────────────────────────────────────────────────
import {
  createSecurityScanner,
  SecretDetector,
  TaintAnalyzer,
} from '../../security/src/index.js';

// ─── @musubix2/neural-search ────────────────────────────────────────────────
import {
  createNeuralSearchEngine,
  createMockEmbeddingModel,
} from '../../neural-search/src/index.js';

// ─── @musubix2/agent-orchestrator ───────────────────────────────────────────
import {
  createSubagentDispatcher,
  type SubagentSpec,
} from '../../agent-orchestrator/src/index.js';

// ─── @musubix2/expert-delegation ────────────────────────────────────────────
import {
  createSemanticRouter,
  type Expert,
  type TriggerPattern,
} from '../../expert-delegation/src/index.js';

// ─── @musubix2/skill-harness ────────────────────────────────────────────────
import { SkillRouter, type SkillCapability } from '../../skill-harness/src/index.js';

// ─── @musubix2/skill-manager ────────────────────────────────────────────────
import {
  createSkillRegistry,
  createSkillExecutor,
  type Skill,
} from '../../skill-manager/src/index.js';

// ─── @musubix2/musubi (local) ───────────────────────────────────────────────
import {
  createCLIDispatcher,
  showHelp,
  parseArgs,
  getDefaultCommands,
  ExitCode,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function tempDir(prefix: string): string {
  const dir = join(__dirname, `.e2e-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scenario 1: Full SDD Lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scenario 1: Full SDD Lifecycle', () => {
  it('project init → requirements → design → tasks → traceability → quality gates', async () => {
    // ── Step 1: Project initialization ──
    const initializer = createProjectInitializer();
    const outputDir = tempDir('project');

    const initResult = initializer.init({
      projectName: 'e2e-test-project',
      template: 'minimal',
      outputDir,
    });
    expect(initResult.success).toBe(true);
    expect(initResult.createdFiles.length).toBeGreaterThan(0);
    expect(initResult.errors).toHaveLength(0);

    // ── Step 2: Requirements with EARS validation ──
    const earsValidator = createEARSValidator();
    const reqTexts = [
      'When the user submits a form, the system shall save the data.',
      'The system shall validate all input fields before saving.',
      'While the system is in maintenance mode, the system shall reject new requests.',
    ];
    for (const text of reqTexts) {
      const result = earsValidator.validate(text);
      expect(result.valid).toBe(true);
    }

    // Wizard step introspection
    const wizard = new RequirementWizard();
    expect(wizard.getSteps().length).toBeGreaterThan(0);

    // ── Step 3: Design generation + SOLID validation ──
    const designGen = createDesignGenerator();
    const solidValidator = createSOLIDValidator();

    const requirements: ParsedRequirementInput[] = [
      { id: 'REQ-E2E-001', title: 'Form Submission', text: reqTexts[0], pattern: 'event-driven' },
      { id: 'REQ-E2E-002', title: 'Input Validation', text: reqTexts[1], pattern: 'ubiquitous' },
      { id: 'REQ-E2E-003', title: 'Maintenance Mode', text: reqTexts[2], pattern: 'state-driven' },
    ];
    const design = designGen.generate(requirements);
    expect(design.id).toBeTruthy();
    expect(design.sections.length).toBeGreaterThan(0);

    const solidReport = solidValidator.validate(design);
    expect(solidReport.score).toBeGreaterThanOrEqual(0);
    expect(solidReport.principleScores).toBeDefined();

    // ── Step 4: Task breakdown ──
    const taskManager = createTaskBreakdownManager();
    const tasks: TaskInfo[] = [
      {
        id: 'TASK-001',
        title: 'Implement form handler',
        description: 'Create form submission handler for REQ-E2E-001',
        priority: 'high',
        status: 'pending',
        dependencies: [],
        estimatedComplexity: 'medium',
      },
      {
        id: 'TASK-002',
        title: 'Implement validation',
        description: 'Create input validator for REQ-E2E-002',
        priority: 'high',
        status: 'pending',
        dependencies: ['TASK-001'],
        estimatedComplexity: 'simple',
      },
      {
        id: 'TASK-003',
        title: 'Implement maintenance mode',
        description: 'Create maintenance mode for REQ-E2E-003',
        priority: 'medium',
        status: 'pending',
        dependencies: [],
        estimatedComplexity: 'complex',
      },
    ];
    for (const task of tasks) {
      taskManager.addTask(task);
    }

    // TASK-001 and TASK-003 have no pending deps → ready
    const readyTasks = taskManager.getReadyTasks();
    expect(readyTasks.length).toBe(2);
    expect(readyTasks.map((t) => t.id).sort()).toEqual(['TASK-001', 'TASK-003']);

    const breakdown = taskManager.getBreakdown();
    expect(breakdown.totalTasks).toBe(3);
    expect(breakdown.completedTasks).toBe(0);

    // Complete a task and verify downstream becomes ready
    taskManager.updateStatus('TASK-001', 'done');
    const readyAfter = taskManager.getReadyTasks();
    expect(readyAfter.map((t) => t.id)).toContain('TASK-002');

    const markdown = taskManager.toMarkdown();
    expect(markdown).toContain('TASK-001');

    // ── Step 5: Traceability across phases ──
    const traceManager = createTraceabilityManager();
    const link1 = traceManager.addLink('REQ-E2E-001', 'TASK-001', 'requirement-to-design');
    const link2 = traceManager.addLink('REQ-E2E-002', 'TASK-002', 'requirement-to-design');
    const link3 = traceManager.addLink('REQ-E2E-003', 'TASK-003', 'requirement-to-design');

    expect(link1.id).toBeTruthy();
    expect(link1.sourceId).toBe('REQ-E2E-001');
    expect(link1.verified).toBe(false);

    const linksFromReq1 = traceManager.getLinksFrom('REQ-E2E-001');
    expect(linksFromReq1).toHaveLength(1);
    expect(linksFromReq1[0].targetId).toBe('TASK-001');

    // REQ-E2E-004 has no links → should show as unlinked
    const unlinked = traceManager.findUnlinked([
      'REQ-E2E-001',
      'REQ-E2E-002',
      'REQ-E2E-003',
      'REQ-E2E-004',
    ]);
    expect(unlinked).toContain('REQ-E2E-004');

    // Verify a link
    traceManager.verifyLink(link1.id);
    const verifiedLinks = traceManager.getLinksFrom('REQ-E2E-001');
    expect(verifiedLinks[0].verified).toBe(true);

    const traceMarkdown = traceManager.toMarkdown();
    expect(traceMarkdown).toBeTruthy();

    // ── Step 6: Phase transitions + quality gates ──
    const tracker = createStateTracker();
    const controller = createPhaseController(tracker);
    expect(controller.getCurrentPhase()).toBe('requirements');

    tracker.addArtifact('requirements', 'REQ-E2E-001.md');
    tracker.addArtifact('requirements', 'REQ-E2E-002.md');
    tracker.approve('requirements');
    expect(tracker.isApproved('requirements')).toBe(true);

    const transResult = await controller.transitionTo('design');
    expect(transResult).toBeDefined();
    expect(controller.getCurrentPhase()).toBe('design');

    // Extended quality gate runner
    const gateRunner = createExtendedQualityGateRunner();
    const gateContext: GateCheckContext = {
      phase: 'design',
      coveragePercent: 85,
      lintErrors: 0,
      testsPassed: 10,
      testsTotal: 10,
      documentedExports: 8,
      totalExports: 10,
    };
    const gateResult = gateRunner.runAll(gateContext);
    expect(gateResult.results.length).toBeGreaterThan(0);
    expect(typeof gateResult.allPassed).toBe('boolean');

    for (const r of gateResult.results) {
      expect(r.gateName).toBeTruthy();
      expect(typeof r.passed).toBe('boolean');
      expect(r.message).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scenario 2: Knowledge Graph + Policy Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scenario 2: Knowledge Graph + Policy Pipeline', () => {
  it('knowledge store → policy validation → autoFix → graph traversal', async () => {
    // ── Step 1: Knowledge graph ──
    const store = createKnowledgeStore('/e2e-knowledge');
    const now = new Date().toISOString();

    const entities: Entity[] = [
      {
        id: 'req-auth',
        type: 'requirement',
        name: 'User Authentication',
        description: 'Users must authenticate before accessing the system',
        properties: { priority: 'critical' },
        tags: ['auth', 'security'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'des-auth',
        type: 'design',
        name: 'Auth Module Design',
        description: 'Strategy-pattern based authentication module',
        properties: { pattern: 'strategy' },
        tags: ['auth'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'code-auth',
        type: 'code',
        name: 'AuthService',
        description: 'Implementation of auth service',
        properties: { language: 'typescript' },
        tags: ['auth', 'implementation'],
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const entity of entities) {
      await store.putEntity(entity);
    }

    const relations: Relation[] = [
      { id: 'rel-1', source: 'req-auth', target: 'des-auth', type: 'traces_to' },
      { id: 'rel-2', source: 'des-auth', target: 'code-auth', type: 'implements' },
    ];

    for (const rel of relations) {
      await store.addRelation(rel);
    }

    // ── Step 2: Query and verify knowledge graph ──
    const reqEntities = await store.query({ type: 'requirement' });
    expect(reqEntities).toHaveLength(1);
    expect(reqEntities[0].id).toBe('req-auth');

    const relationsOut = await store.getRelations('req-auth', 'out');
    expect(relationsOut).toHaveLength(1);
    expect(relationsOut[0].target).toBe('des-auth');

    // ── Step 3: Graph traversal ──
    const traversed = await store.traverse('req-auth', { maxDepth: 3 });
    expect(traversed.length).toBeGreaterThanOrEqual(1);

    const stats = store.getStats();
    expect(stats.entityCount).toBe(3);
    expect(stats.relationCount).toBe(2);

    // ── Step 4: Policy engine with pass + fail policies ──
    const engine = new PolicyEngine();

    // Policy that passes
    engine.register({
      id: 'CONST-001',
      name: 'Test-First Policy',
      article: 1,
      severity: 'critical',
      description: 'Tests must be written before implementation',
      async validate(_context: PolicyContext): Promise<PolicyResult> {
        return { passed: true, violations: [] };
      },
    });

    // Policy that fails
    engine.register({
      id: 'CONST-002',
      name: 'Documentation Policy',
      article: 2,
      severity: 'major',
      description: 'All exports must be documented',
      async validate(_context: PolicyContext): Promise<PolicyResult> {
        return {
          passed: false,
          violations: [
            {
              policyId: 'CONST-002',
              article: 2,
              severity: 'major',
              message: 'Missing documentation for exported function',
              suggestion: 'Add JSDoc comments to all exported functions',
            },
          ],
        };
      },
    });

    const policies = engine.listPolicies();
    // PolicyEngine includes built-in constitution policies + our 2 custom ones
    expect(policies.length).toBeGreaterThanOrEqual(2);
    expect(policies.find((p) => p.id === 'CONST-001')).toBeDefined();
    expect(policies.find((p) => p.id === 'CONST-002')).toBeDefined();

    // ── Step 5: Validate all policies ──
    const report = await engine.validateAll({ projectPath: '/e2e-project' });
    expect(report).toBeDefined();
    expect(report.articles.length).toBeGreaterThan(0);
    expect(report.timestamp).toBeInstanceOf(Date);

    // validateOne on our custom failing policy confirms it reports violations
    const singleResult = await engine.validateOne('CONST-002', { projectPath: '/e2e-project' });
    expect(singleResult.passed).toBe(false);
    expect(singleResult.violations.length).toBeGreaterThan(0);

    // Find the failing violation
    const docViolation = singleResult.violations.find((v) => v.policyId === 'CONST-002');
    expect(docViolation).toBeDefined();
    expect(docViolation!.severity).toBe('major');

    // ── Step 6: autoFix on the violation ──
    const fixResult = engine.autoFix(docViolation!);
    expect(fixResult).toBeDefined();
    expect(typeof fixResult.fixed).toBe('boolean');
    expect(fixResult.description).toBeTruthy();

    // ── Step 7: Verify knowledge graph search ──
    const searchResults = await store.search('auth');
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scenario 3: Code Analysis Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scenario 3: Code Analysis Pipeline', () => {
  it('AST parse → DFG → security scan → static analysis → consistent results', () => {
    const sampleCode = `
class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getUser(id: string): Promise<User> {
    return this.db.findById(id);
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(id);
  }
}

function helperFn(x: number): number {
  const y = x * 2;
  return y + 1;
}
`;

    const insecureCode = `
const password = "hardcoded_secret_123";
const apiKey = "AKIAIOSFODNN7EXAMPLE";

function query(input: string) {
  const sql = "SELECT * FROM users WHERE id = " + input;
  return db.execute(sql);
}
`;

    // ── Step 1: AST parsing ──
    const astParser = createASTParser();
    const nodes = astParser.parse(sampleCode, 'typescript');
    expect(nodes.length).toBeGreaterThan(0);

    const classNode = nodes.find((n) => n.name === 'UserService');
    expect(classNode).toBeDefined();
    expect(classNode!.kind).toBeTruthy();

    const languages = astParser.getSupportedLanguages();
    expect(languages).toContain('typescript');
    expect(languages).toContain('python');

    // ── Step 2: Data flow analysis ──
    const dfAnalyzer = createDataFlowAnalyzer();

    const statements: SimpleStatement[] = [
      { type: 'declaration', line: 1, variable: 'x', value: '10', usedVariables: [] },
      { type: 'assignment', line: 2, variable: 'y', value: 'x * 2', usedVariables: ['x'] },
      { type: 'assignment', line: 3, variable: 'z', value: 'y + 1', usedVariables: ['y'] },
      { type: 'return', line: 4, value: 'z', usedVariables: ['z'] },
    ];

    const dfg = dfAnalyzer.buildDFG(statements, 'helperFn');
    expect(dfg.nodes.length).toBeGreaterThan(0);
    expect(dfg.edges.length).toBeGreaterThan(0);

    // Query reaching definitions
    const reachingDefs = dfAnalyzer.queryReachingDefs(dfg, 'y');
    expect(reachingDefs.length).toBeGreaterThanOrEqual(1);

    // Query variable uses
    const uses = dfAnalyzer.queryUses(dfg, 'x');
    expect(uses.length).toBeGreaterThanOrEqual(1);

    // Control-flow graph
    const cfg = dfAnalyzer.buildCFG(statements);
    expect(cfg.nodes.length).toBeGreaterThan(0);

    // ── Step 3: Security scanning ──
    const scanner = createSecurityScanner();
    const scanResult = scanner.scan(insecureCode, 'insecure.ts');
    expect(scanResult).toBeDefined();
    expect(scanResult.findings.length).toBeGreaterThan(0);

    // Verify specific finding types
    const secretFindings = scanResult.findings.filter(
      (f) => f.type === 'secret-leak' || f.type === 'hardcoded-credential',
    );
    expect(secretFindings.length).toBeGreaterThan(0);

    // Individual detector results
    const secretDetector = new SecretDetector();
    const secrets = secretDetector.scan(insecureCode, 'insecure.ts');
    expect(secrets.length).toBeGreaterThan(0);

    const taintAnalyzer = new TaintAnalyzer();
    const taints = taintAnalyzer.analyze(insecureCode, 'insecure.ts');
    expect(taints).toBeDefined();

    // ── Step 4: Static analysis + quality metrics ──
    const staticAnalyzer = createStaticAnalyzer();
    const analysisClean = staticAnalyzer.analyze(sampleCode);
    expect(analysisClean).toBeDefined();
    expect(typeof analysisClean.score).toBe('number');
    expect(analysisClean.metrics.length).toBeGreaterThan(0);

    const analysisInsecure = staticAnalyzer.analyze(insecureCode);
    expect(analysisInsecure).toBeDefined();

    // ── Step 5: Quality metrics aggregation ──
    const metricsCalc = createQualityMetricsCalculator();
    const aggregated = metricsCalc.calculate([analysisClean, analysisInsecure]);
    expect(typeof aggregated.averageScore).toBe('number');
    expect(typeof aggregated.totalIssues).toBe('number');

    // ── Consistency check: AST + DFG + security should all process code ──
    const astNodes = astParser.parse(insecureCode, 'typescript');
    expect(astNodes.length).toBeGreaterThan(0);
    // The code that has secrets in AST should also have findings in security scan
    expect(scanResult.findings.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scenario 4: Learning + Search Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scenario 4: Learning + Search Pipeline', () => {
  it('pattern extraction → learning engine → neural search → retrieval', async () => {
    // ── Step 1: Extract patterns from code ──
    const extractor = createPatternExtractor();
    const codeA = `
class PaymentService {
  private gateway: PaymentGateway;

  constructor(gateway: PaymentGateway) {
    this.gateway = gateway;
  }

  async processPayment(amount: number): Promise<boolean> {
    try {
      return await this.gateway.charge(amount);
    } catch (error) {
      throw new Error('Payment failed: ' + error);
    }
  }
}
`;
    const codeB = `
class NotificationService {
  private sender: EmailSender;

  constructor(sender: EmailSender) {
    this.sender = sender;
  }

  async notify(userId: string, message: string): Promise<void> {
    await this.sender.send(userId, message);
  }
}
`;

    const patternsA = extractor.extract(codeA);
    const patternsB = extractor.extract(codeB);
    expect(patternsA.length).toBeGreaterThan(0);
    expect(patternsB.length).toBeGreaterThan(0);

    const categories = extractor.getCategories();
    expect(categories.length).toBeGreaterThan(0);

    // ── Step 2: Store patterns in learning engine ──
    const engine = createLearningEngine();

    for (const p of [...patternsA, ...patternsB]) {
      engine.recordPattern(p);
    }

    engine.recordEvent({
      type: 'pattern-detected',
      data: { source: 'e2e-test', count: patternsA.length + patternsB.length },
      timestamp: new Date(),
    });

    const allPatterns = engine.getPatterns();
    // Engine may deduplicate patterns with same id/category
    expect(allPatterns.length).toBeGreaterThanOrEqual(1);
    expect(allPatterns.length).toBeLessThanOrEqual(patternsA.length + patternsB.length);

    const topPatterns = engine.getTopPatterns(3);
    expect(topPatterns.length).toBeLessThanOrEqual(3);

    const events = engine.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pattern-detected');

    // Suggestions based on new code
    const suggestions = engine.suggest(codeA, extractor);
    expect(suggestions).toBeDefined();

    // ── Step 3: Index patterns for neural search ──
    const embeddingModel = createMockEmbeddingModel(64);
    const searchEngine = createNeuralSearchEngine();

    for (const pattern of allPatterns) {
      const vector = await embeddingModel.embed(pattern.pattern);
      searchEngine.addDocument(pattern.id, vector, {
        category: pattern.category,
        pattern: pattern.pattern,
      });
    }

    expect(searchEngine.size()).toBe(allPatterns.length);

    // ── Step 4: Search for similar patterns ──
    const queryVector = await embeddingModel.embed('dependency injection constructor');
    const hits = searchEngine.search(queryVector, 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(3);

    for (const hit of hits) {
      expect(typeof hit.score).toBe('number');
      expect(hit.id).toBeTruthy();
      expect(hit.metadata).toBeDefined();
    }

    // Batch embedding
    const texts = allPatterns.map((p) => p.pattern);
    const batchVectors = await embeddingModel.embedBatch(texts);
    expect(batchVectors.length).toBe(texts.length);
    expect(batchVectors[0].length).toBe(64);

    // Remove + clear
    const removed = searchEngine.remove(allPatterns[0].id);
    expect(removed).toBe(true);
    expect(searchEngine.size()).toBe(allPatterns.length - 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scenario 5: Agent Orchestration Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scenario 5: Agent Orchestration Pipeline', () => {
  it('dispatcher → semantic routing → skill routing → execution', async () => {
    // ── Step 1: Subagent dispatcher ──
    const dispatcher = createSubagentDispatcher();

    const agents: SubagentSpec[] = [
      {
        id: 'agent-analyzer',
        role: 'analyzer',
        name: 'Code Analyzer',
        capabilities: ['static-analysis', 'complexity', 'code-review'],
      },
      {
        id: 'agent-generator',
        role: 'generator',
        name: 'Code Generator',
        capabilities: ['scaffolding', 'boilerplate', 'test-generation'],
      },
      {
        id: 'agent-tester',
        role: 'tester',
        name: 'Test Runner',
        capabilities: ['unit-tests', 'integration-tests', 'e2e-tests'],
      },
    ];

    for (const agent of agents) {
      dispatcher.registerAgent(agent);
    }

    expect(dispatcher.listAgents().length).toBe(3);
    expect(dispatcher.listAgents('analyzer')).toHaveLength(1);
    expect(dispatcher.getAgent('agent-analyzer')).toBeDefined();

    // Dispatch a task
    const task = dispatcher.dispatch('agent-analyzer', 'Analyze codebase', {
      targetPath: './src',
      depth: 3,
    });
    expect(task.id).toBeTruthy();
    expect(task.status).toBe('running');
    expect(task.agentId).toBe('agent-analyzer');

    const activeTasks = dispatcher.getActiveTasks();
    expect(activeTasks.length).toBeGreaterThanOrEqual(1);

    // Complete the task
    dispatcher.completeTask(task.id, { issues: 0, score: 95 });
    const completed = dispatcher.getTask(task.id);
    expect(completed).toBeDefined();
    expect(completed!.status).toBe('completed');
    expect(completed!.result).toEqual({ issues: 0, score: 95 });

    // Dispatch and fail a task
    const failTask = dispatcher.dispatch('agent-tester', 'Run tests', { suite: 'all' });
    dispatcher.failTask(failTask.id, 'Test timeout');
    const failed = dispatcher.getTask(failTask.id);
    expect(failed!.status).toBe('failed');
    expect(failed!.error).toBe('Test timeout');

    // ── Step 2: Semantic routing ──
    const router = createSemanticRouter();

    const experts: Expert[] = [
      {
        id: 'expert-security',
        name: 'Security Expert',
        domain: 'security',
        capabilities: ['vulnerability-scan', 'taint-analysis', 'secret-detection'],
        triggerPatterns: [
          { keywords: ['security', 'vulnerability', 'CVE'], domain: 'security', priority: 10 },
          { keywords: ['secret', 'password', 'key'], domain: 'security', priority: 8 },
        ],
      },
      {
        id: 'expert-testing',
        name: 'Testing Expert',
        domain: 'testing',
        capabilities: ['unit-test', 'coverage', 'e2e'],
        triggerPatterns: [
          { keywords: ['test', 'coverage', 'assertion'], domain: 'testing', priority: 9 },
        ],
      },
      {
        id: 'expert-arch',
        name: 'Architecture Expert',
        domain: 'architecture',
        capabilities: ['design-patterns', 'SOLID', 'microservices'],
        triggerPatterns: [
          { keywords: ['architecture', 'design', 'pattern', 'SOLID'], domain: 'architecture', priority: 9 },
        ],
      },
    ];

    for (const expert of experts) {
      router.registerExpert(expert);
    }

    expect(router.listExperts()).toHaveLength(3);
    expect(router.listExperts('security')).toHaveLength(1);

    // Route queries
    const securityResults = router.route('Check for security vulnerabilities');
    expect(securityResults.length).toBeGreaterThan(0);
    expect(securityResults[0].domain).toBe('security');

    const bestMatch = router.getBestMatch('Write unit tests for the module');
    expect(bestMatch).not.toBeNull();
    expect(bestMatch!.domain).toBe('testing');

    // ── Step 3: Skill routing ──
    const skillRouter = new SkillRouter();

    const capabilities: SkillCapability[] = [
      {
        skillId: 'skill-lint',
        capabilities: ['linting', 'code-style', 'formatting'],
        priority: 5,
        domains: ['code-quality'],
      },
      {
        skillId: 'skill-test',
        capabilities: ['unit-testing', 'test-generation', 'coverage-analysis'],
        priority: 8,
        domains: ['testing'],
      },
      {
        skillId: 'skill-scan',
        capabilities: ['security-scan', 'vulnerability-detection', 'secret-scan'],
        priority: 9,
        domains: ['security'],
      },
    ];

    for (const cap of capabilities) {
      skillRouter.register(cap);
    }

    expect(skillRouter.getCapabilities()).toHaveLength(3);

    const routeResult = skillRouter.route('Run security scan on the project');
    expect(routeResult).not.toBeNull();
    expect(routeResult!.skillId).toBe('skill-scan');
    expect(routeResult!.confidence).toBeGreaterThan(0);

    const allRoutes = skillRouter.routeAll('Generate unit tests');
    expect(allRoutes.length).toBeGreaterThan(0);

    // ── Step 4: Skill execution ──
    const registry = createSkillRegistry();

    const testSkill: Skill = {
      id: 'skill-echo',
      metadata: {
        name: 'Echo Skill',
        version: '1.0.0',
        description: 'Echoes input back',
        triggers: ['echo', 'repeat'],
      },
      status: 'available',
      execute: async (input) => ({ echoed: input }),
    };

    const mathSkill: Skill = {
      id: 'skill-math',
      metadata: {
        name: 'Math Skill',
        version: '1.0.0',
        description: 'Performs basic math',
        triggers: ['math', 'calculate'],
      },
      status: 'available',
      execute: async (input) => {
        const a = Number(input.a ?? 0);
        const b = Number(input.b ?? 0);
        return { result: a + b };
      },
    };

    registry.register(testSkill);
    registry.register(mathSkill);

    expect(registry.list()).toHaveLength(2);

    const executor = createSkillExecutor(registry);

    const echoResult = await executor.execute('skill-echo', { message: 'hello' }, {
      context: { workingDir: '.' },
    });
    expect(echoResult.success).toBe(true);
    expect(echoResult.output).toBeDefined();
    expect(echoResult.duration).toBeGreaterThanOrEqual(0);

    const mathResult = await executor.execute('skill-math', { a: 5, b: 3 }, {
      context: { workingDir: '.' },
    });
    expect(mathResult.success).toBe(true);
    expect(mathResult.output).toEqual({ result: 8 });

    // Batch execution
    const batchResults = await executor.executeBatch(
      [
        { skillId: 'skill-echo', input: { msg: 'batch1' } },
        { skillId: 'skill-math', input: { a: 10, b: 20 } },
      ],
      { context: { workingDir: '.' } },
    );
    expect(batchResults).toHaveLength(2);
    expect(batchResults.every((r) => r.success)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scenario 6: CLI Dispatch Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scenario 6: CLI Dispatch Pipeline', () => {
  it('showHelp returns valid help text', () => {
    const helpText = showHelp();
    expect(helpText).toBeTruthy();
    expect(typeof helpText).toBe('string');
    expect(helpText.length).toBeGreaterThan(10);
  });

  it('parseArgs handles multiple command patterns', () => {
    // Simple command
    const parsed1 = parseArgs(['init']);
    expect(parsed1.command).toBe('init');
    expect(parsed1.args).toBeDefined();

    // Command with subcommand
    const parsed2 = parseArgs(['tasks', 'list']);
    expect(parsed2.command).toBe('tasks');
    expect(parsed2.subcommand).toBe('list');

    // Command with flags
    const parsed3 = parseArgs(['init', '--name', 'my-project', '--template', 'minimal']);
    expect(parsed3.command).toBe('init');
    expect(parsed3.flags['name']).toBe('my-project');
    expect(parsed3.flags['template']).toBe('minimal');

    // Boolean flags
    const parsed4 = parseArgs(['tasks', 'validate', '--verbose']);
    expect(parsed4.command).toBe('tasks');
    expect(parsed4.subcommand).toBe('validate');
    expect(parsed4.flags['verbose']).toBe(true);

    // parseArgs treats --help as a command, not a flag (help handling is in CLIDispatcher.run)
    const parsed5 = parseArgs(['--help']);
    expect(parsed5.command).toBe('--help');
  });

  it('CLIDispatcher registers and dispatches commands', async () => {
    const dispatcher = createCLIDispatcher();
    const commands = getDefaultCommands();
    expect(commands.length).toBeGreaterThan(0);

    // Verify default commands are registered
    const listed = dispatcher.listCommands();
    expect(listed.length).toBeGreaterThan(0);

    // Get help text
    const help = dispatcher.getHelp();
    expect(help).toBeTruthy();

    // Get version
    const version = dispatcher.getVersion();
    expect(version).toBeTruthy();

    // Register a custom command
    let customCalled = false;
    dispatcher.register({
      name: 'e2e-test',
      description: 'E2E test command',
      async action(_args) {
        customCalled = true;
      },
    });

    const customCmd = dispatcher.getCommand('e2e-test');
    expect(customCmd).toBeDefined();
    expect(customCmd!.name).toBe('e2e-test');

    await dispatcher.dispatch('e2e-test', {});
    expect(customCalled).toBe(true);
  });

  it('CLIDispatcher.run() returns correct exit codes', async () => {
    const dispatcher = createCLIDispatcher();

    // Register a command that succeeds
    dispatcher.register({
      name: 'succeed',
      description: 'Always succeeds',
      async action() {
        /* no-op */
      },
    });

    // Register a command that throws
    dispatcher.register({
      name: 'fail',
      description: 'Always fails',
      async action() {
        throw new Error('Intentional failure');
      },
    });

    // Help with no args should succeed
    const helpCode = await dispatcher.run([]);
    expect(helpCode).toBe(ExitCode.SUCCESS);

    // --help flag should succeed
    const helpFlagCode = await dispatcher.run(['--help']);
    expect(helpFlagCode).toBe(ExitCode.SUCCESS);

    // Successful command
    const successCode = await dispatcher.run(['succeed']);
    expect(successCode).toBe(ExitCode.SUCCESS);

    // Failing command
    const failCode = await dispatcher.run(['fail']);
    expect(failCode).toBe(ExitCode.GENERAL_ERROR);
  });
});
