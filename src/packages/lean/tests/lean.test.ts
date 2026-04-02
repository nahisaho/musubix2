import { describe, it, expect } from 'vitest';
import {
  LeanEnvironmentDetector,
  EarsToLeanConverter,
  HybridVerifier,
  LeanIntegration,
  createLeanIntegration,
  createLeanEnvironmentDetector,
  createEarsToLeanConverter,
  createHybridVerifier,
  type Specification,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpec(overrides: Partial<Specification> & { id: string; action: string }): Specification {
  return {
    title: 'Test Requirement',
    text: 'Some requirement text',
    pattern: 'ubiquitous',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DES-FV-002: LeanEnvironmentDetector
// ---------------------------------------------------------------------------

describe('DES-FV-002: LeanEnvironmentDetector', () => {
  it('detect returns not available when Lean is not installed', async () => {
    const detector = new LeanEnvironmentDetector();
    const info = await detector.detect();
    expect(info.available).toBe(false);
    expect(info.mathlibAvailable).toBe(false);
  });

  it('detect returns mock available when mockAvailable is true', async () => {
    const detector = new LeanEnvironmentDetector({ mockAvailable: true });
    const info = await detector.detect();
    expect(info.available).toBe(true);
    expect(info.version).toBe('4.0.0-mock');
    expect(info.leanPath).toBeDefined();
    expect(info.lakePath).toBeDefined();
    expect(info.mathlibAvailable).toBe(true);
  });

  it('detect returns not available when mockAvailable is false', async () => {
    const detector = new LeanEnvironmentDetector({ mockAvailable: false });
    const info = await detector.detect();
    expect(info.available).toBe(false);
    expect(info.mathlibAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DES-FV-002: EarsToLeanConverter
// ---------------------------------------------------------------------------

describe('DES-FV-002: EarsToLeanConverter', () => {
  const converter = new EarsToLeanConverter();

  it('converts ubiquitous spec to Lean theorem', () => {
    const spec = makeSpec({ id: 'REQ-001', action: 'system responds' });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.requirementId).toBe('REQ-001');
    expect(result.leanCode).toContain('theorem req_REQ_001');
    expect(result.leanCode).toContain('∀ (state : State)');
    expect(result.leanCode).toContain('system_responds state');
  });

  it('converts event-driven spec to Lean theorem with trigger implication', () => {
    const spec = makeSpec({
      id: 'REQ-002',
      pattern: 'event-driven',
      trigger: 'button pressed',
      action: 'dialog opens',
    });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.leanCode).toContain('button_pressed state →');
    expect(result.leanCode).toContain('dialog_opens state');
  });

  it('converts state-driven spec to Lean theorem', () => {
    const spec = makeSpec({
      id: 'REQ-003',
      pattern: 'state-driven',
      condition: 'system idle',
      action: 'auto save',
    });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.leanCode).toContain('system_idle state →');
    expect(result.leanCode).toContain('auto_save state');
  });

  it('converts unwanted spec to negation theorem', () => {
    const spec = makeSpec({
      id: 'REQ-004',
      pattern: 'unwanted',
      action: 'data loss',
    });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.leanCode).toContain('¬ data_loss state');
  });

  it('converts complex spec with condition and trigger', () => {
    const spec = makeSpec({
      id: 'REQ-005',
      pattern: 'complex',
      condition: 'user authenticated',
      trigger: 'save clicked',
      action: 'data persisted',
    });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.leanCode).toContain('user_authenticated state →');
    expect(result.leanCode).toContain('save_clicked state →');
    expect(result.leanCode).toContain('data_persisted state');
  });

  it('converts optional spec with feature flag', () => {
    const spec = makeSpec({
      id: 'REQ-006',
      pattern: 'optional',
      trigger: 'dark mode toggled',
      action: 'theme changes',
    });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.leanCode).toContain('feature_enabled state →');
    expect(result.leanCode).toContain('dark_mode_toggled state →');
    expect(result.leanCode).toContain('theme_changes state');
  });

  it('generates proof skeleton with sorry', () => {
    const spec = makeSpec({ id: 'REQ-007', action: 'output valid' });
    const skeleton = converter.generateProofSkeleton(spec);
    expect(skeleton).toContain('sorry');
    expect(skeleton).toContain('theorem req_REQ_007');
    expect(skeleton).toContain('import Mathlib.Tactic');
    expect(skeleton).toContain('variable (State : Type)');
  });

  it('adds warnings for event-driven spec missing trigger', () => {
    const spec = makeSpec({
      id: 'REQ-008',
      pattern: 'event-driven',
      action: 'something happens',
    });
    const result = converter.convert(spec);
    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('missing trigger');
  });
});

// ---------------------------------------------------------------------------
// DES-FV-002: HybridVerifier
// ---------------------------------------------------------------------------

describe('DES-FV-002: HybridVerifier', () => {
  it('verify returns unverified when no backends available', async () => {
    const verifier = new HybridVerifier();
    const spec = makeSpec({ id: 'REQ-010', action: 'test action' });
    const result = await verifier.verify(spec);
    expect(result.requirementId).toBe('REQ-010');
    expect(result.smtStatus).toBe('skipped');
    expect(result.leanStatus).toBe('skipped');
    expect(result.combinedVerdict).toBe('unverified');
    expect(result.explanation).toContain('not available');
  });

  it('verify combines results correctly — fully verified', async () => {
    const verifier = new HybridVerifier({
      mockSmtResult: 'unsat',
      mockLeanResult: 'proven',
    });
    const spec = makeSpec({ id: 'REQ-011', action: 'secure' });
    const result = await verifier.verify(spec);
    expect(result.combinedVerdict).toBe('verified');
  });

  it('verify combines results correctly — partially verified (SMT only)', async () => {
    const verifier = new HybridVerifier({
      mockSmtResult: 'unsat',
      mockLeanResult: 'skipped',
    });
    const spec = makeSpec({ id: 'REQ-012', action: 'partial' });
    const result = await verifier.verify(spec);
    expect(result.combinedVerdict).toBe('partially-verified');
  });

  it('verify returns error when SMT is sat (counterexample found)', async () => {
    const verifier = new HybridVerifier({
      mockSmtResult: 'sat',
      mockLeanResult: 'skipped',
    });
    const spec = makeSpec({ id: 'REQ-013', action: 'bad' });
    const result = await verifier.verify(spec);
    expect(result.combinedVerdict).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// DES-FV-002: LeanIntegration (façade)
// ---------------------------------------------------------------------------

describe('DES-FV-002: LeanIntegration (façade)', () => {
  it('checkEnvironment delegates to detector', async () => {
    const detector = new LeanEnvironmentDetector({ mockAvailable: true });
    const facade = new LeanIntegration({ detector });
    const info = await facade.checkEnvironment();
    expect(info.available).toBe(true);
    expect(info.version).toBe('4.0.0-mock');
  });

  it('convertToLean delegates to converter', () => {
    const facade = new LeanIntegration();
    const spec = makeSpec({ id: 'FACADE-01', action: 'works' });
    const result = facade.convertToLean(spec);
    expect(result.success).toBe(true);
    expect(result.leanCode).toContain('theorem req_FACADE_01');
  });

  it('generateProofSkeleton produces valid Lean code', () => {
    const facade = new LeanIntegration();
    const spec = makeSpec({ id: 'FACADE-02', action: 'proven' });
    const skeleton = facade.generateProofSkeleton(spec);
    expect(skeleton).toContain('theorem');
    expect(skeleton).toContain('sorry');
    expect(skeleton).toContain('variable (State : Type)');
  });

  it('verifyHybrid delegates to verifier', async () => {
    const verifier = new HybridVerifier({ mockSmtResult: 'unsat', mockLeanResult: 'proven' });
    const facade = new LeanIntegration({ verifier });
    const spec = makeSpec({ id: 'FACADE-03', action: 'complete' });
    const result = await facade.verifyHybrid(spec);
    expect(result.combinedVerdict).toBe('verified');
  });
});

// ---------------------------------------------------------------------------
// DES-FV-002: Factory functions
// ---------------------------------------------------------------------------

describe('DES-FV-002: Factory functions', () => {
  it('createLeanIntegration returns a LeanIntegration instance', () => {
    expect(createLeanIntegration()).toBeInstanceOf(LeanIntegration);
  });

  it('createLeanEnvironmentDetector returns a LeanEnvironmentDetector instance', () => {
    expect(createLeanEnvironmentDetector()).toBeInstanceOf(LeanEnvironmentDetector);
  });

  it('createEarsToLeanConverter returns an EarsToLeanConverter instance', () => {
    expect(createEarsToLeanConverter()).toBeInstanceOf(EarsToLeanConverter);
  });

  it('createHybridVerifier returns a HybridVerifier instance', () => {
    expect(createHybridVerifier()).toBeInstanceOf(HybridVerifier);
  });
});
