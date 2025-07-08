import { EffectiveError } from "@/errors.js";
import { Duration, Effect } from "effect";

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly resetTimeout: Duration.Duration;
  readonly halfOpenMaxAttempts: number;
  readonly name: string;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  readonly state: CircuitBreakerState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureTime: number;
  readonly lastStateChange: number;
  readonly totalRequests: number;
  readonly totalFailures: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelay: Duration.Duration;
  readonly maxDelay: Duration.Duration;
  readonly backoffMultiplier: number;
  readonly jitter: boolean;
  readonly retryableErrors: ReadonlyArray<string>;
  readonly nonRetryableErrors: ReadonlyArray<string>;
}

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy<A> {
  readonly name: string;
  readonly priority: number;
  readonly condition: (error: EffectiveError) => boolean;
  readonly handler: Effect.Effect<A, EffectiveError, any>;
  readonly timeout?: Duration.Duration;
}

/**
 * Resilience context
 */
export interface ResilienceContext {
  readonly operationName: string;
  readonly attemptNumber: number;
  readonly totalAttempts: number;
  readonly lastError?: EffectiveError;
  readonly startTime: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Resilience metrics
 */
export interface ResilienceMetrics {
  readonly operationName: string;
  readonly attempts: number;
  readonly successes: number;
  readonly failures: number;
  readonly fallbackUsed: boolean;
  readonly averageLatency: number;
  readonly lastRecoveryTime: number;
}

/**
 * Error classification for recovery decisions
 */
export interface ErrorClassification {
  readonly isRetryable: boolean;
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly category:
    | "NETWORK"
    | "AUTHENTICATION"
    | "RATE_LIMIT"
    | "VALIDATION"
    | "SYSTEM"
    | "UNKNOWN";
  readonly suggestedDelay?: Duration.Duration;
}

/**
 * Resilience service interface
 */
export interface ResilienceServiceApi {
  readonly withCircuitBreaker: <A, E extends EffectiveError, R>(
    operation: Effect.Effect<A, E, R>,
    config: CircuitBreakerConfig
  ) => Effect.Effect<A, E | CircuitBreakerError, R>;

  readonly withRetry: <A, E extends EffectiveError, R>(
    operation: Effect.Effect<A, E, R>,
    policy: RetryPolicy
  ) => Effect.Effect<A, E, R>;

  readonly withFallback: <A, E extends EffectiveError, R>(
    operation: Effect.Effect<A, E, R>,
    strategies: ReadonlyArray<FallbackStrategy<A>>
  ) => Effect.Effect<A, never, R>;

  readonly classifyError: (error: EffectiveError) => ErrorClassification;

  readonly getCircuitBreakerMetrics: (
    name: string
  ) => Effect.Effect<CircuitBreakerMetrics | undefined, never, never>;

  readonly getResilienceMetrics: (
    operationName: string
  ) => Effect.Effect<ResilienceMetrics | undefined, never, never>;

  readonly resetCircuitBreaker: (
    name: string
  ) => Effect.Effect<void, never, never>;
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends EffectiveError {
  readonly _tag = "CircuitBreakerError";

  constructor(params: {
    readonly circuitBreakerName: string;
    readonly state: CircuitBreakerState;
    readonly cause?: unknown;
  }) {
    super({
      description: `Circuit breaker '${params.circuitBreakerName}' is ${params.state}`,
      module: "Resilience",
      method: "executeWithCircuitBreaker",
      cause: params.cause,
    });
  }
}

/**
 * Retry exhausted error
 */
export class RetryExhaustedError extends EffectiveError {
  readonly _tag = "RetryExhaustedError";

  constructor(params: {
    readonly operationName: string;
    readonly attempts: number;
    readonly lastError: EffectiveError;
  }) {
    super({
      description: `Retry exhausted for operation '${params.operationName}' after ${params.attempts} attempts`,
      module: "Resilience",
      method: "executeWithRetry",
      cause: params.lastError,
    });
  }
}

/**
 * Fallback error
 */
export class FallbackError extends EffectiveError {
  readonly _tag = "FallbackError";

  constructor(params: {
    readonly operationName: string;
    readonly strategiesAttempted: number;
    readonly lastError: EffectiveError;
  }) {
    super({
      description: `All fallback strategies failed for operation '${params.operationName}' (${params.strategiesAttempted} strategies attempted)`,
      module: "Resilience",
      method: "executeWithFallback",
      cause: params.lastError,
    });
  }
}
