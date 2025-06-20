import { Effect } from "effect";
import { ExecutiveServiceError } from "./errors.js";

/**
 * Parameters for configuring execution
 */
export interface ExecutiveParameters {
  readonly operationName?: string;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
  readonly rateLimit?: boolean;
}

/**
 * The ExecutiveService orchestrates calls to AI models, applying policies,
 * handling retries, and managing overall execution flow based on provided
 * configuration. Now includes AgentRuntime integration for activity tracking.
 */
export interface ExecutiveServiceApi {
  readonly _tag: "ExecutiveService";
  readonly execute: <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    parameters?: ExecutiveParameters
  ) => Effect.Effect<A, E | ExecutiveServiceError, R>;

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
  readonly terminate: () => Effect.Effect<void>;
}
