// File: src/shared/services-effect/agent/types.ts

import type { FileSystem } from "@effect/platform/FileSystem";
import { Context, Data, Effect } from "effect";
import type { z } from "zod";
import type { JSONObject } from "../../../types.js";
// AgentConfigurationError is defined below, no separate import needed from errors.js
import type { AgentConfig, AgentRun } from './schema.js';

// --- Type Definitions ---

/**
 * Defines a reducer function for updating a channel in the agent state.
 * @template T The type of the state slice being reduced.
 */
export interface ChannelReducer<T> {
  /** The reducer function taking the current and new value, returning the updated value. */
  readonly reducer: (a: T, b: T) => T;
}

/** Represents accumulated errors within an agent run. */
export interface AgentErrors {
  /** A list of error messages or structured error objects encountered. */
  readonly errors: ReadonlyArray<string | object>; // Allow structured errors too
  /** The total count of errors. */
  readonly errorCount: number;
}

/** Represents the status of a single node execution within the agent graph. */
export interface NodeStatus {
  /** The unique identifier of the node. */
  readonly nodeId: string;
  /** The current execution status of the node. */
  readonly status: 'entering' | 'running' | 'completed' | 'error';
  /** The ISO timestamp when this status was recorded. */
  readonly timestamp: string;
  /** Optional additional details about the status (e.g., error message). */
  readonly details?: string;
}

/** Represents the overall status and history of an agent execution. */
export interface AgentStatus {
  /** The overall status of the agent run. */
  readonly overallStatus?: 'running' | 'completed' | 'error';
  /** A history of node executions (completed or errored). */
  readonly nodeHistory: ReadonlyArray<{
    /** The ID of the node. */
    readonly nodeId: string;
    /** The final status of the node execution. */
    readonly status: 'completed' | 'error';
    /** The error message or object if the node failed. */
    readonly error?: string | object;
    /** The ISO timestamp of completion or error. */
    readonly timestamp: string;
  }>;
  /** The ID of the node currently being executed. */
  readonly currentNode?: string;
}

/** Represents accumulated log messages during an agent run. */
export interface AgentLogs {
  /** A list of log messages. */
  readonly logs: ReadonlyArray<string>;
  /** The total count of log messages. */
  readonly logCount: number;
}

/**
 * Represents the complete state of an agent during execution.
 * @template I The type of the initial input data.
 * @template O The type of the final output data.
 * @template A The type of the internal agent-specific state.
 */
export interface AgentState<I extends JSONObject, O extends JSONObject, A extends JSONObject> {
  /** The configuration used for this agent run. */
  readonly config: AgentConfig;
  /** Metadata about the specific agent run instance. */
  readonly agentRun: AgentRun;
  /** The current status and history of the agent execution. */
  readonly status: AgentStatus;
  /** Accumulated log messages. */
  readonly logs: AgentLogs;
  /** Accumulated errors. */
  readonly errors: AgentErrors;
  /** The initial input provided to the agent. */
  readonly input: I;
  /** The output produced by the agent (potentially partial during execution). */
  readonly output: O;
  /** The internal state managed by the agent's nodes. */
  readonly agentState: A;
}

/**
 * Represents the result of a data normalization operation.
 * NOTE: Marked for potential removal/relocation as it's internal to a specific agent.
 */
export interface NormalizationResult {
  /** Whether the data was successfully normalized. */
  readonly normalized: boolean;
  /** The normalized data (or original data if normalization failed). */
  readonly data: Record<string, unknown>;
  /** Any validation errors encountered during normalization. */
  readonly validationErrors: ReadonlyArray<string>;
  /** Time taken to process the normalization in milliseconds. */
  readonly processingTimeMs?: number;
}

/**
 * Configuration options for a normalizing agent.
 * NOTE: Marked for potential removal/relocation.
 */
export interface NormalizingAgentConfig extends AgentConfig {
  /** The schema to validate and normalize data against. */
  readonly schema: z.ZodSchema;
  /** Optional configuration overrides. */
  readonly overrides?: {
    /** Maximum number of records in a batch operation. */
    readonly maxBatchSize?: number;
    /** Timeout in milliseconds for normalization operations. */
    readonly timeoutMs?: number;
  };
}

// --- Error Types ---

/** Error related to agent configuration loading or validation. */
export class AgentConfigurationError extends Data.TaggedError("AgentConfigurationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> { }

/** Error related to the critical execution failure of the agent graph/runtime. */
export class AgentExecutionError extends Data.TaggedError("AgentExecutionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> { }

/** Error related to agent implementation issues (e.g., within a specific node's logic). */
export class AgentImplementationError extends Data.TaggedError("AgentImplementationError")<{
  readonly message: string;
  readonly agentId?: string; // Optional agentId if available
  readonly nodeId?: string; // Optional nodeId where error occurred
  readonly cause?: unknown;
}> { }

/** Error related to rate limiting encountered during agent execution. */
export class AgentRateLimitError extends Data.TaggedError("AgentRateLimitError")<{
  readonly message: string;
  readonly agentId?: string; // Optional agentId if available
  readonly service?: string; // Optional service that rate limited
  readonly retryAfterMs?: number; // Optional retry delay
  readonly cause?: unknown;
}> { }


// --- Service Interfaces ---

/**
 * Defines the core service for executing an agent graph.
 * @template I Input data type.
 * @template O Output data type.
 * @template A Agent-specific internal state type.
 */
export interface IAgentService<I extends JSONObject, O extends JSONObject, A extends JSONObject> {
  /**
   * Runs the agent graph with the given input.
   * Returns the final agent state upon successful completion.
   * Fails with AgentExecutionError for critical runtime/graph execution issues.
   * Node-level errors during a successful run should be captured in AgentState.errors.
   */
  readonly run: (input: I) => Effect.Effect<AgentState<I, O, A>, AgentExecutionError>; // <-- Updated Error Channel

  /** Builds the agent's execution graph (e.g., LangGraph). Optional utility. */
  readonly buildGraph: () => Effect.Effect<void, AgentExecutionError>;

  /** Saves the LangGraph configuration to a file. Optional utility. */
  readonly saveLangGraphConfig: (outputPath?: string) => Effect.Effect<void, AgentExecutionError>;
}

/** Defines the service responsible for loading and validating agent configurations. */
export interface AgentConfigurationService {
  /** Loads the agent configuration from a specified path, requiring ConfigLoader. */
  readonly loadConfig: (configPath: string) => Effect.Effect<
    AgentConfig,
    AgentConfigurationError, // Use specific error
    FileSystem // Assuming FileSystem is needed for loading
  >;
  /** Validates a given AgentConfig object. */
  readonly validateConfig: (config: AgentConfig) => Effect.Effect<
    void,
    AgentConfigurationError // Use specific error
  >;
}

/**
 * Defines the service for data normalization operations.
 * NOTE: Marked for potential removal/relocation.
 */
export interface NormalizationService {
  /** Normalizes a single data record. */
  readonly normalizeData: (
    data: Record<string, unknown>
  ) => Effect.Effect<NormalizationResult, AgentImplementationError | AgentRateLimitError>;

  /** Normalizes a batch of data records. */
  readonly normalizeBatch: (
    dataArray: ReadonlyArray<Record<string, unknown>>
  ) => Effect.Effect<ReadonlyArray<NormalizationResult>, AgentImplementationError | AgentRateLimitError>;
}

// --- Service Tags ---

/** Tag for the AgentService. Uses JSONObject for broader compatibility at injection time. */
export const AgentService = Context.GenericTag<IAgentService<JSONObject, JSONObject, JSONObject>>(
  "@services/agent/AgentService"
);

/** Tag for the AgentConfigurationService. */
export const AgentConfigurationService = Context.GenericTag<AgentConfigurationService>(
  "@services/agent/AgentConfigurationService"
);

