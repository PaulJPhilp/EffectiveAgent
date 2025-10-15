import type { FileSystem } from "@effect/platform"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import { type Brand, type Effect, Schema, type Stream } from "effect"
import type { ModelServiceApi, ProviderServiceApi } from "@/services/ai/index.js"
import type { PolicyServiceApi } from "@/services/ai/policy/api.js"
import type { ToolRegistryApi } from "@/services/ai/tool-registry/api.js"
import type { ConfigurationServiceApi } from "@/services/core/configuration/api.js"
import type { AgentRuntimeServiceApi } from "./api.js"

/**
 * Message priority levels for the mailbox system.
 */
export const MessagePriority = {
    HIGH: 0,
    NORMAL: 1,
    LOW: 2,
    BACKGROUND: 3
} as const

export type MessagePriority = typeof MessagePriority[keyof typeof MessagePriority]

/**
 * Configuration for an AgentRuntime instance.
 */
export interface AgentRuntimeConfig {
    readonly mailbox: MailboxConfig
    readonly processing: ProcessingConfig
}

/**
 * Unique identifier for an AgentRuntime instance.
 * Using a branded type for type-safety and to prevent accidental string usage.
 */
export type AgentRuntimeId = Brand.Branded<string, "AgentRuntimeId">

/**
 * Creates a new AgentRuntimeId from a string.
 */
export const makeAgentRuntimeId = (id: string): AgentRuntimeId => id as AgentRuntimeId

/**
 * The type of activity being processed.
 * This helps determine how to handle the activity's payload.
 */
export const AgentActivityType = {
    COMMAND: "COMMAND",
    EVENT: "EVENT",
    QUERY: "QUERY",
    RESPONSE: "RESPONSE",
    ERROR: "ERROR",
    STATE_CHANGE: "STATE_CHANGE",
    SYSTEM: "SYSTEM"
} as const

export type AgentActivityType = typeof AgentActivityType[keyof typeof AgentActivityType]

/**
 * The type of record being processed by the agent runtime.
 * This helps determine how to handle the record's payload.
 */
export const AgentRecordType = {
    COMMAND: "COMMAND",
    EVENT: "EVENT",
    QUERY: "QUERY",
    RESPONSE: "RESPONSE",
    ERROR: "ERROR",
    STATE_CHANGE: "STATE_CHANGE",
    SYSTEM: "SYSTEM"
} as const

export type AgentRecordType = typeof AgentRecordType[keyof typeof AgentRecordType]

/**
 * Represents a message that can be sent to or from an AgentRuntime.
 * This is the primary unit of communication in the system.
 */
export interface AgentActivity {
    /** Unique identifier for this activity */
    readonly id: string
    /** The AgentRuntime this activity is associated with */
    readonly agentRuntimeId: AgentRuntimeId
    /** When this activity was created */
    readonly timestamp: number
    /** The type of activity */
    readonly type: AgentActivityType
    /** The actual data being conveyed */
    readonly payload: unknown
    /** Sequence number for ordering activities */
    readonly sequence: number
    /** Additional context about this activity */
    readonly metadata: {
        /** The AgentRuntime that created this activity (if different from agentRuntimeId) */
        readonly sourceAgentRuntimeId?: AgentRuntimeId
        /** The correlation ID for tracking related activities */
        readonly correlationId?: string
        /** Whether this activity has been processed */
        readonly processed?: boolean
        /** Whether this activity has been persisted */
        readonly persisted?: boolean
        /** Message priority for processing order */
        readonly priority?: MessagePriority
        /** When the message should be processed (timestamp) */
        readonly scheduledFor?: number
        /** Maximum time to wait for processing before failing */
        readonly timeout?: number
        /** Custom metadata fields */
        readonly [key: string]: unknown
    }
}

/**
 * Represents a message that can be sent to or from an AgentRuntime.
 * This is the primary unit of communication in the system (record variant).
 */
export interface AgentRecord {
    /** Unique identifier for this record */
    readonly id: string
    /** The AgentRuntime this record is associated with */
    readonly agentRuntimeId: AgentRuntimeId
    /** When this record was created */
    readonly timestamp: number
    /** The type of record */
    readonly type: AgentRecordType
    /** The actual data being conveyed */
    readonly payload: unknown
    /** Additional context about this record */
    readonly metadata: {
        /** The AgentRuntime that created this record (if different from agentRuntimeId) */
        readonly sourceAgentRuntimeId?: AgentRuntimeId
        /** The correlation ID for tracking related records */
        readonly correlationId?: string
        /** Whether this record has been processed */
        readonly processed?: boolean
        /** Whether this record has been persisted */
        readonly persisted?: boolean
        /** Message priority for processing order */
        readonly priority?: MessagePriority
        /** When the message should be processed (timestamp) */
        readonly scheduledFor?: number
        /** Maximum time to wait for processing before failing */
        readonly timeout?: number
        /** Custom metadata fields */
        readonly [key: string]: unknown
    }
}

/**
 * The possible states an AgentRuntime can be in.
 */
export const AgentRuntimeStatus = {
    IDLE: "IDLE",
    PROCESSING: "PROCESSING",
    ERROR: "ERROR",
    TERMINATED: "TERMINATED"
} as const

export type AgentRuntimeStatus = typeof AgentRuntimeStatus[keyof typeof AgentRuntimeStatus]

/**
 * Function that processes an AgentActivity and current state to produce a new state.
 * This is the core logic that defines an AgentRuntime's behavior.
 */
export type AgentWorkflow<S, E = never, R = never> = (
    activity: AgentActivity,
    state: S
) => Effect.Effect<S, E, R>

/**
 * Internal state for an AgentRuntime instance.
 */
export interface AgentRuntimeState<S> {
    /** The AgentRuntime's unique identifier */
    readonly id: AgentRuntimeId
    /** The custom state for this AgentRuntime */
    readonly state: S
    /** The current status of the AgentRuntime */
    readonly status: AgentRuntimeStatus
    /** When this state was last updated */
    readonly lastUpdated: number
    /** Any error information if status is ERROR */
    readonly error?: unknown
    /** Processing statistics */
    readonly processing?: {
        /** Number of messages processed */
        readonly processed: number
        /** Number of messages that failed */
        readonly failures: number
        /** Average processing time in milliseconds */
        readonly avgProcessingTime: number
        /** Last error encountered during processing */
        readonly lastError?: unknown
    }
    /** Mailbox statistics */
    readonly mailbox?: {
        /** Current number of messages in the mailbox */
        readonly size: number
        /** Number of messages processed */
        readonly processed: number
        /** Number of messages that timed out */
        readonly timeouts: number
        /** Average processing time in milliseconds */
        readonly avgProcessingTime: number
    }
}

export interface MailboxConfig {
    size: number
    priorityQueueSize: number
    enablePrioritization: boolean
}

export interface ProcessingConfig {
    maxConcurrent: number
    maxRetries: number
    retryDelay: number
    timeout: number
}

export interface Mailbox {
    offer: (activity: AgentActivity) => Effect.Effect<void, Error>
    take: () => Effect.Effect<AgentActivity, Error>
    size: () => number
    clear: () => Effect.Effect<void, never>
    subscribe: () => Stream.Stream<AgentActivity, Error>
}

export type StateReducer<S> = (
    activity: AgentActivity,
    state: S
) => Effect.Effect<S, Error>

export interface AgentRuntime<S> {
    readonly id: AgentRuntimeId
    readonly state: Effect.Effect<S, Error>
    send: (activity: AgentActivity) => Effect.Effect<void, Error>
}

export interface AgentRuntimeFactory {
    create: <S>(
        id: AgentRuntimeId,
        initialState: S,
        reducer: StateReducer<S>,
        config?: Partial<AgentRuntimeConfig>
    ) => Effect.Effect<AgentRuntime<S>, Error>
}

/**
 * Initializes the AgentRuntime system with the provided master configuration.
 * This sets up all required services and creates the Effect runtime.
 */

export type RuntimeServices = ConfigurationServiceApi &
  ModelServiceApi &
  ProviderServiceApi &
  PolicyServiceApi &
  ToolRegistryApi &
  AgentRuntimeServiceApi &
  FileSystem &
  Path.Path &
  Terminal.Terminal;

/**
 * Configuration options for LangGraph agent execution.
 */
export interface LangGraphRunOptions {
  /** Maximum recursion depth for LangGraph execution */
  readonly recursionLimit?: number;
  /** Additional options passed to LangGraph invoke */
  readonly [key: string]: any;
}

/**
 * Interface for a compiled LangGraph that can be executed by AgentRuntime.
 * Matches the LangGraph framework's compiled graph interface.
 */
export interface CompiledLangGraph<TState> {
  /**
   * Invokes the LangGraph with the current state and options.
   * 
   * @param state - Current agent state
   * @param options - Optional configuration for this invocation
   * @returns Promise resolving to the new state or an AsyncIterable of states
   */
  invoke: (
    state: TState,
    options?: { configurable?: Record<string, any>; [key: string]: any }
  ) => Promise<TState | AsyncIterable<TState>>;
}

/**
 * Statistics about LangGraph agent execution.
 */
export interface LangGraphStats {
  /** Total number of graph invocations */
  readonly invocations: number;
  /** Average time per invocation in milliseconds */
  readonly avgInvokeTime: number;
  /** Number of times recursion limit was hit */
  readonly recursionLimitHits: number;
  /** Last error encountered during graph execution */
  readonly lastError?: unknown;
}

/**
 * Extension of AgentRuntimeState for LangGraph agents.
 * Adds LangGraph-specific statistics.
 */
export interface LangGraphAgentRuntimeState<S> extends AgentRuntimeState<S> {
  /** LangGraph execution statistics */
  readonly langGraph?: LangGraphStats;
}

/**
 * Schema for the payload of the 'generate_structured_output' command.
 */
export const GenerateStructuredOutputPayloadSchema = Schema.Struct({
    action: Schema.Literal("generate_structured_output"),
    prompt: Schema.String,
    model: Schema.String
})

/**
 * Type for the payload of the 'generate_structured_output' command.
 */
export type GenerateStructuredOutputPayload = typeof GenerateStructuredOutputPayloadSchema.Type