/**
 * @musubix2/lean — DES-FV-002: Lean 4 Integration
 *
 * Environment detection, EARS-to-Lean conversion, and hybrid verification.
 */

import { execFile } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';

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
// LeanProofRunner
// ---------------------------------------------------------------------------

export interface LeanProofRunnerOptions {
  defaultTimeoutMs?: number;
}

export class LeanProofRunner {
  private readonly detector: LeanEnvironmentDetector;
  private readonly defaultTimeoutMs: number;

  constructor(detector: LeanEnvironmentDetector, options?: LeanProofRunnerOptions) {
    this.detector = detector;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 60000;
  }

  async runProof(leanCode: string, timeoutMs?: number): Promise<ProofResult> {
    const start = Date.now();
    const env = await this.detector.detect();

    if (!env.available || !env.leanPath) {
      return {
        requirementId: '',
        status: 'skipped',
        diagnostics: [],
        time: Date.now() - start,
      };
    }

    const tmpFile = join(tmpdir(), `musubix2-lean-${randomBytes(8).toString('hex')}.lean`);

    try {
      await writeFile(tmpFile, leanCode, 'utf-8');
      const timeout = timeoutMs ?? this.defaultTimeoutMs;

      const { stdout, stderr } = await execFileAsync(env.leanPath, [tmpFile], {
        timeout,
      });

      const diagnostics = this.parseDiagnostics(stdout, stderr);
      const hasErrors = diagnostics.some((d) => d.severity === 'error');

      return {
        requirementId: '',
        status: hasErrors ? 'failed' : 'proven',
        proofCode: leanCode,
        diagnostics,
        time: Date.now() - start,
      };
    } catch (err: unknown) {
      const elapsed = Date.now() - start;

      if (err && typeof err === 'object' && 'killed' in err && (err as { killed: boolean }).killed) {
        return {
          requirementId: '',
          status: 'timeout',
          diagnostics: [],
          time: elapsed,
        };
      }

      const diagnostics = this.parseDiagnosticsFromError(err);
      const hasErrors = diagnostics.some((d) => d.severity === 'error');

      return {
        requirementId: '',
        status: hasErrors ? 'failed' : 'error',
        diagnostics,
        time: elapsed,
      };
    } finally {
      try {
        await unlink(tmpFile);
      } catch {
        /* cleanup best-effort */
      }
    }
  }

  private parseDiagnostics(stdout: string, stderr: string): LeanDiagnostic[] {
    const diagnostics: LeanDiagnostic[] = [];
    const combined = (stdout + '\n' + stderr).trim();
    if (!combined) return diagnostics;

    for (const line of combined.split('\n')) {
      const diag = this.parseDiagnosticLine(line);
      if (diag) diagnostics.push(diag);
    }
    return diagnostics;
  }

  private parseDiagnosticsFromError(err: unknown): LeanDiagnostic[] {
    if (!err || typeof err !== 'object') return [];
    const stderr = ('stderr' in err ? String((err as { stderr: unknown }).stderr) : '').trim();
    const stdout = ('stdout' in err ? String((err as { stdout: unknown }).stdout) : '').trim();
    return this.parseDiagnostics(stdout, stderr);
  }

  private parseDiagnosticLine(line: string): LeanDiagnostic | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Lean 4 format: file:line:col: severity: message
    const match = /^[^:]+:(\d+):(\d+):\s*(error|warning|info(?:rmation)?)\s*:\s*(.+)$/.exec(trimmed);
    if (match) {
      const severity = match[3].startsWith('info') ? 'info' : (match[3] as 'error' | 'warning');
      return {
        severity,
        message: match[4],
        line: parseInt(match[1], 10),
        column: parseInt(match[2], 10),
      };
    }

    // Fallback: treat non-empty lines as info
    if (trimmed.toLowerCase().includes('error')) {
      return { severity: 'error', message: trimmed };
    }
    if (trimmed.toLowerCase().includes('warning')) {
      return { severity: 'warning', message: trimmed };
    }
    return null;
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

  private generateTheorem(spec: Specification, sanitizedId: string, warnings: string[]): string {
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
        const condPart = spec.condition ? `${toLeanName(spec.condition)} state → ` : '';
        const trigPart = spec.trigger ? `${toLeanName(spec.trigger)} state → ` : '';
        return `theorem req_${sanitizedId} : ∀ (state : State), ${condPart}${trigPart}${toLeanName(spec.action)} state :=`;
      }

      case 'optional': {
        const trigPart = spec.trigger ? `${toLeanName(spec.trigger)} state → ` : '';
        if (!spec.trigger) {
          warnings.push(
            'Optional pattern missing trigger; treating as ubiquitous with feature flag',
          );
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
  proofRunner?: LeanProofRunner;
  converter?: EarsToLeanConverter;
}

export class HybridVerifier {
  private readonly mockSmtResult: 'sat' | 'unsat' | 'unknown' | undefined;
  private readonly mockLeanResult: ProofStatus | undefined;
  private readonly proofRunner: LeanProofRunner | undefined;
  private readonly converter: EarsToLeanConverter;

  constructor(options?: HybridVerifierOptions) {
    this.mockSmtResult = options?.mockSmtResult;
    this.mockLeanResult = options?.mockLeanResult;
    this.proofRunner = options?.proofRunner;
    this.converter = options?.converter ?? new EarsToLeanConverter();
  }

  async verify(spec: Specification): Promise<HybridResult> {
    const start = Date.now();

    const smtStatus = this.mockSmtResult ?? ('skipped' as const);

    let leanStatus: ProofStatus;
    if (this.mockLeanResult !== undefined) {
      leanStatus = this.mockLeanResult;
    } else if (this.proofRunner) {
      leanStatus = await this.runLeanProof(spec);
    } else {
      leanStatus = 'skipped' as const;
    }

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

  private async runLeanProof(spec: Specification): Promise<ProofStatus> {
    const conversion = this.converter.convert(spec);
    if (!conversion.success || !conversion.leanCode) {
      return 'error';
    }
    const skeleton = this.converter.generateProofSkeleton(spec);
    const result = await this.proofRunner!.runProof(skeleton);
    return result.status;
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

export function createLeanProofRunner(
  detector?: LeanEnvironmentDetector,
  options?: LeanProofRunnerOptions,
): LeanProofRunner {
  return new LeanProofRunner(detector ?? new LeanEnvironmentDetector(), options);
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
  if (smt === 'unsat' && lean === 'proven') {
    return 'verified';
  }
  if (smt === 'unsat' || lean === 'proven') {
    return 'partially-verified';
  }
  if (smt === 'sat' || lean === 'failed') {
    return 'error';
  }
  if (lean === 'error' || lean === 'timeout') {
    return 'error';
  }
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
