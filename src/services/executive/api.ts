/**
 * @file ExecutiveService API
 * @description Service contract for the ExecutiveService. Defines only the public interface and option types required for the contract.
 */

import type { Effect } from "effect";

/**
 * Basic auth context
 */
export interface AuthContext {
  /** Unique identifier for the user */
  readonly userId: string;
  /** Optional roles assigned to the user */
  readonly roles?: readonly string[];
  /** Optional permissions assigned to the user */
  readonly permissions?: readonly string[];
}

/**
 * Auth error types
 */
export type AuthErrorType =
  | "unauthorized"
  | "forbidden"
  | "invalid_token";

/**
 * Auth validation result
 */
export interface AuthValidationResult {
  /** Whether the auth is valid */
  readonly valid: boolean;
  /** Error type if auth is invalid */
  readonly errorType?: AuthErrorType;
  /** Error message if auth is invalid */
  readonly errorMessage?: string;
}

/**
 * Auth validator interface
 */
export interface AuthValidator {
  /** Validate auth context */
  validate(auth: AuthContext): Effect.Effect<AuthValidationResult, never, never>;
}

/**
 * Audit log event types
 */
export type AuditEventType = 
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "retry_attempted"
  | "policy_checked";

/**
 * Audit log event
 */
export interface AuditEvent {
  /** Unique identifier for the execution */
  readonly executionId: string;
  /** Type of audit event */
  readonly eventType: AuditEventType;
  /** Timestamp of the event */
  readonly timestamp: number;
  /** Additional event details */
  readonly details?: Record<string, unknown>;
}

/**
 * Audit logging service interface
 */
export interface AuditLogger {
  /** Log an audit event */
  logEvent(event: AuditEvent): Effect.Effect<void, never, never>;
}

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  /** Base delay between retries in milliseconds */
  readonly baseDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  readonly maxDelayMs: number;
  /** Jitter factor for randomizing retry delays (0-1) */
  readonly jitterFactor?: number;
  /** Whether to use exponential backoff */
  readonly useExponentialBackoff?: boolean;
  /** Maximum cumulative tokens allowed across all retries */
  readonly maxCumulativeTokens?: number;
}

/**
 * Policy configuration for execution
 */
export interface PolicyConfig {
  /** Pipeline ID for policy and audit tracking */
  readonly pipelineId?: string;
  /** Type of operation being performed */
  readonly operationType?: string;
  /** Model ID to use for the operation */
  readonly modelId?: string;
  /** Token usage for the operation */
  readonly tokenUsage?: number;
  /** Additional tags for policy and audit tracking */
  readonly tags?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Options for controlling Effect execution behavior.
 */
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests per window */
  readonly maxRequests: number;
  /** Time window in milliseconds */
  readonly windowMs: number;
  /** Maximum concurrent executions */
  readonly maxConcurrent?: number;
  /** Minimum time between requests in milliseconds */
  readonly minInterval?: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  readonly allowed: boolean;
  /** Time until next allowed request in milliseconds */
  readonly retryAfterMs?: number;
  /** Current request count in window */
  readonly currentCount?: number;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /** Check if request is allowed */
  checkLimit(key: string): Effect.Effect<RateLimitResult, never, never>;
  /** Record a request */
  recordRequest(key: string): Effect.Effect<void, never, never>;
}

export interface BaseExecuteOptions {
  /** Auth context for the execution */
  readonly auth?: AuthContext;
  /** Auth validator implementation */
  readonly authValidator?: AuthValidator;
  /** Rate limit configuration */
  readonly rateLimit?: RateLimitConfig;
  /** Rate limiter implementation */
  readonly rateLimiter?: RateLimiter;
  /** Audit logger implementation */
  readonly auditLogger?: AuditLogger;
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Policy configuration */
  readonly policy?: PolicyConfig;
  /** Optional AbortSignal to cancel the operation */
  readonly signal?: AbortSignal;
}



/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 1,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  jitterFactor: 0.1,
  useExponentialBackoff: true
} as const;

/**
 * Default execution options.
 */
export const DEFAULT_EXECUTE_OPTIONS: BaseExecuteOptions = {
  retry: DEFAULT_RETRY_CONFIG
} as const;

import type { ExecutiveServiceError } from "./errors.js";

/**
 * Service contract for the ExecutiveService.
 * Accepts and executes an Effect from a Producer, with policy enforcement,
 * constraints, and auditing. Returns an Effect of the same result type.
 */
/**
 * Service contract for the ExecutiveService.
 * Accepts and executes an Effect from a Producer, with policy enforcement,
 * constraints, and auditing. Returns an Effect of the same result type.
 */
export interface ExecutiveServiceApi {
	/**
	 * Executes a generic Effect, enforcing policy and constraints.
	 * @param effect The Effect to execute (from a Producer)
	 * @param options Options for controlling execution behavior
	 * @returns An Effect that yields the result or an ExecutiveServiceError
	 */
	execute<R, E, A>(
		effect: Effect.Effect<A, E, R>,
		options?: BaseExecuteOptions
	): Effect.Effect<A, E | ExecutiveServiceError, R>;
}
