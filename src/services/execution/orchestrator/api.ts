import { Effect } from "effect";
import { OrchestratorServiceError } from "./errors.js";
import { EffectiveError } from "@/errors.js";

/**
 * Parameters for configuring orchestration
 */
export interface OrchestratorParameters {
  readonly operationName?: string;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
  readonly rateLimit?: boolean;
  readonly resilience?: {
    readonly circuitBreakerEnabled?: boolean;
    readonly failureThreshold?: number;
    readonly resetTimeoutMs?: number;
    readonly retryBackoffMultiplier?: number;
    readonly retryJitter?: boolean;
  };
}

/**
 * The OrchestratorService orchestrates calls to AI models, applying policies,
 * handling retries, and managing overall execution flow based on provided
 * configuration. Now includes AgentRuntime integration for activity tracking.
 */
export interface OrchestratorServiceApi {
  readonly _tag: "OrchestratorService";
  readonly execute: <R, E extends EffectiveError, A>(
    effect: Effect.Effect<A, E, R>,
    parameters?: OrchestratorParameters
  ) => Effect.Effect<A, E | OrchestratorServiceError, R>;

  /**
   * Get the current agent state for monitoring/debugging
   */
  readonly getAgentState: () => Effect.Effect<any>;

  /**
   * Get the runtime for direct access in tests
   */
  readonly getRuntime: () => any;

  /**
   * Terminate the agent
   */
  readonly terminate: () => Effect.Effect<undefined>;
}
