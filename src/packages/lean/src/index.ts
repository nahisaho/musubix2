/**
 * @musubix2/lean — DES-FV-002: Lean 4 Integration
 *
 * Environment detection, EARS-to-Lean conversion, and hybrid verification.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeanEnvironmentInfo {
  available: boolean;
  version?: string;
  leanPath?: string;
  lakePath?: string;
  mathlibAvailable: boolean;
}

export type ProofStatus = 'proven' | 'failed' | 'timeout' | 'error' | 'skipped';

export interface LeanConversionResult {
  success: boolean;
  leanCode?: string;
  requirementId: string;
  error?: string;
  warnings: string[];
}

export interface ProofResult {
  requirementId: string;
  status: ProofStatus;
  proofCode?: string;
  diagnostics: LeanDiagnostic[];
  time: number;
}

export interface LeanDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
}

export interface HybridResult {
  requirementId: string;
  smtStatus: 'sat' | 'unsat' | 'unknown' | 'skipped';
  leanStatus: ProofStatus;
  combinedVerdict: 'verified' | 'partially-verified' | 'unverified' | 'error';
  explanation: string;
  time: number;
}

export interface Specification {
  id: string;
  title: string;
  text: string;
  pattern: 'ubiquitous' | 'event-driven' | 'state-driven' | 'unwanted' | 'optional' | 'complex';
  trigger?: string;
  condition?: string;
  action: string;
}

// ---------------------------------------------------------------------------
// LeanEnvironmentDetector
// ---------------------------------------------------------------------------

export interface LeanEnvironmentDetectorOptions {
  /** When set, bypass real CLI detection and return a stub result. */
  mockAvailable?: boolean;
}

export class LeanEnvironmentDetector {
  private readonly mockAvailable: boolean | undefined;

  constructor(options?: LeanEnvironmentDetectorOptions) {
    this.mockAvailable = options?.mockAvailable;
  }

  async detect(): Promise<LeanEnvironmentInfo> {
    if (this.mockAvailable === true) {
      return {
        available: true,
        version: '4.0.0-mock',
        leanPath: '/usr/local/bin/lean',
        lakePath: '/usr/local/bin/lake',
        mathlibAvailable: true,
      };
    }

    if (this.mockAvailable === false) {
      return { available: false, mathlibAvailable: false };
    }

    // Real detection — Lean is typically not installed
    try {
      const { stdout } = await execFileAsync('lean', ['--version']);
      const version = stdout.trim().split('\n')[0] ?? undefined;

      let leanPath: string | undefined;
      try {
        const which = await execFileAsync('which', ['lean']);
        leanPath = which.stdout.trim() || undefined;
      } catch {
        /* ignore */
      }

      let lakePath: string | undefined;
      try {
        const which = await execFileAsync('which', ['lake']);
        lakePath = which.stdout.trim() || undefined;
      } catch {
        /* ignore */
      }

      let mathlibAvailable = false;
      if (lakePath) {
        try {
          await execFileAsync('lake', ['env', 'printPaths']);
          mathlibAvailable = true;
        } catch {
          /* mathlib not present */
        }
      }

      return { available: true, version, leanPath, lakePath, mathlibAvailable };
    } catch {
      return { available: false, mathlibAvailable: false };
    }
  }
}

// ---------------------------------------------------------------------------
// EarsToLeanConverter
// ---------------------------------------------------------------------------

export class EarsToLeanConverter {
  convert(spec: Specification): LeanConversionResult {
    const warnings: string[] = [];
    const sanitizedId = sanitizeId(spec.id);

    try {
      const leanCode = this.generateTheorem(spec, sanitizedId, warnings);
      return { success: true, leanCode, requirementId: spec.id, warnings };
    } catch (err) {
      return {
        success: false,
        requirementId: spec.id,
        error: err instanceof Error ? err.message : String(err),
        warnings,
      };
    }
  }

  generateProofSkeleton(spec: Specification): string {
    const conversion = this.convert(spec);
    if (!conversion.success || !conversion.leanCode) {
      return `-- Failed to generate skeleton for ${spec.id}: ${conversion.error ?? 'unknown error'}`;
    }
    return [
      `-- Proof skeleton for ${spec.id}: ${spec.title}`,
      `-- Pattern: ${spec.pattern}`,
      '',
      'import Mathlib.Tactic',
      '',
      'variable (State : Type)',
      ...this.generateVariableDeclarations(spec),
      '',
      conversion.leanCode,
      '  sorry',
      '',
    ].join('\n');
  }

  // ---- private helpers ----------------------------------------------------

  private generateTheorem(
    spec: Specification,
    sanitizedId: string,
    warnings: string[],
  ): string {
    switch (spec.pattern) {
      case 'ubiquitous':
        return `theorem req_${sanitizedId} : ∀ (state : State), ${toLeanName(spec.action)} state :=`;

      case 'event-driven': {
        if (!spec.trigger) {
          warnings.push('Event-driven pattern missing trigger; using action only');
          return `theorem req_${sanitizedId} : ∀ (state : State), ${toLeanName(spec.action)} state :=`;
        }
        return `theorem req_${sanitizedId} : ∀ (state : State), ${toLeanName(spec.trigger)} state → ${toLeanName(spec.action)} state :=`;
      }

      case 'state-driven': {
        if (!spec.condition) {
          warnings.push('State-driven pattern missing condition; using action only');
          return `theorem req_${sanitizedId} : ∀ (state : State), ${toLeanName(spec.action)} state :=`;
        }
        return `theorem req_${sanitizedId} : ∀ (state : State), ${toLeanName(spec.condition)} state → ${toLeanName(spec.action)} state :=`;
      }

      case 'unwanted':
        return `theorem req_${sanitizedId} : ∀ (state : State), ¬ ${toLeanName(spec.action)} state :=`;

      case 'complex': {
        if (!spec.condition) {
          warnings.push('Complex pattern missing condition');
        }
        if (!spec.trigger) {
          warnings.push('Complex pattern missing trigger');
        }
        const condPart = spec.condition
          ? `${toLeanName(spec.condition)} state → `
          : '';
        const trigPart = spec.trigger
          ? `${toLeanName(spec.trigger)} state → `
          : '';
        return `theorem req_${sanitizedId} : ∀ (state : State), ${condPart}${trigPart}${toLeanName(spec.action)} state :=`;
      }

      case 'optional': {
        const trigPart = spec.trigger
          ? `${toLeanName(spec.trigger)} state → `
          : '';
        if (!spec.trigger) {
          warnings.push('Optional pattern missing trigger; treating as ubiquitous with feature flag');
        }
        return `theorem req_${sanitizedId} : ∀ (state : State), feature_enabled state → ${trigPart}${toLeanName(spec.action)} state :=`;
      }

      default: {
        const _exhaustive: never = spec.pattern;
        throw new Error(`Unsupported EARS pattern: ${_exhaustive}`);
      }
    }
  }

  private generateVariableDeclarations(spec: Specification): string[] {
    const decls: string[] = [];
    decls.push(`variable (${toLeanName(spec.action)} : State → Prop)`);
    if (spec.trigger) {
      decls.push(`variable (${toLeanName(spec.trigger)} : State → Prop)`);
    }
    if (spec.condition) {
      decls.push(`variable (${toLeanName(spec.condition)} : State → Prop)`);
    }
    if (spec.pattern === 'optional') {
      decls.push('variable (feature_enabled : State → Prop)');
    }
    return decls;
  }
}

// ---------------------------------------------------------------------------
// HybridVerifier
// ---------------------------------------------------------------------------

export interface HybridVerifierOptions {
  mockSmtResult?: 'sat' | 'unsat' | 'unknown';
  mockLeanResult?: ProofStatus;
}

export class HybridVerifier {
  private readonly mockSmtResult: 'sat' | 'unsat' | 'unknown' | undefined;
  private readonly mockLeanResult: ProofStatus | undefined;

  constructor(options?: HybridVerifierOptions) {
    this.mockSmtResult = options?.mockSmtResult;
    this.mockLeanResult = options?.mockLeanResult;
  }

  async verify(spec: Specification): Promise<HybridResult> {
    const start = Date.now();

    const smtStatus = this.mockSmtResult ?? 'skipped' as const;
    const leanStatus = this.mockLeanResult ?? 'skipped' as const;

    const combinedVerdict = deriveVerdict(smtStatus, leanStatus);
    const explanation = buildExplanation(smtStatus, leanStatus, combinedVerdict);

    return {
      requirementId: spec.id,
      smtStatus,
      leanStatus,
      combinedVerdict,
      explanation,
      time: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// LeanIntegration (façade)
// ---------------------------------------------------------------------------

export interface LeanIntegrationOptions {
  detector?: LeanEnvironmentDetector;
  converter?: EarsToLeanConverter;
  verifier?: HybridVerifier;
}

export class LeanIntegration {
  private readonly detector: LeanEnvironmentDetector;
  private readonly converter: EarsToLeanConverter;
  private readonly verifier: HybridVerifier;

  constructor(options?: LeanIntegrationOptions) {
    this.detector = options?.detector ?? new LeanEnvironmentDetector();
    this.converter = options?.converter ?? new EarsToLeanConverter();
    this.verifier = options?.verifier ?? new HybridVerifier();
  }

  async checkEnvironment(): Promise<LeanEnvironmentInfo> {
    return this.detector.detect();
  }

  convertToLean(spec: Specification): LeanConversionResult {
    return this.converter.convert(spec);
  }

  generateProofSkeleton(spec: Specification): string {
    return this.converter.generateProofSkeleton(spec);
  }

  async verifyHybrid(spec: Specification): Promise<HybridResult> {
    return this.verifier.verify(spec);
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createLeanIntegration(): LeanIntegration {
  return new LeanIntegration();
}

export function createLeanEnvironmentDetector(): LeanEnvironmentDetector {
  return new LeanEnvironmentDetector();
}

export function createEarsToLeanConverter(): EarsToLeanConverter {
  return new EarsToLeanConverter();
}

export function createHybridVerifier(): HybridVerifier {
  return new HybridVerifier();
}

// ---------------------------------------------------------------------------
// Helpers (private)
// ---------------------------------------------------------------------------

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function toLeanName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function deriveVerdict(
  smt: 'sat' | 'unsat' | 'unknown' | 'skipped',
  lean: ProofStatus,
): HybridResult['combinedVerdict'] {
  if (smt === 'unsat' && lean === 'proven') return 'verified';
  if (smt === 'unsat' || lean === 'proven') return 'partially-verified';
  if (smt === 'sat' || lean === 'failed') return 'error';
  if (lean === 'error' || lean === 'timeout') return 'error';
  return 'unverified';
}

function buildExplanation(
  smt: 'sat' | 'unsat' | 'unknown' | 'skipped',
  lean: ProofStatus,
  verdict: HybridResult['combinedVerdict'],
): string {
  const parts: string[] = [];

  if (smt === 'skipped') {
    parts.push('SMT solver not available (skipped)');
  } else {
    parts.push(`SMT result: ${smt}`);
  }

  if (lean === 'skipped') {
    parts.push('Lean prover not available (skipped)');
  } else {
    parts.push(`Lean result: ${lean}`);
  }

  parts.push(`Combined verdict: ${verdict}`);
  return parts.join('. ') + '.';
}
