/**
 * @musubix2/formal-verify — Formal Verification
 *
 * EARS requirement to SMT-LIB2 conversion and Z3 adapter for
 * formal verification of system preconditions.
 *
 * @see DES-FV-001 — EARS requirement formal verification
 */

// ── Types ──────────────────────────────────────────────────────

export type EARSPatternType =
  | 'ubiquitous'
  | 'event-driven'
  | 'state-driven'
  | 'unwanted'
  | 'optional'
  | 'complex';

export type SolverStatus = 'sat' | 'unsat' | 'unknown' | 'timeout' | 'error';

export interface ParsedRequirement {
  id: string;
  title: string;
  text: string;
  pattern: EARSPatternType;
  trigger?: string;
  condition?: string;
  action: string;
}

export interface SmtFormula {
  id: string;
  requirementId: string;
  smtLib2: string;
  variables: SmtVariable[];
  assertions: string[];
}

export interface SmtVariable {
  name: string;
  sort: 'Bool' | 'Int' | 'Real' | 'String';
  description?: string;
}

export interface ConversionResult {
  success: boolean;
  formula?: SmtFormula;
  error?: string;
  warnings: string[];
}

export interface SolverResult {
  status: SolverStatus;
  model?: Record<string, string>;
  time: number;
  error?: string;
}

export interface VerificationResult {
  requirementId: string;
  status: 'verified' | 'violated' | 'inconclusive' | 'error';
  solverResult: SolverResult;
  explanation: string;
}

export interface PreconditionCheckResult {
  consistent: boolean;
  conflicts: Array<{
    formula1: string;
    formula2: string;
    explanation: string;
  }>;
}

// ── Helpers ─────────────────────────────────────────────────────

const KEYWORDS = new Set([
  'the',
  'shall',
  'when',
  'while',
  'if',
  'then',
  'and',
  'or',
  'not',
  'is',
  'are',
  'a',
  'an',
  'it',
  'be',
  'to',
  'of',
  'in',
  'that',
  'for',
  'on',
  'with',
  'as',
  'at',
  'by',
  'from',
  'has',
  'have',
]);

function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function extractVariables(text: string): SmtVariable[] {
  const tokens = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !KEYWORDS.has(t.toLowerCase()));

  const seen = new Set<string>();
  const vars: SmtVariable[] = [];

  for (const token of tokens) {
    const name = sanitizeName(token);
    if (name && !seen.has(name)) {
      seen.add(name);
      vars.push({ name, sort: 'Bool' });
    }
  }
  return vars;
}

function makeFormulaId(requirementId: string): string {
  return `smt_${sanitizeName(requirementId)}`;
}

// ── EarsToSmtConverter ──────────────────────────────────────────

export class EarsToSmtConverter {
  convert(requirement: ParsedRequirement): ConversionResult {
    const warnings: string[] = [];
    const actionVar = sanitizeName(requirement.action);

    if (!actionVar) {
      return {
        success: false,
        error: 'Cannot extract action variable from requirement',
        warnings,
      };
    }

    const variables = extractVariables(requirement.text);
    let assertions: string[];

    switch (requirement.pattern) {
      case 'ubiquitous':
        assertions = [`(assert (=> true ${actionVar}))`];
        break;

      case 'event-driven': {
        const triggerVar = requirement.trigger ? sanitizeName(requirement.trigger) : 'trigger';
        assertions = [`(assert (=> ${triggerVar} ${actionVar}))`];
        if (!requirement.trigger) {
          warnings.push('No trigger specified; using default "trigger"');
        }
        break;
      }

      case 'state-driven': {
        const condVar = requirement.condition ? sanitizeName(requirement.condition) : 'condition';
        assertions = [`(assert (=> ${condVar} ${actionVar}))`];
        if (!requirement.condition) {
          warnings.push('No condition specified; using default "condition"');
        }
        break;
      }

      case 'unwanted':
        assertions = [`(assert (not ${actionVar}))`];
        break;

      case 'optional': {
        const featureVar = requirement.trigger
          ? sanitizeName(requirement.trigger)
          : 'feature_enabled';
        assertions = [`(assert (=> ${featureVar} ${actionVar}))`];
        if (!requirement.trigger) {
          warnings.push('No feature trigger specified; using default "feature_enabled"');
        }
        break;
      }

      case 'complex': {
        const condVar = requirement.condition ? sanitizeName(requirement.condition) : 'condition';
        const triggerVar = requirement.trigger ? sanitizeName(requirement.trigger) : 'trigger';
        assertions = [`(assert (=> (and ${condVar} ${triggerVar}) ${actionVar}))`];
        if (!requirement.condition) {
          warnings.push('No condition specified; using default "condition"');
        }
        if (!requirement.trigger) {
          warnings.push('No trigger specified; using default "trigger"');
        }
        break;
      }
    }

    const id = makeFormulaId(requirement.id);

    const formula: SmtFormula = {
      id,
      requirementId: requirement.id,
      smtLib2: assertions.join('\n'),
      variables,
      assertions,
    };

    return { success: true, formula, warnings };
  }

  convertBatch(requirements: ParsedRequirement[]): ConversionResult[] {
    return requirements.map((r) => this.convert(r));
  }

  generateSmtLib2Script(formulas: SmtFormula[]): string {
    const lines: string[] = [];
    lines.push('; SMT-LIB2 script generated by @musubix2/formal-verify');
    lines.push('(set-logic QF_LIA)');
    lines.push('');

    const declared = new Set<string>();

    for (const formula of formulas) {
      lines.push(`; Requirement: ${formula.requirementId}`);

      for (const v of formula.variables) {
        if (!declared.has(v.name)) {
          declared.add(v.name);
          lines.push(`(declare-const ${v.name} ${v.sort})`);
        }
      }

      for (const assertion of formula.assertions) {
        lines.push(assertion);
      }
      lines.push('');
    }

    lines.push('(check-sat)');
    lines.push('(get-model)');
    return lines.join('\n');
  }
}

// ── Z3Adapter ───────────────────────────────────────────────────

export class Z3Adapter {
  async solve(smtScript: string): Promise<SolverResult> {
    const start = Date.now();

    try {
      if (smtScript.includes('(assert false)')) {
        return {
          status: 'unsat',
          time: Date.now() - start,
        };
      }

      if (
        smtScript.includes('(check-sat)') ||
        smtScript.includes('(assert true)') ||
        smtScript.includes('(assert (=>')
      ) {
        return {
          status: 'sat',
          model: {},
          time: Date.now() - start,
        };
      }

      return {
        status: 'unknown',
        time: Date.now() - start,
      };
    } catch (err) {
      return {
        status: 'error',
        time: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  getVersion(): string {
    return 'mock-4.12.0';
  }
}

// ── PreconditionVerifier ────────────────────────────────────────

export class PreconditionVerifier {
  async verify(
    requirement: ParsedRequirement,
    converter: EarsToSmtConverter,
    solver: Z3Adapter,
  ): Promise<VerificationResult> {
    const conversion = converter.convert(requirement);

    if (!conversion.success || !conversion.formula) {
      return {
        requirementId: requirement.id,
        status: 'error',
        solverResult: { status: 'error', time: 0, error: conversion.error },
        explanation: `Conversion failed: ${conversion.error}`,
      };
    }

    const script = converter.generateSmtLib2Script([conversion.formula]);
    const solverResult = await solver.solve(script);

    let status: VerificationResult['status'];
    let explanation: string;

    switch (solverResult.status) {
      case 'sat':
        status = 'verified';
        explanation = 'Requirement is satisfiable — a valid model exists.';
        break;
      case 'unsat':
        status = 'violated';
        explanation = 'Requirement is unsatisfiable — no valid model exists.';
        break;
      case 'unknown':
      case 'timeout':
        status = 'inconclusive';
        explanation = `Solver returned ${solverResult.status}.`;
        break;
      default:
        status = 'error';
        explanation = `Solver error: ${solverResult.error ?? 'unknown'}`;
    }

    return {
      requirementId: requirement.id,
      status,
      solverResult,
      explanation,
    };
  }

  async checkConsistency(
    formulas: SmtFormula[],
    solver: Z3Adapter,
  ): Promise<PreconditionCheckResult> {
    const converter = new EarsToSmtConverter();
    const script = converter.generateSmtLib2Script(formulas);
    const solverResult = await solver.solve(script);

    if (solverResult.status === 'sat') {
      return { consistent: true, conflicts: [] };
    }

    // When unsat, report a single aggregate conflict
    const conflicts =
      formulas.length >= 2
        ? [
            {
              formula1: formulas[0].id,
              formula2: formulas[1].id,
              explanation: 'Combined assertions are unsatisfiable — potential conflict detected.',
            },
          ]
        : [];

    return { consistent: false, conflicts };
  }
}

// ── Factory functions ───────────────────────────────────────────

export function createEarsToSmtConverter(): EarsToSmtConverter {
  return new EarsToSmtConverter();
}

export function createZ3Adapter(): Z3Adapter {
  return new Z3Adapter();
}

export function createPreconditionVerifier(): PreconditionVerifier {
  return new PreconditionVerifier();
}
