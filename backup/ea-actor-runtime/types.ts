
import type { Effect } from "effect"

export interface AgentActivity {
    agentRuntimeId: string
    type: string
    payload: any
    sequence: number
    timestamp: number
    metadata: {
        priority?: number
        timeout?: number
    }
}

export enum MessagePriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}

export enum AgentActivityType {
    STATE_CHANGE = "STATE_CHANGE",
    COMMAND = "COMMAND"
}

export enum AgentRuntimeStatus {
    IDLE = "IDLE",
    PROCESSING = "PROCESSING",
    ERROR = "ERROR"
}

export interface AgentRuntimeState<S> {
    id: string
    state: S
    status: AgentRuntimeStatus
    lastUpdated: number
    processing?: {
        processed: number
        failures: number
        avgProcessingTime: number
        lastError?: any
    }
    error?: any
}

export type AgentRuntimeId = string

export function makeAgentRuntimeId(id: string): AgentRuntimeId {
    return id
}


export type AgentWorkflow<S, E> = (activity: AgentActivity, state: S) => Effect.Effect<S, E>