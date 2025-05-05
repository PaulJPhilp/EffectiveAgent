import type { AgentRuntimeId } from "./types.js"

/**
 * Base error class for agent runtime related errors
 */
export class AgentRuntimeError extends Error {
    readonly _tag = "AgentRuntimeError"

    constructor(readonly props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props.message)
        this.name = "AgentRuntimeError"
        if (props.cause) {
            this.cause = props.cause
        }
    }
}

/**
 * Error thrown when an agent runtime instance is not found
 */
export class AgentRuntimeNotFoundError extends AgentRuntimeError {
    readonly _tag = "AgentRuntimeNotFoundError"

    constructor(props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props)
        this.name = "AgentRuntimeNotFoundError"
    }
}

/**
 * Error thrown when trying to interact with a terminated agent runtime
 */
export class AgentRuntimeTerminatedError extends AgentRuntimeError {
    readonly _tag = "AgentRuntimeTerminatedError"

    constructor(props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props)
        this.name = "AgentRuntimeTerminatedError"
    }
}

/**
 * Error thrown when a mailbox operation fails
 */
export class MailboxError extends AgentRuntimeError {
    readonly _tag = "MailboxError"

    constructor(props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props)
        this.name = "MailboxError"
    }
}

/**
 * Error thrown when the agent runtime is in an invalid state
 */
export class InvalidStateError extends AgentRuntimeError {
    readonly _tag = "InvalidStateError"

    constructor(props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props)
        this.name = "InvalidStateError"
    }
}

/**
 * Error thrown when there is a configuration issue with the agent runtime
 */
export class ConfigurationError extends AgentRuntimeError {
    readonly _tag = "ConfigurationError"

    constructor(props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props)
        this.name = "ConfigurationError"
    }
}

/**
 * Error thrown when there is an issue with the agent workflow processing
 */
export class ProcessingError extends AgentRuntimeError {
    readonly _tag = "ProcessingError"

    constructor(props: {
        agentRuntimeId: AgentRuntimeId
        message: string
        cause?: unknown
    }) {
        super(props)
        this.name = "ProcessingError"
    }
}