/**
 * @module neurosymbolic
 * @description Neuro-Symbolic Integration Layer - semantic code filtering and hallucination detection
 * @see DES-INT-001
 */

export type FilterStage = 'input' | 'semantic' | 'symbolic' | 'output';

export interface FilterResult {
  stage: FilterStage;
  passed: boolean;
  confidence: number;
  reason: string;
}

export interface PipelineResult {
  passed: boolean;
  stages: FilterResult[];
  finalConfidence: number;
  hallucinationDetected: boolean;
}

export interface SemanticFilter {
  name: string;
  filter(input: string, context?: Record<string, unknown>): FilterResult;
}

export interface HallucinationIssue {
  type: 'unknown-type' | 'unknown-function' | 'fabricated-api';
  identifier: string;
  message: string;
}

export class SemanticCodeFilterPipeline {
  private filters: SemanticFilter[] = [];

  addFilter(filter: SemanticFilter): void {
    this.filters.push(filter);
  }

  process(input: string, context?: Record<string, unknown>): PipelineResult {
    const stages: FilterResult[] = [];
    let passed = true;
    let finalConfidence = 1.0;

    for (const filter of this.filters) {
      const result = filter.filter(input, context);
      stages.push(result);
      finalConfidence = Math.min(finalConfidence, result.confidence);
      if (!result.passed) {
        passed = false;
        break;
      }
    }

    return {
      passed,
      stages,
      finalConfidence,
      hallucinationDetected: !passed && stages.some((s) => s.stage === 'semantic'),
    };
  }

  getFilters(): SemanticFilter[] {
    return [...this.filters];
  }
}

const BUILTIN_TYPES = new Set([
  'String',
  'Number',
  'Boolean',
  'Object',
  'Array',
  'Date',
  'Map',
  'Set',
  'Promise',
  'Error',
  'RegExp',
  'Function',
  'Record',
  'Partial',
  'Required',
  'Readonly',
]);

const BUILTIN_FUNCTIONS = new Set([
  'console',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'require',
  'import',
  'export',
  'typeof',
  'instanceof',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'return',
  'throw',
  'try',
  'catch',
  'finally',
  'new',
]);

export class HallucinationDetector {
  detect(
    generatedCode: string,
    context: { existingTypes: string[]; existingFunctions: string[] },
  ): { detected: boolean; issues: HallucinationIssue[] } {
    const issues: HallucinationIssue[] = [];
    const knownTypes = new Set(context.existingTypes);
    const knownFunctions = new Set(context.existingFunctions);

    // Extract type references (e.g., `: TypeName`, `new TypeName`, `extends TypeName`)
    const typePattern = /(?::\s*|new\s+|extends\s+|implements\s+)([A-Z][a-zA-Z0-9]*)/g;
    let match;
    const checkedTypes = new Set<string>();
    while ((match = typePattern.exec(generatedCode)) !== null) {
      const typeName = match[1];
      if (
        !checkedTypes.has(typeName) &&
        !knownTypes.has(typeName) &&
        !BUILTIN_TYPES.has(typeName)
      ) {
        checkedTypes.add(typeName);
        issues.push({
          type: 'unknown-type',
          identifier: typeName,
          message: `Referenced type '${typeName}' is not in the known context`,
        });
      }
    }

    // Extract function calls (e.g., `functionName(`)
    const functionPattern = /\b([a-z][a-zA-Z0-9]*)\s*\(/g;
    const checkedFunctions = new Set<string>();
    while ((match = functionPattern.exec(generatedCode)) !== null) {
      const funcName = match[1];
      if (
        !checkedFunctions.has(funcName) &&
        !knownFunctions.has(funcName) &&
        !BUILTIN_FUNCTIONS.has(funcName)
      ) {
        checkedFunctions.add(funcName);
        issues.push({
          type: 'unknown-function',
          identifier: funcName,
          message: `Referenced function '${funcName}' is not in the known context`,
        });
      }
    }

    return {
      detected: issues.length > 0,
      issues,
    };
  }
}

export interface RejectionResult {
  accepted: boolean;
  reason: string;
}

export class RejectionGate {
  private threshold: number;

  constructor(threshold: number = 0.7) {
    this.threshold = threshold;
  }

  evaluate(result: { confidence: number; symbolicValid: boolean }): RejectionResult {
    if (!result.symbolicValid) {
      return {
        accepted: false,
        reason: `Rejected: symbolic validation failed (confidence: ${result.confidence.toFixed(2)})`,
      };
    }

    if (result.confidence < this.threshold) {
      return {
        accepted: false,
        reason: `Rejected: confidence ${result.confidence.toFixed(2)} is below threshold ${this.threshold.toFixed(2)}`,
      };
    }

    return {
      accepted: true,
      reason: `Accepted: confidence ${result.confidence.toFixed(2)} meets threshold ${this.threshold.toFixed(2)} and symbolic validation passed`,
    };
  }

  getThreshold(): number {
    return this.threshold;
  }
}

export function createSemanticCodeFilterPipeline(): SemanticCodeFilterPipeline {
  return new SemanticCodeFilterPipeline();
}

export function createHallucinationDetector(): HallucinationDetector {
  return new HallucinationDetector();
}

export function createRejectionGate(threshold?: number): RejectionGate {
  return new RejectionGate(threshold);
}
