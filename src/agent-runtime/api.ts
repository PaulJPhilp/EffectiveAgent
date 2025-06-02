import { EffectiveError } from "@/errors.js"
import type { ModelServiceApi } from "@/services/ai/model/api.js"
import type { PolicyServiceApi } from "@/services/ai/policy/api.js"
import type { ProviderServiceApi } from "@/services/ai/provider/api.js"
import type { ToolRegistry } from "@/services/ai/tool-registry/api.js"
import type { FileServiceApi } from "@/services/core/file/api.js"
import { Effect, Stream } from "effect"
import { AgentRuntimeError, AgentRuntimeNotFoundError, AgentRuntimeTerminatedError } from "./errors.js"
import { AgentActivity, AgentRuntimeId, AgentRuntimeState } from "./types.js"

import type { LangGraphAgentState } from "./langgraph-support/types.js"

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
 * Provides capabilities for creating and managing AgentRuntime instances,
 * as well as accessing configured services.
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

    // Service access methods

    /**
     * Gets the configured ModelService instance.
     * 
     * @returns Effect<ModelServiceApi> containing the configured ModelService
     */
    readonly getModelService: () => Effect.Effect<ModelServiceApi, never>

    /**
     * Gets the configured ProviderService instance.
     * 
     * @returns Effect<ProviderServiceApi> containing the configured ProviderService
     */
    readonly getProviderService: () => Effect.Effect<ProviderServiceApi, never>

    /**
     * Gets the configured PolicyService instance.
     * 
     * @returns Effect<PolicyServiceApi> containing the configured PolicyService
     */
    readonly getPolicyService: () => Effect.Effect<PolicyServiceApi, never>

    /**
     * Gets the configured ToolRegistryService instance.
     * 
     * @returns Effect<ToolRegistry> containing the configured ToolRegistryService
     */
    readonly getToolRegistryService: () => Effect.Effect<ToolRegistry, never>

    /**
     * Gets the configured FileService instance.
     * 
     * @returns Effect<FileServiceApi> containing the configured FileService
     */
    readonly getFileService: () => Effect.Effect<FileServiceApi, never>

    /**
     * Creates a new LangGraph-based AgentRuntime instance.
     * 
     * @template TState The type of state for the LangGraph agent, must extend LangGraphAgentState
     * @param compiledGraph - The compiled LangGraph object with an invoke method
     * @param initialState - The initial state for the LangGraph agent
     * @param langGraphRunOptions - Optional parameters for LangGraph invoke calls
     * @returns Effect containing the new AgentRuntime instance and its ID
     */
    readonly createLangGraphAgent: <TState extends LangGraphAgentState>(
        compiledGraph: {
            invoke: (
                state: TState,
                options?: { configurable?: Record<string, any>;[key: string]: any }
            ) => Promise<TState | AsyncIterable<TState>>
        },
        initialState: TState,
        langGraphRunOptions?: { recursionLimit?: number;[key: string]: any }
    ) => Effect.Effect<
        { agentRuntime: AgentRuntime<TState>; agentRuntimeId: AgentRuntimeId },
        AgentRuntimeError
    >

    /**
     * Executes an Effect and returns a Promise of its result.
     * Primary bridge for LangGraph nodes to execute Effect-based logic.
     * 
     * @template Output The expected output type of the Effect
     * @template LogicError The error type of the Effect, defaults to EffectiveError
     * @param logicToRun The Effect to execute
     * @returns Promise that resolves with the Effect's output or rejects with EffectiveError
     */
    readonly run: <Output, LogicError = EffectiveError>(
        logicToRun: Effect.Effect<Output, LogicError, any>
    ) => Promise<Output>
}
