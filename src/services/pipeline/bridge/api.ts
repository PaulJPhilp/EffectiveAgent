import {
    AgentRecord,
    AgentRuntimeId,
    AgentRuntimeState
} from "@/agent-runtime/index.js"
import { BridgeServiceError } from "@/services/pipeline/bridge/errors.js"
import { Effect, Stream } from "effect"

/**
 * API for the Bridge Service.
 * Provides capabilities for message passing between different components.
 */
export interface BridgeServiceApi {
    /**
     * Creates a new agent runtime instance
     * 
     * @returns Effect<AgentRuntimeId> with the ID of the new instance
     */
    readonly createAgentRuntime: () =>
        Effect.Effect<AgentRuntimeId, BridgeServiceError>

    /**
     * Sends a message to an existing agent runtime instance
     * 
     * @param id - The ID of the target instance
     * @param message - The message to send
     */
    readonly sendMessage: (id: AgentRuntimeId, message: string) =>
        Effect.Effect<void, BridgeServiceError>

    /**
     * Gets the current state of an agent runtime instance
     * 
     * @param id - The ID of the instance
     * @returns Effect<AgentRuntimeState<S>> containing the current state
     */
    readonly getState: <S>(id: AgentRuntimeId) =>
        Effect.Effect<AgentRuntimeState<S>, BridgeServiceError>

    /**
     * Subscribes to records from an agent runtime instance
     * 
     * @param id - The ID of the instance to subscribe to
     * @returns Stream of AgentRecords from the instance
     */
    readonly subscribe: (id: AgentRuntimeId) =>
        Stream.Stream<AgentRecord, BridgeServiceError>

    /**
     * Terminates an agent runtime instance
     * 
     * @param id - The ID of the instance to terminate
     */
    readonly terminate: (id: AgentRuntimeId) =>
        Effect.Effect<void, BridgeServiceError>
}