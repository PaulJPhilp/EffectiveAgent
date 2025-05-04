// src/effector/effector.contract.ts

import { Effect, Queue, Stream } from "effect"
import type { AgentRecord, EffectorId, EffectorState } from "./types.js"
import { EffectorError, EffectorNotFoundError, EffectorTerminatedError } from "./errors.js"

/**
 * Core interface for an individual Effector instance.
 * Represents the public API for interacting with a running Effector.
 * 
 * @template S The type of the Effector's internal state
 */
export interface Effector<S = unknown> {
    /** The unique identifier for this Effector instance */
    readonly id: EffectorId

    /**
     * Sends an AgentRecord to this Effector's mailbox for processing.
     * 
     * @param record - The record to send
     * @returns Effect<void> that succeeds when the record is queued, or fails with Queue.EnqueueError
     */
    readonly send: (record: AgentRecord) => Effect.Effect<void, Error>

    /**
     * Gets the current state of this Effector.
     * 
     * @returns Effect<EffectorState<S>> containing the current state
     */
    readonly getState: () => Effect.Effect<EffectorState<S>, Error>

    /**
     * Subscribes to all records processed by this Effector.
     * 
     * @returns A Stream of AgentRecords
     */
    readonly subscribe: () => Stream.Stream<AgentRecord, Error>
}

/**
 * The main Effector service API.
 * Provides capabilities for creating and managing Effector instances.
 */
export interface EffectorServiceApi {
    /**
     * Creates a new Effector instance with the given ID and initial state.
     * 
     * @template S The type of state for the new Effector
     * @param id - The unique identifier for the new Effector
     * @param initialState - The initial state for the Effector
     * @returns Effect<Effector<S>> containing the new Effector instance
     */
    readonly create: <S>(
        id: EffectorId,
        initialState: S
    ) => Effect.Effect<Effector<S>, EffectorError>

    /**
     * Terminates an Effector, cleaning up its resources.
     * 
     * @param id - The ID of the Effector to terminate
     * @returns Effect<void> that succeeds when termination is complete
     */
    readonly terminate: (
        id: EffectorId
    ) => Effect.Effect<void, EffectorNotFoundError>

    /**
     * Sends an AgentRecord to the specified Effector.
     * 
     * @param id - The ID of the target Effector
     * @param record - The record to send
     * @returns Effect<void> that succeeds when the record is queued
     */
    readonly send: (
        id: EffectorId,
        record: AgentRecord
    ) => Effect.Effect<void, EffectorNotFoundError | EffectorTerminatedError | Error>

    /**
     * Gets the current state of an Effector.
     * 
     * @template S The expected state type of the Effector
     * @param id - The ID of the Effector
     * @returns Effect<EffectorState<S>> containing the current state
     */
    readonly getState: <S>(
        id: EffectorId
    ) => Effect.Effect<EffectorState<S>, EffectorNotFoundError>

    /**
     * Gets a Stream of all records processed by the specified Effector.
     * 
     * @param id - The ID of the Effector to subscribe to
     * @returns A Stream of AgentRecords from the specified Effector
     */
    readonly subscribe: (
        id: EffectorId
    ) => Stream.Stream<AgentRecord, Error>
}
