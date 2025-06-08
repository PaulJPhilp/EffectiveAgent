import { EffectiveError } from "@/errors.js";
import { AgentRuntimeId } from "./types.js";
/**
 * Common interface for agent runtime error properties.
 */
export interface AgentRuntimeErrorProps {
    readonly agentRuntimeId: AgentRuntimeId;
    readonly message: string;
    readonly cause?: unknown;
}
/**
 * Base error class for agent runtime related errors.
 */
export declare class AgentRuntimeError extends EffectiveError {
    readonly agentRuntimeId: AgentRuntimeId;
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when an agent runtime instance is not found.
 */
export declare class AgentRuntimeNotFoundError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when trying to interact with a terminated agent runtime.
 */
export declare class AgentRuntimeTerminatedError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when a mailbox operation fails.
 */
export declare class MailboxError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when the agent runtime is in an invalid state.
 */
export declare class InvalidStateError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when there is a configuration issue with the agent runtime.
 */
export declare class ConfigurationError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when there is an issue with the agent workflow processing.
 */
export declare class ProcessingError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps);
}
/**
 * Error thrown when message processing fails for a specific activity.
 */
export declare class AgentRuntimeProcessingError extends AgentRuntimeError {
    readonly activityId: string;
    readonly cause?: unknown;
    constructor(props: AgentRuntimeErrorProps & {
        activityId: string;
    });
}
/**
 * Error thrown when there is an issue initializing the agent runtime.
 */
export declare class AgentRuntimeInitializationError extends EffectiveError {
    readonly _tag = "AgentRuntimeInitializationError";
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map