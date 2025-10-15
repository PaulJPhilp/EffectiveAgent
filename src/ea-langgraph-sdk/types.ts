// Mock Annotation implementation since @langchain/langgraph is not available
const Annotation = {
  Root: (spec: any) => ({ spec }),
  default: (defaultValue: any) => ({ default: defaultValue }),
};

import type { AgentRuntimeServiceApi } from "../ea-agent-runtime/api.js";

/**
 * Base annotation for LangGraph agents integrated with Effective Agent.
 * Use this as a foundation to build agent-specific state annotations.
 *
 * @example
 * ```typescript
 * const MyAgentStateAnnotation = Annotation.Root({
 *   ...LangGraphAgentBaseAnnotation.spec,
 *   messages: Annotation<Array<{ role: string; content: string }>>({
 *     default: () => [],
 *     reducer: (existing, update) => existing.concat(update)
 *   }),
 *   currentTask: Annotation<string>()
 * })
 * ```
 */
export const LangGraphAgentBaseAnnotation = Annotation.Root({
  /**
   * An instance of the Effective Agent AgentRuntimeService.
   * This provides access to EA services and the run method for executing Effects.
   */
  agentRuntime: {},

  /**
   * Agent-specific context and state properties.
   * Contains typed context data specific to the agent implementation.
   */
  context: {
    reducer: (existing: any, update: any) => update ?? existing,
    default: () => ({}),
  },
});

/**
 * Generic interface for LangGraph agent state with typed context.
 * Extends the base state structure with typed context support.
 */
export interface LangGraphAgentState<
  TContext extends Record<string, unknown> = Record<string, unknown>
> {
  agentRuntime: AgentRuntimeServiceApi;
  context: TContext;
}

/**
 * Configuration options for LangGraph agent creation and execution.
 * These options control how the LangGraph agent integrates with EA runtime.
 */
export interface LangGraphAgentConfig {
  /**
   * Maximum number of recursive calls allowed in the LangGraph execution.
   * Prevents infinite loops in complex agent workflows.
   * @default 50
   */
  readonly recursionLimit?: number;

  /**
   * Timeout in milliseconds for LangGraph invoke operations.
   * @default 30000
   */
  readonly timeoutMs?: number;

  /**
   * Whether to enable streaming mode for LangGraph execution.
   * When enabled, supports AsyncIterable responses.
   * @default false
   */
  readonly enableStreaming?: boolean;

  /**
   * Custom error handling strategy for LangGraph operations.
   * @default "propagate"
   */
  readonly errorHandling?: "propagate" | "capture" | "retry";

  /**
   * Number of retry attempts for failed operations when errorHandling is "retry".
   * @default 3
   */
  readonly retryAttempts?: number;

  /**
   * Additional configuration properties that will be passed to LangGraph.
   * These are forwarded to the LangGraph configurable options.
   */
  readonly [key: string]: unknown;
}

/**
 * Standard activity payload structure for LangGraph operations.
 * Provides a consistent format for activities sent to LangGraph agents.
 */
export interface LangGraphActivityPayload {
  /**
   * The operation type or command for the LangGraph agent to execute.
   * This should match the operations supported by the agent's graph.
   */
  readonly operation: string;

  /**
   * Operation-specific data payload.
   * Contains the actual data needed to execute the operation.
   */
  readonly data?: Record<string, unknown>;

  /**
   * Additional metadata about the operation.
   * Includes timestamps, source information, and other contextual data.
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Enhanced parameters for creating LangGraph agents with EA integration.
 * Combines the compiled graph, initial state, and configuration options.
 */
export interface CreateLangGraphAgentParams<
  TState extends LangGraphAgentState
> {
  /**
   * The compiled LangGraph object with invoke capability.
   * Must support both Promise and AsyncIterable return types.
   */
  readonly compiledGraph: {
    invoke: (
      state: TState,
      options?: { configurable?: Record<string, any>; [key: string]: any }
    ) => Promise<TState | AsyncIterable<TState>>;
  };

  /**
   * The initial state for the LangGraph agent.
   * Must include the agentRuntime property for EA integration.
   */
  readonly initialState: TState;

  /**
   * Optional configuration for the agent runtime behavior.
   */
  readonly config?: LangGraphAgentConfig;
}

/**
 * Result of creating a LangGraph agent through the EA SDK.
 * Contains both the runtime handle and the generated ID.
 */
export interface LangGraphAgentCreationResult<
  _TState extends LangGraphAgentState
> {
  /**
   * Handle to the created AgentRuntime instance.
   * Use this to interact with the running agent.
   */
  readonly agentRuntime: {
    readonly id: string;
    readonly send: (activity: any) => any;
    readonly getState: () => any;
    readonly subscribe: () => any;
  };

  /**
   * The unique identifier assigned to this agent runtime.
   */
  readonly agentRuntimeId: string;
}

/**
 * Validation result for LangGraph agent state.
 * Contains validation status and any error details.
 */
export interface AgentStateValidationResult {
  /**
   * Whether the state passed validation.
   */
  readonly isValid: boolean;

  /**
   * List of validation errors if validation failed.
   */
  readonly errors?: ReadonlyArray<string>;

  /**
   * Additional validation context or warnings.
   */
  readonly warnings?: ReadonlyArray<string>;
}
