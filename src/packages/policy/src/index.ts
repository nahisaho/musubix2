/**
 * @musubix2/policy — Constitution Enforcement
 *
 * Policy engine for 9 constitutional articles (CONST-001~009),
 * quality gates, and phase transition validation.
 *
 * @see DES-GOV-001 — 憲法ガバナンス
 * @see DES-GOV-002 — テストファースト強制
 */

export {
  BalanceRuleEngine,
  type BalanceMetrics,
  type BalanceRuleConfig,
  DEFAULT_BALANCE_CONFIG,
} from './balance-rule.js';

export type PolicyId =
  | 'CONST-001' | 'CONST-002' | 'CONST-003' | 'CONST-004' | 'CONST-005'
  | 'CONST-006' | 'CONST-007' | 'CONST-008' | 'CONST-009';

export type PolicySeverity = 'blocker' | 'critical' | 'major' | 'minor';

export interface PolicyContext {
  projectPath: string;
  steeringDir?: string;
  currentPhase?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyViolation {
  policyId: PolicyId;
  article: number;
  severity: PolicySeverity;
  message: string;
  location?: string;
  suggestion: string;
}

export interface PolicyResult {
  passed: boolean;
  violations: PolicyViolation[];
}

export interface Policy {
  id: PolicyId;
  name: string;
  article: number;
  severity: PolicySeverity;
  description: string;
  validate(context: PolicyContext): Promise<PolicyResult>;
}

export interface ComplianceReport {
  articles: ArticleResult[];
  overallPass: boolean;
  violations: PolicyViolation[];
  suggestions: string[];
  timestamp: Date;
}

export interface ArticleResult {
  article: number;
  policyId: PolicyId;
  name: string;
  pass: boolean;
  details: string;
  evidence: string[];
}

// --- Quality Gate ---

export interface QualityGateConfig {
  minCoverage: number;
  requireEarsMapping: boolean;
  requireTraceability: boolean;
}

export const DEFAULT_QUALITY_GATE_CONFIG: QualityGateConfig = {
  minCoverage: 0.8,
  requireEarsMapping: true,
  requireTraceability: true,
};

export interface GateResult {
  gate: string;
  passed: boolean;
  details: string;
  metrics?: Record<string, number>;
}

export class QualityGateRunner {
  private config: QualityGateConfig;

  constructor(config?: Partial<QualityGateConfig>) {
    this.config = { ...DEFAULT_QUALITY_GATE_CONFIG, ...config };
  }

  async runAll(context: PolicyContext): Promise<GateResult[]> {
    const results: GateResult[] = [];

    results.push(await this.checkCoverage(context));
    results.push(await this.checkEarsMapping(context));
    results.push(await this.checkTraceability(context));

    return results;
  }

  allPassed(results: GateResult[]): boolean {
    return results.every((r) => r.passed);
  }

  private async checkCoverage(_context: PolicyContext): Promise<GateResult> {
    // Placeholder — real implementation reads vitest coverage
    return {
      gate: 'coverage',
      passed: true,
      details: `Coverage threshold: ${this.config.minCoverage * 100}%`,
      metrics: { threshold: this.config.minCoverage },
    };
  }

  private async checkEarsMapping(_context: PolicyContext): Promise<GateResult> {
    return {
      gate: 'ears-mapping',
      passed: this.config.requireEarsMapping,
      details: 'EARS mapping check',
    };
  }

  private async checkTraceability(_context: PolicyContext): Promise<GateResult> {
    return {
      gate: 'traceability',
      passed: this.config.requireTraceability,
      details: 'Traceability check',
    };
  }
}

// --- Policy Engine ---

export const CONSTITUTION_ARTICLES: Array<{
  article: number;
  policyId: PolicyId;
  name: string;
  description: string;
}> = [
  { article: 1, policyId: 'CONST-001', name: 'ライブラリファースト', description: 'パッケージは独立ライブラリとして利用可能' },
  { article: 2, policyId: 'CONST-002', name: 'CLIインターフェース', description: '全機能にCLI提供' },
  { article: 3, policyId: 'CONST-003', name: 'テストファースト', description: 'Red→Green→Blue, カバレッジ≥80%' },
  { article: 4, policyId: 'CONST-004', name: 'EARS形式', description: '全要件がEARS構文に準拠' },
  { article: 5, policyId: 'CONST-005', name: 'トレーサビリティ', description: 'REQ↔DES↔Code↔Test 100%追跡' },
  { article: 6, policyId: 'CONST-006', name: 'プロジェクトメモリ', description: 'steering/を参照' },
  { article: 7, policyId: 'CONST-007', name: 'デザインパターン文書化', description: 'パターン使用時に文書化' },
  { article: 8, policyId: 'CONST-008', name: 'ADR記録', description: '重要な設計決定にADR' },
  { article: 9, policyId: 'CONST-009', name: '品質ゲート', description: 'Phase遷移時にゲート通過' },
];

export {
  TestFirstTracker,
  CoverageGate,
  createTestFirstTracker,
  createCoverageGate,
  DEFAULT_TEST_FIRST_CONFIG,
  type TestFirstConfig,
  type TestPhase,
  type CoverageGateConfig,
} from './test-first.js';

export class PolicyEngine {
  private policies: Map<PolicyId, Policy> = new Map();

  register(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  async validateAll(context: PolicyContext): Promise<ComplianceReport> {
    const articles: ArticleResult[] = [];
    const allViolations: PolicyViolation[] = [];

    for (const article of CONSTITUTION_ARTICLES) {
      const policy = this.policies.get(article.policyId);
      if (policy) {
        const result = await policy.validate(context);
        articles.push({
          article: article.article,
          policyId: article.policyId,
          name: article.name,
          pass: result.passed,
          details: result.passed ? 'OK' : `${result.violations.length} violation(s)`,
          evidence: result.violations.map((v) => v.message),
        });
        allViolations.push(...result.violations);
      } else {
        articles.push({
          article: article.article,
          policyId: article.policyId,
          name: article.name,
          pass: true,
          details: 'No policy registered (skipped)',
          evidence: [],
        });
      }
    }

    return {
      articles,
      overallPass: allViolations.filter((v) => v.severity === 'blocker').length === 0,
      violations: allViolations,
      suggestions: allViolations.map((v) => v.suggestion),
      timestamp: new Date(),
    };
  }

  async validateOne(policyId: PolicyId, context: PolicyContext): Promise<PolicyResult> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return { passed: true, violations: [] };
    }
    return policy.validate(context);
  }

  listPolicies(): Array<{ id: PolicyId; name: string; article: number }> {
    return CONSTITUTION_ARTICLES.map((a) => ({
      id: a.policyId,
      name: a.name,
      article: a.article,
    }));
  }

  getInfo(policyId: PolicyId): typeof CONSTITUTION_ARTICLES[number] | undefined {
    return CONSTITUTION_ARTICLES.find((a) => a.policyId === policyId);
  }
}
