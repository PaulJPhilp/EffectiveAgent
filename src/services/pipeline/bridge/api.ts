import { EffectorError, EffectorNotFoundError } from "@/effectors/effector/errors.js";
import type { AgentRecord, EffectorId, EffectorState } from "@/effectors/effector/types.js";
import { Effect, Stream } from "effect";

/**
 * Simple bridge API for connecting external apps to Effectors
 */
export interface BridgeServiceApi {
    /**
     * Creates a new Effector instance for handling conversations
     * @returns Effect containing the effector ID
     */
    createEffector(): Effect.Effect<EffectorId, EffectorError>;

    /**
     * Sends a message to an Effector
     * @param id The Effector ID
     * @param message The message to send
     */
    sendMessage(id: EffectorId, message: string): Effect.Effect<void, EffectorNotFoundError | EffectorError>;

    /**
     * Gets the current state of an Effector
     * @param id The Effector ID
     */
    getState<S>(id: EffectorId): Effect.Effect<EffectorState<S>, EffectorNotFoundError>;

    /**
     * Subscribes to messages from an Effector
     * @param id The Effector ID
     * @returns A Stream of AgentRecords
     */
    subscribe(id: EffectorId): Stream.Stream<AgentRecord, Error>;

    /**
     * Terminates an Effector instance
     * @param id The Effector ID
     */
    terminate(id: EffectorId): Effect.Effect<void, EffectorNotFoundError>;
}