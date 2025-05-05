import {
    AgentRuntime,
    AgentRuntimeId,
    AgentRuntimeService
} from "@/agent-runtime/index.js"
import { Effect, pipe } from "effect"

/**
 * Commands that can be sent to the counter
 */
export const CounterCommand = {
    INCREMENT: "INCREMENT",
    DECREMENT: "DECREMENT",
    RESET: "RESET"
} as const

export type CounterCommand = typeof CounterCommand[keyof typeof CounterCommand]

/**
 * State maintained by the counter
 */
export interface CounterState {
    count: number
    lastOperation?: CounterCommand
    lastUpdated?: number
}

/**
 * Creates a new counter agent runtime instance
 */
export const createCounterRuntime = (
    id: AgentRuntimeId,
    initialCount = 0
): Effect.Effect<AgentRuntime<CounterState>> => {
    // Initial state
    const initialState: CounterState = {
        count: initialCount
    }

    // Create and return the agent runtime instance
    return pipe(
        AgentRuntimeService,
        Effect.flatMap(service =>
            service.create(id, initialState)
        )
    )
}