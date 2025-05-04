/**
 * @file Defines the AgentStore API for client-side persistence of AgentRecords.
 */

import { Effect, Option, Stream } from "effect"
import { Observable } from "rxjs"
import type { EffectorId } from "../effectors/effector/types.js"
import { DatabaseError, RecordNotFoundError, ValidationError } from "./errors.js"
import type { AgentRecord, SyncState } from "./types.js"

/**
 * Defines options for querying records from the AgentStore.
 */
export interface RecordQueryOptions {
    readonly fromTimestamp?: number
    readonly toTimestamp?: number
    readonly syncState?: SyncState | readonly SyncState[]
    readonly reverse?: boolean
    readonly limit?: number
}

/**
 * Provides client-side persistence for AgentRecords using IndexedDB storage.
 * 
 * @remarks
 * This service manages the lifecycle of AgentRecords, including:
 * - Persisting records to IndexedDB
 * - Retrieving records with flexible query options
 * - Managing synchronization states
 * - Streaming record updates
 * - Maintaining effector-specific record collections
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const store = yield* AgentStore
 *   yield* store.addRecord(record)
 *   const records = yield* store.getRecords(effectorId)
 * })
 * ```
 */
export interface AgentStoreApi {
    /**
     * Retrieves a single agent record by ID
     * @param id The unique identifier of the record
     * @returns Effect that resolves to the agent record or fails with an error
     */
    readonly getRecord: (id: string) => Effect.Effect<AgentRecord, RecordNotFoundError | DatabaseError>

    /**
     * Lists all agent records, optionally filtered by effectorId
     * @param effectorId Optional effector ID to filter records
     * @returns Effect that resolves to an array of agent records
     */
    readonly listRecords: (effectorId?: string) => Effect.Effect<AgentRecord[], DatabaseError>

    /**
     * Saves an agent record to the store
     * @param record The agent record to save
     * @returns Effect that completes when the save is successful
     */
    readonly saveRecord: (record: AgentRecord) => Effect.Effect<void, ValidationError | DatabaseError>

    /**
     * Deletes an agent record by ID
     * @param id The unique identifier of the record to delete
     * @returns Effect that completes when the deletion is successful
     */
    readonly deleteRecord: (id: string) => Effect.Effect<void, DatabaseError>

    /**
     * Observes changes to a specific agent record
     * @param id The unique identifier of the record to observe
     * @returns Effect that resolves to an Observable of the agent record
     */
    readonly observeRecord: (id: string) => Effect.Effect<Observable<AgentRecord>, DatabaseError>

    /**
     * Adds a single AgentRecord to the store.
     * Sets metadata.persisted = true upon success.
     * 
     * @param record The AgentRecord to add
     * @returns An Effect that completes with void on success
     * @throws ValidationError if record is invalid
     * @throws DatabaseError if storage operation fails
     */
    readonly addRecord: (record: AgentRecord) => Effect.Effect<void, DatabaseError | ValidationError>

    /**
     * Adds multiple AgentRecords to the store in a single transaction.
     * Sets metadata.persisted = true for all records upon success.
     * 
     * @param records Array of AgentRecords to add
     * @returns An Effect that completes with void on success
     * @throws ValidationError if any record is invalid
     * @throws DatabaseError if transaction fails
     */
    readonly addRecords: (records: ReadonlyArray<AgentRecord>) => Effect.Effect<void, DatabaseError | ValidationError>

    /**
     * Retrieves AgentRecords associated with a specific EffectorId,
     * optionally filtered by query options.
     * 
     * @param effectorId The ID of the Effector whose records are requested
     * @param options Optional filtering and ordering parameters
     * @returns An Effect yielding an array of matching AgentRecords
     * @throws DatabaseError if query fails
     */
    readonly getRecords: (effectorId: EffectorId, options?: RecordQueryOptions) => Effect.Effect<readonly AgentRecord[], DatabaseError>

    /**
     * Retrieves a single AgentRecord by its unique ID.
     * 
     * @param recordId The unique ID of the record to retrieve
     * @returns An Effect yielding Option<AgentRecord> (Some if found, None if not)
     * @throws DatabaseError if query fails
     */
    readonly getRecordById: (recordId: string) => Effect.Effect<Option.Option<AgentRecord>, DatabaseError>

    /**
     * Updates the syncState and optional metadata of a specific AgentRecord.
     * 
     * @param recordId The ID of the record to update
     * @param syncState The new synchronization state
     * @param updatedMetadata Optional additional metadata fields to update
     * @returns An Effect that completes with void on success
     * @throws RecordNotFoundError if record doesn't exist
     * @throws DatabaseError if update fails
     */
    readonly updateRecordSyncState: (recordId: string, syncState: SyncState, updatedMetadata?: Partial<AgentRecord["metadata"]>) => Effect.Effect<void, DatabaseError | RecordNotFoundError>

    /**
     * Retrieves all records currently marked with a specific syncState.
     * 
     * @param syncState The syncState to filter by
     * @param limit Optional maximum number of records to return
     * @returns An Effect yielding an array of matching AgentRecords
     * @throws DatabaseError if query fails
     */
    readonly getRecordsBySyncState: (syncState: SyncState, limit?: number) => Effect.Effect<readonly AgentRecord[], DatabaseError>

    /**
     * Provides a Stream of AgentRecords for a specific EffectorId as they are added
     * or updated in the store.
     * 
     * @param effectorId The ID of the Effector to observe
     * @returns A Stream yielding AgentRecords
     */
    readonly streamRecords: (effectorId: EffectorId) => Stream.Stream<AgentRecord, DatabaseError>

    /**
     * Clears all records for a specific EffectorId from the store.
     * 
     * @param effectorId The ID of the Effector whose records should be cleared
     * @returns An Effect that completes with void on success
     * @throws DatabaseError if deletion fails
     */
    readonly clearRecords: (effectorId: EffectorId) => Effect.Effect<void, DatabaseError>

    /**
     * Returns the count of records for a specific EffectorId.
     * 
     * @param effectorId The ID of the Effector whose records should be counted
     * @param options Optional filtering parameters
     * @returns An Effect yielding the count of matching records
     * @throws DatabaseError if query fails
     */
    readonly countRecords: (effectorId: EffectorId, options?: RecordQueryOptions) => Effect.Effect<number, DatabaseError>

    /**
     * Returns all unique EffectorIds in the store.
     * 
     * @returns An Effect yielding an array of unique EffectorIds
     * @throws DatabaseError if query fails
     */
    readonly getEffectorIds: () => Effect.Effect<readonly EffectorId[], DatabaseError>
} 