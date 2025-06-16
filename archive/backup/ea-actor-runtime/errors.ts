import { EffectiveError } from "@/errors.js"

export class AgentRuntimeProcessingError extends EffectiveError {
    readonly agentRuntimeId: string
    readonly activityId: string

    constructor(params: {
        agentRuntimeId: string
        activityId: string
        message: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: "actor-runtime",
            method: "processing",
            cause: params.cause
        })
        this.agentRuntimeId = params.agentRuntimeId
        this.activityId = params.activityId
    }
}

export class AgentRuntimeError extends EffectiveError {
    readonly agentRuntimeId: string

    constructor(params: {
        agentRuntimeId: string
        message: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: "actor-runtime",
            method: "runtime",
            cause: params.cause
        })
        this.agentRuntimeId = params.agentRuntimeId
    }
} 