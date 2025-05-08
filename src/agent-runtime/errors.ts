import { EffectiveError } from "@/errors.js"
import type { AgentRuntimeId } from "./types.js"

/**
 * Common interface for agent runtime error properties.
 */
export interface AgentRuntimeErrorProps {
    readonly agentRuntimeId: AgentRuntimeId
    readonly message: string
    readonly cause?: unknown
}

/**
 * Base error class for agent runtime related errors.
 */
export class AgentRuntimeError extends EffectiveError {
    readonly agentRuntimeId: AgentRuntimeId
    constructor(props: AgentRuntimeErrorProps) {
        super({
            description: props.message,
            module: "agent-runtime",
            method: "AgentRuntimeError",
            cause: props.cause
        })
        this.agentRuntimeId = props.agentRuntimeId
    }
}

/**
 * Error thrown when an agent runtime instance is not found.
 */
export class AgentRuntimeNotFoundError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps) {
        super({ ...props, message: props.message })
    }
}

/**
 * Error thrown when trying to interact with a terminated agent runtime.
 */
export class AgentRuntimeTerminatedError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps) {
        super({ ...props, message: props.message })
    }
}

/**
 * Error thrown when a mailbox operation fails.
 */
export class MailboxError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps) {
        super({ ...props, message: props.message })
    }
}

/**
 * Error thrown when the agent runtime is in an invalid state.
 */
export class InvalidStateError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps) {
        super({ ...props, message: props.message })
    }
}

/**
 * Error thrown when there is a configuration issue with the agent runtime.
 */
export class ConfigurationError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps) {
        super({ ...props, message: props.message })
    }
}

/**
 * Error thrown when there is an issue with the agent workflow processing.
 */
export class ProcessingError extends AgentRuntimeError {
    constructor(props: AgentRuntimeErrorProps) {
        super({ ...props, message: props.message })
    }
}

/**
 * Error thrown when message processing fails for a specific activity.
 */
export class AgentRuntimeProcessingError extends AgentRuntimeError {
    readonly activityId: string
    readonly cause?: unknown
    constructor(props: AgentRuntimeErrorProps & { activityId: string }) {
        super(props)
        this.activityId = props.activityId
        this.cause = props.cause
    }
}