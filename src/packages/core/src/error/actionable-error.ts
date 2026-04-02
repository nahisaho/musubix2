/**
 * Actionable Error System
 *
 * Provides structured error classes with suggestions for resolution
 * and formatted output for CLI display.
 *
 * @module error/actionable-error
 * @see REQ-ARC-004 — Error handling with user-facing suggestions
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Suggestion for resolving an error
 */
export interface ErrorSuggestion {
  /** Short action label */
  action: string;
  /** Detailed description */
  description: string;
  /** Optional command to run */
  command?: string;
  /** Optional documentation link */
  docLink?: string;
}

/**
 * Context information for the error
 */
export interface ErrorContext {
  /** File path where error occurred */
  file?: string;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
  /** Related artifact ID (e.g., REQ-001) */
  artifactId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Actionable error options
 */
export interface ActionableErrorOptions {
  /** Error code for programmatic handling */
  code: string;
  /** Severity level */
  severity?: ErrorSeverity;
  /** Context information */
  context?: ErrorContext;
  /** Suggestions for resolution */
  suggestions?: ErrorSuggestion[];
  /** Original error if wrapping */
  cause?: Error;
}

/**
 * Actionable Error
 *
 * An error class that includes suggestions for resolution,
 * context information, and structured formatting.
 */
export class ActionableError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
  readonly suggestions: ErrorSuggestion[];

  constructor(message: string, options: ActionableErrorOptions) {
    super(message);
    this.name = 'ActionableError';
    this.code = options.code;
    this.severity = options.severity ?? 'error';
    this.context = options.context ?? {};
    this.suggestions = options.suggestions ?? [];

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ActionableError);
    }

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  static withSuggestion(
    message: string,
    code: string,
    suggestion: ErrorSuggestion,
  ): ActionableError {
    return new ActionableError(message, {
      code,
      suggestions: [suggestion],
    });
  }

  static fromError(error: Error, code: string, suggestions?: ErrorSuggestion[]): ActionableError {
    return new ActionableError(error.message, {
      code,
      cause: error,
      suggestions,
    });
  }

  static isActionableError(error: unknown): error is ActionableError {
    return error instanceof ActionableError;
  }

  addSuggestion(suggestion: ErrorSuggestion): this {
    this.suggestions.push(suggestion);
    return this;
  }

  toFormattedString(): string {
    return ErrorFormatter.format(this);
  }
}

/**
 * Predefined error codes for common scenarios
 */
export const ErrorCodes = {
  // Validation errors
  EARS_VALIDATION_FAILED: 'EARS_VALIDATION_FAILED',
  TRACEABILITY_MISSING: 'TRACEABILITY_MISSING',
  DESIGN_INCOMPLETE: 'DESIGN_INCOMPLETE',

  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PARSE_ERROR: 'FILE_PARSE_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',

  // Configuration errors
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',

  // Workflow errors
  PHASE_TRANSITION_BLOCKED: 'PHASE_TRANSITION_BLOCKED',
  QUALITY_GATE_FAILED: 'QUALITY_GATE_FAILED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',

  // Generation errors
  CODEGEN_FAILED: 'CODEGEN_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',

  // Pattern errors
  PATTERN_NOT_FOUND: 'PATTERN_NOT_FOUND',
  PATTERN_CONFLICT: 'PATTERN_CONFLICT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error Formatter — formats ActionableError for CLI display
 */
export class ErrorFormatter {
  private static useColors = true;

  static setColorOutput(enabled: boolean): void {
    ErrorFormatter.useColors = enabled;
  }

  static format(error: ActionableError): string {
    const lines: string[] = [];

    const icon = ErrorFormatter.getSeverityIcon(error.severity);
    const header = `${icon} [${error.code}] ${error.message}`;
    lines.push(ErrorFormatter.colorize(header, error.severity));

    if (error.context.file) {
      let location = `   📍 ${error.context.file}`;
      if (error.context.line !== undefined) {
        location += `:${error.context.line}`;
        if (error.context.column !== undefined) {
          location += `:${error.context.column}`;
        }
      }
      lines.push(location);
    }

    if (error.context.artifactId) {
      lines.push(`   📎 Related: ${error.context.artifactId}`);
    }

    if (error.suggestions.length > 0) {
      lines.push('');
      lines.push('   💡 Suggestions:');
      for (const suggestion of error.suggestions) {
        lines.push(`      • ${suggestion.action}: ${suggestion.description}`);
        if (suggestion.command) {
          lines.push(`        $ ${suggestion.command}`);
        }
        if (suggestion.docLink) {
          lines.push(`        📖 ${suggestion.docLink}`);
        }
      }
    }

    return lines.join('\n');
  }

  static formatAll(errors: ActionableError[]): string {
    if (errors.length === 0) {
      return ErrorFormatter.colorize('✅ No errors', 'info');
    }

    const lines: string[] = [];
    const counts = {
      error: errors.filter((e) => e.severity === 'error').length,
      warning: errors.filter((e) => e.severity === 'warning').length,
      info: errors.filter((e) => e.severity === 'info').length,
    };

    lines.push(
      `Found ${errors.length} issue(s): ${counts.error} errors, ${counts.warning} warnings, ${counts.info} info\n`,
    );

    for (const error of errors) {
      lines.push(ErrorFormatter.format(error));
      lines.push('');
    }

    return lines.join('\n');
  }

  static formatAsJson(error: ActionableError): string {
    return JSON.stringify(
      {
        code: error.code,
        severity: error.severity,
        message: error.message,
        context: error.context,
        suggestions: error.suggestions,
      },
      null,
      2,
    );
  }

  private static getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  }

  private static colorize(text: string, severity: ErrorSeverity): string {
    if (!ErrorFormatter.useColors) {
      return text;
    }

    const colors: Record<ErrorSeverity, string> = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      info: '\x1b[36m',
    };

    const reset = '\x1b[0m';
    return `${colors[severity]}${text}${reset}`;
  }
}

/**
 * Common error factories
 */
export const CommonErrors = {
  fileNotFound(path: string): ActionableError {
    return new ActionableError(`File not found: ${path}`, {
      code: ErrorCodes.FILE_NOT_FOUND,
      context: { file: path },
      suggestions: [
        {
          action: 'Check path',
          description: 'Verify the file path is correct',
        },
        {
          action: 'Create file',
          description: 'Create the missing file if needed',
          command: `touch ${path}`,
        },
      ],
    });
  },

  earsValidationFailed(file: string, issues: string[]): ActionableError {
    return new ActionableError(`EARS validation failed with ${issues.length} issue(s)`, {
      code: ErrorCodes.EARS_VALIDATION_FAILED,
      context: { file },
      suggestions: [
        {
          action: 'Review EARS format',
          description: 'Ensure requirements follow EARS patterns (Ubiquitous, Event-driven, etc.)',
        },
        {
          action: 'Run validation',
          description: 'Use the validation command to see detailed issues',
          command: `npx musubix requirements validate ${file}`,
        },
      ],
    });
  },

  traceabilityMissing(reqId: string, designId: string): ActionableError {
    return new ActionableError(`Missing traceability link: ${reqId} → ${designId}`, {
      code: ErrorCodes.TRACEABILITY_MISSING,
      severity: 'warning',
      context: { artifactId: reqId },
      suggestions: [
        {
          action: 'Add trace link',
          description: `Link ${reqId} to its design element`,
          command: 'npx musubix trace sync',
        },
      ],
    });
  },

  phaseTransitionBlocked(from: string, to: string, reason: string): ActionableError {
    return new ActionableError(`Cannot transition from ${from} to ${to}: ${reason}`, {
      code: ErrorCodes.PHASE_TRANSITION_BLOCKED,
      suggestions: [
        {
          action: 'Complete requirements',
          description: 'Ensure all prerequisite artifacts are complete',
        },
        {
          action: 'Check quality gates',
          description: 'Verify all quality gates pass',
          command: 'npx musubix workflow get-status',
        },
      ],
    });
  },

  qualityGateFailed(gate: string, details: string): ActionableError {
    return new ActionableError(`Quality gate failed: ${gate}`, {
      code: ErrorCodes.QUALITY_GATE_FAILED,
      suggestions: [
        {
          action: 'Fix issues',
          description: details,
        },
        {
          action: 'View report',
          description: 'Check the quality gate report for details',
          command: 'npx musubix workflow validate-transition',
        },
      ],
    });
  },
};
