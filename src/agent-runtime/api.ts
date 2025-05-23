import { Effect, Stream } from "effect"
import { AgentRuntimeError, AgentRuntimeNotFoundError, AgentRuntimeTerminatedError } from "./errors.js"
import { AgentActivity, AgentRuntimeState } from "./types.js"
import { AgentRuntimeId } from "./types.js"

/**
 * Core interface for an individual AgentRuntime instance.
 * Represents the public API for interacting with a running AgentRuntime.
 * 
 * @template S The type of the AgentRuntime's internal state
 */
export interface AgentRuntime<S = unknown> {
    /** The unique identifier for this AgentRuntime instance */
    readonly id: AgentRuntimeId

    /**
     * Sends an AgentActivity to this AgentRuntime's mailbox for processing.
     * 
     * @param activity - The activity to send
     * @returns Effect<void> that succeeds when the activity is queued, or fails with Queue.EnqueueError
     */
    readonly send: (activity: AgentActivity) => Effect.Effect<void, Error>

    /**
     * Gets the current state of this AgentRuntime.
     * 
     * @returns Effect<AgentRuntimeState<S>> containing the current state
     */
    readonly getState: () => Effect.Effect<AgentRuntimeState<S>, Error>

    /**
     * Subscribes to all activities processed by this AgentRuntime.
     * 
     * @returns A Stream of AgentActivities
     */
    readonly subscribe: () => Stream.Stream<AgentActivity, Error>
}

/**
 * The main AgentRuntime service API.
 * Provides capabilities for creating and managing AgentRuntime instances.
 */
export interface AgentRuntimeServiceApi {
    /**
     * Creates a new AgentRuntime instance with default processing logic.
     * 
     * @template S The type of state for the new AgentRuntime
     * @template E The error type of the processing logic
     * @template R The environment required by the processing logic
     * @param id - The unique identifier for the new AgentRuntime
     * @param initialState - The initial state for the AgentRuntime
     * @returns Effect<AgentRuntime<S>> containing the new AgentRuntime instance handle
     */
    readonly create: <S, E = never, R = never>(
        id: AgentRuntimeId,
        initialState: S
    ) => Effect.Effect<AgentRuntime<S>, AgentRuntimeError | Error>

    /**
     * Terminates an existing AgentRuntime instance.
     * 
     * @param id - The ID of the AgentRuntime to terminate
     * @returns Effect<void> that succeeds when the AgentRuntime is terminated
     */
    readonly terminate: (
        id: AgentRuntimeId
    ) => Effect.Effect<void, AgentRuntimeNotFoundError | Error>

    /**
     * Sends an AgentActivity to the specified AgentRuntime.
     * 
     * @param id - The ID of the target AgentRuntime
     * @param activity - The activity to send
     * @returns Effect<void> that succeeds when the activity is queued
     */
    readonly send: (
        id: AgentRuntimeId,
        activity: AgentActivity
    ) => Effect.Effect<void, AgentRuntimeNotFoundError | AgentRuntimeTerminatedError | Error>

    /**
     * Gets the current state of an AgentRuntime.
     * 
     * @template S The expected state type of the AgentRuntime
     * @param id - The ID of the AgentRuntime
     * @returns Effect<AgentRuntimeState<S>> containing the current state
     */
    readonly getState: <S>(
        id: AgentRuntimeId
    ) => Effect.Effect<AgentRuntimeState<S>, AgentRuntimeNotFoundError>

    /**
     * Gets a Stream of all activities processed by the specified AgentRuntime.
     * 
     * @param id - The ID of the AgentRuntime to subscribe to
     * @returns A Stream of AgentActivities from the specified AgentRuntime
     */
    readonly subscribe: (
        id: AgentRuntimeId
    ) => Stream.Stream<AgentActivity, Error>
}