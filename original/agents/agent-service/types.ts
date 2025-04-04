import type { z } from 'zod'
import type { AgentConfigSchema, AgentRunSchema } from './schema.js'

export interface ChannelReducer<T> {
    reducer: (a: T, b: T) => T
}

export interface AgentErrors {
    readonly errors: string[]
    readonly errorCount: number
}

export interface NodeStatus {
    readonly nodeId: string
    readonly status: 'entering' | 'running' | 'completed' | 'error'
    readonly timestamp: string
    readonly details?: string
}

export interface AgentStatus {
    overallStatus?: 'running' | 'completed' | 'error'
    nodeHistory: Array<{
        nodeId: string
        status: 'completed' | 'error'
        error?: string
        timestamp: string
    }>
    currentNode?: string
}

export interface AgentLogs {
    readonly logs: string[]
    readonly logCount: number
}

export type AgentRun = z.infer<typeof AgentRunSchema>

export type AgentConfigType = z.infer<typeof AgentConfigSchema>

export interface AgentConfig extends AgentConfigType { }

export interface AgentState<I, O, A> {
    readonly config: AgentConfig
    readonly agentRun: AgentRun
    readonly status: AgentStatus
    readonly logs: AgentLogs
    readonly errors: AgentErrors
    readonly input: I
    readonly output: O
    readonly agentState: A
} 