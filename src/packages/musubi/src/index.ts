/**
 * @musubix2/musubi — Lightweight SDD Wrapper
 *
 * Convenience wrapper that re-exports commonly used core types
 * and provides a simplified API for SDD operations.
 *
 * @see DES-PKG-001 — Package registry
 */

import {
  EARSValidator as _EARSValidator,
  MarkdownEARSParser as _MarkdownEARSParser,
  RequirementsValidator as _RequirementsValidator,
  createEARSValidator as _createEARSValidator,
  createMarkdownEARSParser as _createMarkdownEARSParser,
  createRequirementsValidator as _createRequirementsValidator,
} from '@musubix2/core';

export {
  // Error handling
  ActionableError,
  ErrorCodes,
  CommonErrors,
  ErrorFormatter,
  CircuitBreaker,
  retryWithBackoff,
  createGracefulDegradation,

  // Logging
  Logger,
  AuditLogger,

  // Config
  ConfigLoader,

  // EARS
  EARSValidator,
  createEARSValidator,
  MarkdownEARSParser,
  RequirementsValidator,
  createMarkdownEARSParser,
  createRequirementsValidator,

  // REPL
  ReplEngine,

  // Explanation
  ReasoningChainRecorder,
  ExplanationGenerator,

  // Repository
  InMemoryRepository,
  createInMemoryRepository,

  // CLI
  ExitCode,
  formatTable,
  formatSuccess,
  formatError,

  // Types
  type EARSPattern,
  type ParsedRequirement,
  type ValidationResult,
  type ErrorSeverity,
  type MuSubixConfig,
  type ReplCommand,
  type ReasoningChain,
} from '@musubix2/core';

export const MUSUBI_VERSION = '0.1.0';

/**
 * Quick-start helper: create a configured EARS validator + parser combo.
 */
export function createEARSPipeline(): {
  validator: _EARSValidator;
  parser: _MarkdownEARSParser;
  requirementsValidator: _RequirementsValidator;
} {
  const validator = _createEARSValidator();
  const parser = _createMarkdownEARSParser();
  const requirementsValidator = _createRequirementsValidator();
  return { validator, parser, requirementsValidator };
}
