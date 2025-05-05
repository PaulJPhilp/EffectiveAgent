import { Brand, Effect } from "effect"

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
    readonly mailbox: {
        /** Maximum size of the mailbox */
        readonly size: number
        /** Whether to enable message prioritization */
        readonly enablePrioritization: boolean
        /** Size of each priority queue when prioritization is enabled */
        readonly priorityQueueSize: number
        /** Timeout for backpressure in milliseconds */
        readonly backpressureTimeout: number
    }
}

/**
 * Unique identifier for an AgentRuntime instance.
 * Using a branded type for type-safety and to prevent accidental string usage.
 */
export type AgentRuntimeId = Brand.Branded<string, "AgentRuntimeId">

/**
 * Creates a new AgentRuntimeId from a string.
 * 
 * @param id - The string to convert to an AgentRuntimeId
 * @returns A branded AgentRuntimeId
 */
export const makeAgentRuntimeId = (id: string): AgentRuntimeId => id as AgentRuntimeId

/**
 * The type of activity being recorded.
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
    }
}