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
 * Configuration for an Effector instance.
 */
export interface EffectorConfig {
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
 * Unique identifier for an Effector instance.
 * Using a branded type for type-safety and to prevent accidental string usage.
 */
export type EffectorId = Brand.Branded<string, "EffectorId">

/**
 * Creates a new EffectorId from a string.
 * 
 * @param id - The string to convert to an EffectorId
 * @returns A branded EffectorId
 */
export const makeEffectorId = (id: string): EffectorId => id as EffectorId

/**
 * The type of record being processed.
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
 * Represents a message that can be sent to or from an Effector.
 * This is the primary unit of communication in the system.
 */
export interface AgentRecord {
    /** Unique identifier for this record */
    readonly id: string
    /** The Effector this record is associated with */
    readonly effectorId: EffectorId
    /** When this record was created */
    readonly timestamp: number
    /** The type of record */
    readonly type: AgentRecordType
    /** The actual data being conveyed */
    readonly payload: unknown
    /** Additional context about this record */
    readonly metadata: {
        /** The Effector that created this record (if different from effectorId) */
        readonly sourceEffectorId?: EffectorId
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
 * The possible states an Effector can be in.
 */
export const EffectorStatus = {
    IDLE: "IDLE",
    PROCESSING: "PROCESSING",
    ERROR: "ERROR",
    TERMINATED: "TERMINATED"
} as const

export type EffectorStatus = typeof EffectorStatus[keyof typeof EffectorStatus]

/**
 * Represents the internal state of an Effector.
 * 
 * @template S The type of the custom state for this Effector
 */
/**
 * Function that processes an AgentRecord and current state to produce a new state.
 * This is the core logic that defines an Effector's behavior.
 */
export type ProcessingLogic<S, E = never, R = never> = (
    record: AgentRecord,
    state: S
) => Effect.Effect<S, E, R>

/**
 * Internal state for an Effector instance.
 */
export interface EffectorState<S> {
    /** The Effector's unique identifier */
    readonly id: EffectorId
    /** The custom state for this Effector */
    readonly state: S
    /** The current status of the Effector */
    readonly status: EffectorStatus
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