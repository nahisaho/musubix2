/**
 * @musubix2/core — MUSUBIX2 Core Library
 *
 * SDD ワークフローエンジンの中核パッケージ。
 * 要件分析、設計生成、コード生成、トレーサビリティを統合する。
 */
export const VERSION = '0.1.0';

// Error handling
export {
  ActionableError,
  ErrorFormatter,
  ErrorCodes,
  CommonErrors,
  type ErrorSeverity,
  type ErrorSuggestion,
  type ErrorContext,
  type ActionableErrorOptions,
  type ErrorCode,
} from './error/index.js';

export {
  GracefulDegradation,
  CircuitBreaker,
  MemoryCacheProvider,
  MemoryQueueProvider,
  createGracefulDegradation,
  retryWithBackoff,
  type DegradationLevel,
  type ServiceStatus,
  type FallbackStrategy,
  type HealthCheckResult,
  type ServiceConfig,
  type DegradedResult,
  type GracefulDegradationConfig,
  type CacheProvider,
  type QueueProvider,
} from './error/index.js';

// Logging
export {
  Logger,
  ConsoleTransport,
  MemoryTransport,
  AuditLogger,
  type LogLevel,
  type LogEntry,
  type LogTransport,
  type AuditEvent,
} from './logging/index.js';

// Configuration
export {
  ConfigLoader,
  DEFAULT_CONFIG,
  type MuSubixConfig,
  type LlmConfig,
  type KnowledgeConfig,
  type IntegrationConfig,
} from './config/index.js';

// Domain interfaces
export {
  type IRepository,
  type ISearchableRepository,
  type IPaginatedRepository,
  type PaginatedResult,
} from './domain/interfaces/index.js';

// Infrastructure
export {
  InMemoryRepository,
  InMemorySearchableRepository,
  InMemoryPaginatedRepository,
  createInMemoryRepository,
  createInMemorySearchableRepository,
  createInMemoryPaginatedRepository,
} from './infrastructure/repository.js';

// CLI
export {
  ExitCode,
  formatSuccess,
  formatError,
  formatWarning,
  formatInfo,
  formatTable,
  type ExitCodeValue,
  type CommandRegistrar,
} from './interface/cli/index.js';

// Types
export type {
  EARSPattern,
  EARSAnalysisResult,
  ParsedRequirement,
  ValidationResult,
  ValidationIssue,
  CoverageReport,
} from './types/index.js';

// Validators
export {
  EARSValidator,
  createEARSValidator,
  MarkdownEARSParser,
  RequirementsValidator,
  createMarkdownEARSParser,
  createRequirementsValidator,
} from './validators/index.js';

// REPL
export {
  ReplEngine,
  DefaultReplFormatter,
  type ReplCommand,
  type ReplSession,
  type ReplOptions,
  type ReplFormatter,
} from './repl/index.js';

// Explanation
export {
  ReasoningChainRecorder,
  ExplanationGenerator,
  type ReasoningStep,
  type ReasoningChain,
  type ExplanationOptions,
} from './explanation/index.js';
