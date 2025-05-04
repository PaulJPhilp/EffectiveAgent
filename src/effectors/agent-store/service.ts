import { EffectorId } from "@/effectors/effector/types.js"
import { Dexie, liveQuery } from "dexie"
import { Effect } from "effect"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import { Observable, from } from "rxjs"
import type { AgentStoreApi, RecordQueryOptions } from "./api.js"
import { DatabaseError, RecordNotFoundError, ValidationError } from "./errors.js"
import type { AgentRecord, SyncState } from "./types.js"

class AgentStoreDb extends Dexie {
    agentRecords!: Dexie.Table<AgentRecord, string>

    constructor() {
        super("AgentStore")
        this.version(1).stores({
            agentRecords: "id, effectorId, metadata.timestamp, metadata.syncState"
        })
    }
}

/**
 * Service for managing agent records in IndexedDB storage
 */
export class AgentStore extends Effect.Service<AgentStoreApi>()("AgentStore", {
    effect: Effect.gen(function* () {
        const db = new AgentStoreDb()

        const addRecord = (record: AgentRecord): Effect.Effect<void, DatabaseError | ValidationError> =>
            Effect.gen(function* () {
                if (!record.id || !record.effectorId) {
                    return yield* Effect.fail(new ValidationError("Record must have id and effectorId"))
                }
                yield* Effect.tryPromise({
                    try: () => db.agentRecords.put(record),
                    catch: (e) => new DatabaseError("Failed to add record", { cause: e })
                })
            })

        const addRecords = (records: ReadonlyArray<AgentRecord>): Effect.Effect<void, DatabaseError | ValidationError> =>
            Effect.gen(function* () {
                for (const record of records) {
                    if (!record.id || !record.effectorId) {
                        return yield* Effect.fail(new ValidationError("All records must have id and effectorId"))
                    }
                }
                yield* Effect.tryPromise({
                    try: () => db.agentRecords.bulkPut(records),
                    catch: (e) => new DatabaseError("Failed to add records", { cause: e })
                })
            })

        const getRecords = (effectorId: EffectorId, options?: RecordQueryOptions): Effect.Effect<readonly AgentRecord[], DatabaseError> =>
            Effect.tryPromise({
                try: () => {
                    let query = db.agentRecords.where("effectorId").equals(effectorId)

                    if (options?.fromTimestamp) {
                        query = query.filter(r => r.metadata.timestamp >= options.fromTimestamp!)
                    }
                    if (options?.toTimestamp) {
                        query = query.filter(r => r.metadata.timestamp <= options.toTimestamp!)
                    }
                    if (options?.syncState) {
                        const states = Array.isArray(options.syncState) ? options.syncState : [options.syncState]
                        query = query.filter(r => states.includes(r.metadata.syncState))
                    }
                    if (options?.reverse) {
                        query = query.reverse()
                    }
                    if (options?.limit) {
                        query = query.limit(options.limit)
                    }

                    return query.toArray()
                },
                catch: (e) => new DatabaseError("Failed to get records", { cause: e })
            })

        const getRecordById = (recordId: string): Effect.Effect<Option.Option<AgentRecord>, DatabaseError> =>
            Effect.tryPromise({
                try: async () => {
                    const record = await db.agentRecords.get(recordId)
                    return record ? Option.some(record) : Option.none()
                },
                catch: (e) => new DatabaseError("Failed to get record by id", { cause: e })
            })

        const updateRecordSyncState = (
            recordId: string,
            syncState: SyncState,
            updatedMetadata?: Partial<AgentRecord["metadata"]>
        ): Effect.Effect<void, DatabaseError | RecordNotFoundError> =>
            Effect.gen(function* () {
                const record = yield* Effect.tryPromise({
                    try: () => db.agentRecords.get(recordId),
                    catch: (e) => new DatabaseError("Failed to get record for update", { cause: e })
                })

                if (!record) {
                    return yield* Effect.fail(new RecordNotFoundError(recordId))
                }

                const newMetadata = {
                    ...record.metadata,
                    ...updatedMetadata,
                    syncState
                }

                yield* Effect.tryPromise({
                    try: () => db.agentRecords.update(recordId, { metadata: newMetadata }),
                    catch: (e) => new DatabaseError("Failed to update record sync state", { cause: e })
                })
            })

        const getRecordsBySyncState = (syncState: SyncState, limit?: number): Effect.Effect<readonly AgentRecord[], DatabaseError> =>
            Effect.tryPromise({
                try: () => {
                    let query = db.agentRecords.where("metadata.syncState").equals(syncState)
                    if (limit) {
                        query = query.limit(limit)
                    }
                    return query.toArray()
                },
                catch: (e) => new DatabaseError("Failed to get records by sync state", { cause: e })
            })

        const streamRecords = (effectorId: EffectorId): Stream.Stream<AgentRecord, DatabaseError> =>
            Stream.async<AgentRecord[], DatabaseError>(emit => {
                const subscription = liveQuery(() =>
                    db.agentRecords.where("effectorId").equals(effectorId).toArray()
                ).subscribe({
                    next: records => emit.single(records),
                    error: error => emit.fail(new DatabaseError("Failed to stream records", { cause: error }))
                })
                return Effect.sync(() => subscription.unsubscribe())
            }).pipe(Stream.flatMap(Stream.fromIterable))

        const clearRecords = (effectorId: EffectorId): Effect.Effect<void, DatabaseError> =>
            Effect.tryPromise({
                try: () => db.agentRecords.where("effectorId").equals(effectorId).delete(),
                catch: (e) => new DatabaseError("Failed to clear records", { cause: e })
            })

        const countRecords = (effectorId: EffectorId, options?: RecordQueryOptions): Effect.Effect<number, DatabaseError> =>
            Effect.tryPromise({
                try: () => {
                    let query = db.agentRecords.where("effectorId").equals(effectorId)

                    if (options?.fromTimestamp) {
                        query = query.filter(r => r.metadata.timestamp >= options.fromTimestamp!)
                    }
                    if (options?.toTimestamp) {
                        query = query.filter(r => r.metadata.timestamp <= options.toTimestamp!)
                    }
                    if (options?.syncState) {
                        const states = Array.isArray(options.syncState) ? options.syncState : [options.syncState]
                        query = query.filter(r => states.includes(r.metadata.syncState))
                    }

                    return query.count()
                },
                catch: (e) => new DatabaseError("Failed to count records", { cause: e })
            })

        const getEffectorIds = (): Effect.Effect<readonly EffectorId[], DatabaseError> =>
            Effect.tryPromise({
                try: async () => {
                    const keys = await db.agentRecords.orderBy("effectorId").uniqueKeys()
                    if (!Array.isArray(keys) || !keys.every(key => typeof key === "string")) {
                        throw new Error("Invalid effector IDs returned from database")
                    }
                    return keys as EffectorId[]
                },
                catch: (e) => new DatabaseError("Failed to get effector IDs", { cause: e })
            })

        const getRecord = (id: string): Effect.Effect<AgentRecord, RecordNotFoundError | DatabaseError> =>
            Effect.gen(function* () {
                const record = yield* Effect.tryPromise({
                    try: () => db.agentRecords.get(id),
                    catch: (e) => new DatabaseError("Failed to get record", { cause: e })
                })
                if (!record) {
                    return yield* Effect.fail(new RecordNotFoundError(id))
                }
                return record
            })

        const listRecords = (effectorId?: string): Effect.Effect<AgentRecord[], DatabaseError> =>
            Effect.tryPromise({
                try: () => {
                    const query = effectorId
                        ? db.agentRecords.where("effectorId").equals(effectorId)
                        : db.agentRecords.toCollection()
                    return query.toArray()
                },
                catch: (e) => new DatabaseError("Failed to list records", { cause: e })
            })

        const saveRecord = (record: AgentRecord): Effect.Effect<void, ValidationError | DatabaseError> =>
            addRecord(record)

        const deleteRecord = (id: string): Effect.Effect<void, DatabaseError> =>
            Effect.tryPromise({
                try: () => db.agentRecords.delete(id),
                catch: (e) => new DatabaseError("Failed to delete record", { cause: e })
            })

        const observeRecord = (id: string): Effect.Effect<Observable<AgentRecord>, DatabaseError> =>
            Effect.gen(function* () {
                return from(liveQuery(async () => {
                    const record = await db.agentRecords.get(id)
                    if (!record) throw new RecordNotFoundError(id)
                    return record
                }))
            })

        return {
            getRecord,
            listRecords,
            saveRecord,
            deleteRecord,
            observeRecord,
            addRecord,
            addRecords,
            getRecords,
            getRecordById,
            updateRecordSyncState,
            getRecordsBySyncState,
            streamRecords,
            clearRecords,
            countRecords,
            getEffectorIds
        } satisfies AgentStoreApi
    }),
    dependencies: []
}) { }
