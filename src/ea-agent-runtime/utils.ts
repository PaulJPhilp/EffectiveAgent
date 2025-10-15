import { Effect } from "effect"
import type { AgentRecord, AgentRuntimeId, AgentRuntimeState } from "./types.js"

/**
 * Creates a new AgentRuntime ID with optional namespace
 */
export const makeAgentRuntimeId = (namespace?: string): AgentRuntimeId => {
    const uuid = crypto.randomUUID()
    return (namespace ? `${namespace}:${uuid}` : uuid) as AgentRuntimeId
}

/**
 * Validates an AgentRecord structure
 */
export const validateRecord = (record: AgentRecord): Effect.Effect<void, Error> => {
    return Effect.try({
        try: () => {
            if (!record.id) throw new Error("Record must have an id")
            if (!record.agentRuntimeId) throw new Error("Record must have an agentRuntimeId")
            if (!record.timestamp) throw new Error("Record must have a timestamp")
            if (!record.type) throw new Error("Record must have a type")
            if (!record.payload) throw new Error("Record must have a payload")
            if (!record.metadata) throw new Error("Record must have metadata")
        },
        catch: (error) => new Error(`Invalid record: ${error}`)
    })
}

/**
 * Creates an initial state for a new AgentRuntime instance
 */
export const createInitialState = <S>(
    id: AgentRuntimeId,
    state: S
): AgentRuntimeState<S> => ({
    id,
    state,
    status: "IDLE",
    lastUpdated: Date.now(),
    processing: {
        processed: 0,
        failures: 0,
        avgProcessingTime: 0
    },
    mailbox: {
        size: 0,
        processed: 0,
        timeouts: 0,
        avgProcessingTime: 0
    }
})

/**
 * Updates the state of an AgentRuntime instance with processing metrics
 */
export const updateStateWithMetrics = <S>(
    currentState: AgentRuntimeState<S>,
    processingTime: number,
    isSuccess: boolean
): AgentRuntimeState<S> => ({
    ...currentState,
    lastUpdated: Date.now(),
    processing: {
        processed: (currentState.processing?.processed ?? 0) + (isSuccess ? 1 : 0),
        failures: (currentState.processing?.failures ?? 0) + (isSuccess ? 0 : 1),
        avgProcessingTime: (
            ((currentState.processing?.avgProcessingTime ?? 0) * (currentState.processing?.processed ?? 0) + processingTime) /
            ((currentState.processing?.processed ?? 0) + 1)
        )
    }
})

/**
 * Safely updates AgentRuntime state with error handling
 */
export const updateState = <S>(
    currentState: AgentRuntimeState<S>,
    newState: Partial<AgentRuntimeState<S>>
): Effect.Effect<AgentRuntimeState<S>, Error> => {
    return Effect.try({
        try: () => ({
            ...currentState,
            ...newState,
            lastUpdated: Date.now()
        }),
        catch: (error) => new Error(`Failed to update state: ${error}`)
    })
}