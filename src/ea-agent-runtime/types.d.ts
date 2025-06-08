import { ModelServiceApi, ProviderServiceApi } from "@/services/ai/index.js";
import { PolicyServiceApi } from "@/services/ai/policy/api.js";
import { ConfigurationServiceApi } from "@/services/core/configuration/api.js";
import { Brand, Effect, Stream } from "effect";
/**
 * Message priority levels for the mailbox system.
 */
export declare const MessagePriority: {
    readonly HIGH: 0;
    readonly NORMAL: 1;
    readonly LOW: 2;
    readonly BACKGROUND: 3;
};
export type MessagePriority = typeof MessagePriority[keyof typeof MessagePriority];
/**
 * Configuration for an AgentRuntime instance.
 */
export interface AgentRuntimeConfig {
    readonly mailbox: MailboxConfig;
    readonly processing: ProcessingConfig;
}
/**
 * Unique identifier for an AgentRuntime instance.
 * Using a branded type for type-safety and to prevent accidental string usage.
 */
export type AgentRuntimeId = Brand.Branded<string, "AgentRuntimeId">;
/**
 * Creates a new AgentRuntimeId from a string.
 */
export declare const makeAgentRuntimeId: (id: string) => AgentRuntimeId;
/**
 * The type of activity being processed.
 * This helps determine how to handle the activity's payload.
 */
export declare const AgentActivityType: {
    readonly COMMAND: "COMMAND";
    readonly EVENT: "EVENT";
    readonly QUERY: "QUERY";
    readonly RESPONSE: "RESPONSE";
    readonly ERROR: "ERROR";
    readonly STATE_CHANGE: "STATE_CHANGE";
    readonly SYSTEM: "SYSTEM";
};
export type AgentActivityType = typeof AgentActivityType[keyof typeof AgentActivityType];
/**
 * The type of record being processed by the agent runtime.
 * This helps determine how to handle the record's payload.
 */
export declare const AgentRecordType: {
    readonly COMMAND: "COMMAND";
    readonly EVENT: "EVENT";
    readonly QUERY: "QUERY";
    readonly RESPONSE: "RESPONSE";
    readonly ERROR: "ERROR";
    readonly STATE_CHANGE: "STATE_CHANGE";
    readonly SYSTEM: "SYSTEM";
};
export type AgentRecordType = typeof AgentRecordType[keyof typeof AgentRecordType];
/**
 * Represents a message that can be sent to or from an AgentRuntime.
 * This is the primary unit of communication in the system.
 */
export interface AgentActivity {
    /** Unique identifier for this activity */
    readonly id: string;
    /** The AgentRuntime this activity is associated with */
    readonly agentRuntimeId: AgentRuntimeId;
    /** When this activity was created */
    readonly timestamp: number;
    /** The type of activity */
    readonly type: AgentActivityType;
    /** The actual data being conveyed */
    readonly payload: unknown;
    /** Sequence number for ordering activities */
    readonly sequence: number;
    /** Additional context about this activity */
    readonly metadata: {
        /** The AgentRuntime that created this activity (if different from agentRuntimeId) */
        readonly sourceAgentRuntimeId?: AgentRuntimeId;
        /** The correlation ID for tracking related activities */
        readonly correlationId?: string;
        /** Whether this activity has been processed */
        readonly processed?: boolean;
        /** Whether this activity has been persisted */
        readonly persisted?: boolean;
        /** Message priority for processing order */
        readonly priority?: MessagePriority;
        /** When the message should be processed (timestamp) */
        readonly scheduledFor?: number;
        /** Maximum time to wait for processing before failing */
        readonly timeout?: number;
        /** Custom metadata fields */
        readonly [key: string]: unknown;
    };
}
/**
 * Represents a message that can be sent to or from an AgentRuntime.
 * This is the primary unit of communication in the system (record variant).
 */
export interface AgentRecord {
    /** Unique identifier for this record */
    readonly id: string;
    /** The AgentRuntime this record is associated with */
    readonly agentRuntimeId: AgentRuntimeId;
    /** When this record was created */
    readonly timestamp: number;
    /** The type of record */
    readonly type: AgentRecordType;
    /** The actual data being conveyed */
    readonly payload: unknown;
    /** Additional context about this record */
    readonly metadata: {
        /** The AgentRuntime that created this record (if different from agentRuntimeId) */
        readonly sourceAgentRuntimeId?: AgentRuntimeId;
        /** The correlation ID for tracking related records */
        readonly correlationId?: string;
        /** Whether this record has been processed */
        readonly processed?: boolean;
        /** Whether this record has been persisted */
        readonly persisted?: boolean;
        /** Message priority for processing order */
        readonly priority?: MessagePriority;
        /** When the message should be processed (timestamp) */
        readonly scheduledFor?: number;
        /** Maximum time to wait for processing before failing */
        readonly timeout?: number;
        /** Custom metadata fields */
        readonly [key: string]: unknown;
    };
}
/**
 * The possible states an AgentRuntime can be in.
 */
export declare const AgentRuntimeStatus: {
    readonly IDLE: "IDLE";
    readonly PROCESSING: "PROCESSING";
    readonly ERROR: "ERROR";
    readonly TERMINATED: "TERMINATED";
};
export type AgentRuntimeStatus = typeof AgentRuntimeStatus[keyof typeof AgentRuntimeStatus];
/**
 * Function that processes an AgentActivity and current state to produce a new state.
 * This is the core logic that defines an AgentRuntime's behavior.
 */
export type AgentWorkflow<S, E = never, R = never> = (activity: AgentActivity, state: S) => Effect.Effect<S, E, R>;
/**
 * Internal state for an AgentRuntime instance.
 */
export interface AgentRuntimeState<S> {
    /** The AgentRuntime's unique identifier */
    readonly id: AgentRuntimeId;
    /** The custom state for this AgentRuntime */
    readonly state: S;
    /** The current status of the AgentRuntime */
    readonly status: AgentRuntimeStatus;
    /** When this state was last updated */
    readonly lastUpdated: number;
    /** Any error information if status is ERROR */
    readonly error?: unknown;
    /** Processing statistics */
    readonly processing?: {
        /** Number of messages processed */
        readonly processed: number;
        /** Number of messages that failed */
        readonly failures: number;
        /** Average processing time in milliseconds */
        readonly avgProcessingTime: number;
        /** Last error encountered during processing */
        readonly lastError?: unknown;
    };
    /** Mailbox statistics */
    readonly mailbox?: {
        /** Current number of messages in the mailbox */
        readonly size: number;
        /** Number of messages processed */
        readonly processed: number;
        /** Number of messages that timed out */
        readonly timeouts: number;
        /** Average processing time in milliseconds */
        readonly avgProcessingTime: number;
    };
}
export interface MailboxConfig {
    size: number;
    priorityQueueSize: number;
    enablePrioritization: boolean;
}
export interface ProcessingConfig {
    maxConcurrent: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
}
export interface Mailbox {
    offer: (activity: AgentActivity) => Effect.Effect<void, Error>;
    take: () => Effect.Effect<AgentActivity, Error>;
    size: () => number;
    clear: () => Effect.Effect<void, never>;
    subscribe: () => Stream.Stream<AgentActivity, Error>;
}
export type StateReducer<S> = (activity: AgentActivity, state: S) => Effect.Effect<S, Error>;
export interface AgentRuntime<S> {
    readonly id: AgentRuntimeId;
    readonly state: Effect.Effect<S, Error>;
    send: (activity: AgentActivity) => Effect.Effect<void, Error>;
}
export interface AgentRuntimeFactory {
    create: <S>(id: AgentRuntimeId, initialState: S, reducer: StateReducer<S>, config?: Partial<AgentRuntimeConfig>) => Effect.Effect<AgentRuntime<S>, Error>;
}
/**
 * Initializes the AgentRuntime system with the provided master configuration.
 * This sets up all required services and creates the Effect runtime.
 */
export type RuntimeServices = {
    readonly configurationService: ConfigurationServiceApi;
    readonly providerService: ProviderServiceApi;
    readonly modelService: ModelServiceApi;
    readonly policyService: PolicyServiceApi;
};
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
    invoke: (state: TState, options?: {
        configurable?: Record<string, any>;
        [key: string]: any;
    }) => Promise<TState | AsyncIterable<TState>>;
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
//# sourceMappingURL=types.d.ts.map