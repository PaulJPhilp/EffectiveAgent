import { Data } from "effect"

interface AgentErrorOptions {
    message: string
    agentId: string
    cause?: Error
}

interface AgentRateLimitErrorOptions extends AgentErrorOptions {
    retryAfterMs: number
}

export class AgentError extends Data.TaggedError("AgentError")<{
    readonly message: string
    readonly agentId: string
    readonly cause?: Error
}> {
    constructor(options: AgentErrorOptions) {
        super({
            message: options.message,
            agentId: options.agentId,
            cause: options.cause
        })
    }
}

export class AgentImplementationError extends Data.TaggedError("AgentImplementationError")<{
    readonly message: string
    readonly agentId: string
    readonly cause?: Error
}> {
    constructor(options: AgentErrorOptions) {
        super({
            message: options.message,
            agentId: options.agentId,
            cause: options.cause
        })
    }
}

export class AgentRateLimitError extends Data.TaggedError("AgentRateLimitError")<{
    readonly message: string
    readonly agentId: string
    readonly retryAfterMs: number
    readonly cause?: Error
}> {
    constructor(options: AgentRateLimitErrorOptions) {
        super({
            message: options.message,
            agentId: options.agentId,
            retryAfterMs: options.retryAfterMs,
            cause: options.cause
        })
    }
} 