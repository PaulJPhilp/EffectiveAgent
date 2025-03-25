/**
 * Base state interface for agent nodes
 */
export interface AgentState {
    readonly status: string
    readonly error?: string
    readonly errorCount: number
    readonly completedSteps: string[]
    readonly logs: string[]
} 