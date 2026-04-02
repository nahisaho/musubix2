/**
 * Error handling module
 *
 * @module error
 */
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
} from './actionable-error.js';

export {
  GracefulDegradation,
  CircuitBreaker,
  MemoryCacheProvider,
  MemoryQueueProvider,
  createGracefulDegradation,
  retryWithBackoff,
  DEFAULT_DEGRADATION_CONFIG,
  type DegradationLevel,
  type ServiceStatus,
  type FallbackStrategy,
  type HealthCheckResult,
  type ServiceConfig,
  type FallbackAction,
  type DegradationEvent,
  type DegradedResult,
  type GracefulDegradationConfig,
  type CacheProvider,
  type QueueProvider,
} from './graceful-degradation.js';
