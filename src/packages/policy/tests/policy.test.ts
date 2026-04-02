import { describe, it, expect } from 'vitest';
import {
  PolicyEngine,
  QualityGateRunner,
  CONSTITUTION_ARTICLES,
  DEFAULT_QUALITY_GATE_CONFIG,
} from '../src/index.js';
import type { Policy, PolicyContext, PolicyResult } from '../src/index.js';

describe('REQ-GOV-001: PolicyEngine', () => {
  const context: PolicyContext = { projectPath: '/tmp/test' };

  it('should list all 9 constitution articles', () => {
    expect(CONSTITUTION_ARTICLES).toHaveLength(9);
    expect(CONSTITUTION_ARTICLES[0].policyId).toBe('CONST-001');
    expect(CONSTITUTION_ARTICLES[8].policyId).toBe('CONST-009');
  });

  it('should validate with no registered policies (all pass)', async () => {
    const engine = new PolicyEngine();
    const report = await engine.validateAll(context);
    expect(report.overallPass).toBe(true);
    expect(report.articles).toHaveLength(9);
    expect(report.violations).toHaveLength(0);
  });

  it('should register and validate a passing policy', async () => {
    const engine = new PolicyEngine();
    const policy: Policy = {
      id: 'CONST-001',
      name: 'Library First',
      article: 1,
      severity: 'blocker',
      description: 'Test',
      validate: async (): Promise<PolicyResult> => ({ passed: true, violations: [] }),
    };
    engine.register(policy);
    const report = await engine.validateAll(context);
    expect(report.overallPass).toBe(true);
    const a1 = report.articles.find((a) => a.policyId === 'CONST-001');
    expect(a1?.pass).toBe(true);
  });

  it('should detect blocker violations', async () => {
    const engine = new PolicyEngine();
    const policy: Policy = {
      id: 'CONST-003',
      name: 'Test First',
      article: 3,
      severity: 'blocker',
      description: 'Test',
      validate: async (): Promise<PolicyResult> => ({
        passed: false,
        violations: [{
          policyId: 'CONST-003',
          article: 3,
          severity: 'blocker',
          message: 'No tests found',
          suggestion: 'Write tests first',
        }],
      }),
    };
    engine.register(policy);
    const report = await engine.validateAll(context);
    expect(report.overallPass).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.suggestions).toContain('Write tests first');
  });

  it('should validate single policy', async () => {
    const engine = new PolicyEngine();
    const result = await engine.validateOne('CONST-001', context);
    expect(result.passed).toBe(true);
  });

  it('should list policies', () => {
    const engine = new PolicyEngine();
    const list = engine.listPolicies();
    expect(list).toHaveLength(9);
    expect(list[0].id).toBe('CONST-001');
  });

  it('should get policy info', () => {
    const engine = new PolicyEngine();
    const info = engine.getInfo('CONST-005');
    expect(info?.name).toBe('トレーサビリティ');
    expect(info?.article).toBe(5);
  });
});

describe('REQ-GOV-002: QualityGateRunner', () => {
  const context: PolicyContext = { projectPath: '/tmp/test' };

  it('should have default config with 80% coverage', () => {
    expect(DEFAULT_QUALITY_GATE_CONFIG.minCoverage).toBe(0.8);
  });

  it('should run all gates', async () => {
    const runner = new QualityGateRunner();
    const results = await runner.runAll(context);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('should check if all gates passed', async () => {
    const runner = new QualityGateRunner();
    const results = await runner.runAll(context);
    expect(runner.allPassed(results)).toBe(true);
  });

  it('should accept custom config', () => {
    const runner = new QualityGateRunner({ minCoverage: 0.9 });
    expect(runner).toBeDefined();
  });
});
