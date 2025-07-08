/**
 * @file Service contract for the ActorRuntimeService
 * @module ea-actor-runtime/api
 */

import { Effect, Queue } from "effect"
import { AgentRuntimeError, AgentRuntimeProcessingError } from "./errors.js"
import { AgentActivity, AgentRuntimeId, AgentRuntimeState, AgentWorkflow } from "./types.js"

/**
 * Service contract for managing agent actor runtimes with mailbox-based message processing.
 */
export interface AgentRuntimeServiceApi {
    /**
     * Registers a new agent workflow by name.
     */
    readonly register: <S>(
        agentType: string,
        workflow: AgentWorkflow<S, AgentRuntimeProcessingError>
    ) => Effect.Effect<void, never>

    /**
     * Creates a new ActorRuntime instance.
     */
    readonly create: <S>(
        id: AgentRuntimeId,
        agentType: string,
        initialState: S
    ) => Effect.Effect<{
        readonly id: AgentRuntimeId
        readonly send: (activity: AgentActivity) => Effect.Effect<void, Error>
        readonly getState: () => Effect.Effect<AgentRuntimeState<S>, Error>
        readonly subscribe: (queue: Queue.Queue<AgentActivity>) => Effect.Effect<() => Effect.Effect<void>, Error>
        readonly terminate: () => Effect.Effect<void, AgentRuntimeError>
    }, AgentRuntimeError>

    /**
     * Terminates an existing ActorRuntime instance.
     */
    readonly terminate: (id: AgentRuntimeId) => Effect.Effect<void, AgentRuntimeError>

    /**
     * Sends an activity to the specified ActorRuntime.
     */
    readonly send: (
        id: AgentRuntimeId,
        activity: AgentActivity
    ) => Effect.Effect<void, AgentRuntimeError>

    /**
     * Gets the current state of an ActorRuntime.
     */
    readonly getState: <S>(
        id: AgentRuntimeId
    ) => Effect.Effect<AgentRuntimeState<S>, AgentRuntimeError>
} 