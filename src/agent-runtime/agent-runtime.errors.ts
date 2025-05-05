import type { AgentRuntimeId } from "./agent-runtime.types.js"

/**
 * Base error class for AgentRuntime errors
 */
export class AgentRuntimeError extends Error {
    readonly agentRuntimeId: AgentRuntimeId

    constructor({
        agentRuntimeId,
        message
    }: {
        agentRuntimeId: AgentRuntimeId
        message: string
    }) {
        super(message)
        this.name = "AgentRuntimeError"
        this.agentRuntimeId = agentRuntimeId
    }
}

/**
 * Error thrown when attempting to interact with a non-existent AgentRuntime
 */
export class AgentRuntimeNotFoundError extends AgentRuntimeError {
    constructor({
        agentRuntimeId,
        message
    }: {
        agentRuntimeId: AgentRuntimeId
        message: string
    }) {
        super({ agentRuntimeId, message })
        this.name = "AgentRuntimeNotFoundError"
    }
}

/**
 * Error thrown when attempting to interact with a terminated AgentRuntime
 */
export class AgentRuntimeTerminatedError extends AgentRuntimeError {
    readonly terminatedAt: number

    constructor({
        agentRuntimeId,
        message,
        terminatedAt
    }: {
        agentRuntimeId: AgentRuntimeId
        message: string
        terminatedAt: number
    }) {
        super({ agentRuntimeId, message })
        this.name = "AgentRuntimeTerminatedError"
        this.terminatedAt = terminatedAt
    }
}

/**
 * Error thrown when message processing fails
 */
export class AgentRuntimeProcessingError extends AgentRuntimeError {
    readonly activityId: string
    readonly cause?: unknown

    constructor({
        agentRuntimeId,
        activityId,
        message,
        cause
    }: {
        agentRuntimeId: AgentRuntimeId
        activityId: string
        message: string
        cause?: unknown
    }) {
        super({ agentRuntimeId, message })
        this.name = "AgentRuntimeProcessingError"
        this.activityId = activityId
        this.cause = cause
    }
}