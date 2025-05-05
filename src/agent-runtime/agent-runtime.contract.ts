import { Effect, Stream } from "effect"
import { AgentRuntimeError, AgentRuntimeNotFoundError, AgentRuntimeTerminatedError } from "./agent-runtime.errors.js"
import type { AgentActivity, AgentRuntimeId, AgentRuntimeState } from "./agent-runtime.types.js"

/**
 * Core interface for an individual AgentRuntime instance.
 * Represents the public API for interacting with a running agent.
 * 
 * @template S The type of the agent's internal state
 */
export interface AgentRuntime<S = unknown> {
    /** The unique identifier for this AgentRuntime instance */
    readonly id: AgentRuntimeId

    /**
     * Sends an AgentActivity to this agent's mailbox for processing.
     * 
     * @param activity - The activity to send
     * @returns Effect<void> that succeeds when the activity is queued, or fails with Queue.EnqueueError
     */
    readonly send: (activity: AgentActivity) => Effect.Effect<void, Error>

    /**
     * Gets the current state of this agent.
     * 
     * @returns Effect<AgentRuntimeState<S>> containing the current state
     */
    readonly getState: () => Effect.Effect<AgentRuntimeState<S>, Error>

    /**
     * Subscribes to all activities processed by this agent.
     * 
     * @returns A Stream of AgentActivity records
     */
    readonly subscribe: () => Stream.Stream<AgentActivity, Error>
}

/**
 * The main AgentRuntime service API.
 * Provides capabilities for creating and managing agent runtime instances.
 */
export interface AgentRuntimeServiceApi {
    /**
     * Creates a new AgentRuntime instance with the given ID and initial state.
     * 
     * @template S The type of state for the new agent
     * @param id - The unique identifier for the new agent
     * @param initialState - The initial state for the agent
     * @returns Effect<AgentRuntime<S>> containing the new agent instance
     */
    readonly create: <S>(
        id: AgentRuntimeId,
        initialState: S
    ) => Effect.Effect<AgentRuntime<S>, AgentRuntimeError>

    /**
     * Terminates an agent runtime instance, cleaning up its resources.
     * 
     * @param id - The ID of the agent to terminate
     * @returns Effect<void> that succeeds when termination is complete
     */
    readonly terminate: (
        id: AgentRuntimeId
    ) => Effect.Effect<void, AgentRuntimeNotFoundError>

    /**
     * Sends an AgentActivity to the specified agent.
     * 
     * @param id - The ID of the target agent
     * @param activity - The activity to send
     * @returns Effect<void> that succeeds when the activity is queued
     */
    readonly send: (
        id: AgentRuntimeId,
        activity: AgentActivity
    ) => Effect.Effect<void, AgentRuntimeNotFoundError | AgentRuntimeTerminatedError | Error>

    /**
     * Gets the current state of an agent.
     * 
     * @template S The expected state type of the agent
     * @param id - The ID of the agent
     * @returns Effect<AgentRuntimeState<S>> containing the current state
     */
    readonly getState: <S>(
        id: AgentRuntimeId
    ) => Effect.Effect<AgentRuntimeState<S>, AgentRuntimeNotFoundError>

    /**
     * Gets a Stream of all activities processed by the specified agent.
     * 
     * @param id - The ID of the agent to subscribe to
     * @returns A Stream of AgentActivity records from the specified agent
     */
    readonly subscribe: (
        id: AgentRuntimeId
    ) => Stream.Stream<AgentActivity, Error>
}