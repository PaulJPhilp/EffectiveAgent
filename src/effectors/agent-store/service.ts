import { AgentRecord, AgentRuntimeId } from "@/agent-runtime/index.js"
import { Effect, Stream, pipe } from "effect"
import { ValidationError } from "./errors.js"
import type { DatabaseError } from "./types.js"

export interface RecordQueryOptions {
    /** Only return records after this timestamp */
    afterTimestamp?: number
    /** Filter by sync state */
    syncState?: string
    /** Maximum number of records to return */
    limit?: number
}

/**
 * Creates database schema
 */
const createSchema = (db: AgentStoreDb) => {
    db.version(1).stores({
        agentRecords: "id, agentRuntimeId, metadata.timestamp, metadata.syncState"
    })
}

/**
 * Creates a new instance of the store service
 */
export const AgentStoreService = Effect.async<StoreService>(resume => {
    // Create database instance
    const db = new Dexie("agent-store") as AgentStoreDb

    // Set up schema
    createSchema(db)

    // Create service instance
    const service: StoreService = {
        storeRecord: (record: AgentRecord): Effect.Effect<void, ValidationError | DatabaseError> =>
            Effect.try({
                try: () => {
                    if (!record.id || !record.agentRuntimeId) {
                        return Effect.fail(new ValidationError("Record must have id and agentRuntimeId"))
                    }
                    return db.agentRecords.add(record)
                },
                catch: error => new DatabaseError("Failed to store record", { cause: error })
            }),

        storeRecords: (records: AgentRecord[]): Effect.Effect<void, ValidationError | DatabaseError> =>
            Effect.try({
                try: () => {
                    // Validate all records first
                    for (const record of records) {
                        if (!record.id || !record.agentRuntimeId) {
                            return Effect.fail(new ValidationError("All records must have id and agentRuntimeId"))
                        }
                    }
                    return db.agentRecords.bulkAdd(records)
                },
                catch: error => new DatabaseError("Failed to store records", { cause: error })
            }),

        getRecords: (agentRuntimeId: AgentRuntimeId, options?: RecordQueryOptions): Effect.Effect<readonly AgentRecord[], DatabaseError> =>
            Effect.try({
                try: () => {
                    let query = db.agentRecords.where("agentRuntimeId").equals(agentRuntimeId)

                    // Apply filters
                    if (options?.afterTimestamp) {
                        query = query
                            .filter(record =>
                                record.timestamp > options.afterTimestamp!
                            )
                    }

                    if (options?.syncState) {
                        query = query
                            .filter(record =>
                                record.metadata.syncState === options.syncState
                            )
                    }

                    // Apply limit
                    if (options?.limit) {
                        query = query.limit(options.limit)
                    }

                    return query.toArray()
                },
                catch: error => new DatabaseError("Failed to get records", { cause: error })
            }),

        streamRecords: (agentRuntimeId: AgentRuntimeId): Stream.Stream<AgentRecord, DatabaseError> =>
            pipe(
                Effect.try({
                    try: () =>
                        db.agentRecords.where("agentRuntimeId").equals(agentRuntimeId).toArray(),
                    catch: error => new DatabaseError("Failed to stream records", { cause: error })
                }),
                Stream.fromEffect,
                Stream.flatMap(Stream.fromIterable)
            ),

        clearRecords: (agentRuntimeId: AgentRuntimeId): Effect.Effect<void, DatabaseError> =>
            Effect.try({
                try: () => db.agentRecords.where("agentRuntimeId").equals(agentRuntimeId).delete(),
                catch: error => new DatabaseError("Failed to clear records", { cause: error })
            })
    }

    // Return service instance
    resume(Effect.succeed(service))
})
