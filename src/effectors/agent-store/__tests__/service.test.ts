/**
 * @file Tests for AgentStore service implementation
 */

import { Effect, Layer } from "effect";
import * as Option from "effect/Option";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AgentStore } from "../service.js";
import { AgentStoreApi } from "../api.js";
import { DatabaseError, RecordNotFoundError, ValidationError } from "../errors.js";
import type { AgentRecord, SyncState } from "../types.js";
import { MockDexie } from "./test-utils.js";

// --- Test Setup ---

const createTestRecord = (overrides: Partial<AgentRecord> = {}): AgentRecord => ({
    id: "test-id",
    effectorId: "test-effector",
    data: {},
    metadata: {
        timestamp: Date.now(),
        syncState: "pending" as SyncState
    },
    ...overrides
});

describe("AgentStore", () => {
    let mockDb: MockDexie;
    let testLayer: Layer.Layer<AgentStoreApi>;

    beforeEach(() => {
        mockDb = new MockDexie();
        testLayer = Layer.succeed(AgentStore, mockDb);
    });

    afterEach(() => {
        mockDb.agentRecords = new Map();
    });

    describe("addRecord", () => {
        it("should add a valid record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const record = createTestRecord();
                
                yield* store.addRecord(record);
                
                const stored = mockDb.agentRecords.get(record.id);
                expect(stored).toEqual(record);
            }).pipe(Effect.provide(testLayer))
        );

        it("should fail with ValidationError if record is missing required fields", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const invalidRecord = { 
                    ...createTestRecord(),
                    id: undefined 
                } as unknown as AgentRecord;

                const result = yield* Effect.either(store.addRecord(invalidRecord));
                
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ValidationError);
                }
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("getRecordById", () => {
        it("should return Some(record) for existing record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const record = createTestRecord();
                yield* store.addRecord(record);

                const result = yield* store.getRecordById(record.id);
                
                expect(Option.isSome(result)).toBe(true);
                if (Option.isSome(result)) {
                    expect(result.value).toEqual(record);
                }
            }).pipe(Effect.provide(testLayer))
        );

        it("should return None for non-existent record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const result = yield* store.getRecordById("non-existent");
                
                expect(Option.isNone(result)).toBe(true);
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("updateRecordSyncState", () => {
        it("should update sync state and metadata for existing record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const record = createTestRecord();
                yield* store.addRecord(record);

                yield* store.updateRecordSyncState(record.id, "completed", {
                    timestamp: 1000
                });

                const updated = mockDb.agentRecords.get(record.id);
                expect(updated?.metadata.syncState).toBe("completed");
                expect(updated?.metadata.timestamp).toBe(1000);
            }).pipe(Effect.provide(testLayer))
        );

        it("should fail with RecordNotFoundError for non-existent record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const result = yield* Effect.either(
                    store.updateRecordSyncState("non-existent", "completed")
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(RecordNotFoundError);
                }
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("getRecords", () => {
        it("should filter records by effector ID and options", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ 
                        id: "1", 
                        effectorId: "effector1",
                        metadata: { timestamp: 1000, syncState: "pending" }
                    }),
                    createTestRecord({ 
                        id: "2", 
                        effectorId: "effector1",
                        metadata: { timestamp: 2000, syncState: "completed" }
                    }),
                    createTestRecord({ 
                        id: "3", 
                        effectorId: "effector2",
                        metadata: { timestamp: 1500, syncState: "pending" }
                    })
                ];
                
                for (const record of records) {
                    yield* store.addRecord(record);
                }

                const filtered = yield* store.getRecords("effector1", {
                    fromTimestamp: 1000,
                    toTimestamp: 2000,
                    syncState: "pending"
                });

                expect(filtered).toHaveLength(1);
                expect(filtered[0].id).toBe("1");
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("streamRecords", () => {
        it("should stream records and emit updates", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const record = createTestRecord();
                
                const stream = store.streamRecords(record.effectorId);
                
                // Add record after creating stream
                yield* store.addRecord(record);

                // Get first value from stream
                const chunks = yield* stream.pipe(Effect.take(1));
                expect(chunks[0]).toEqual(record);
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("countRecords", () => {
        it("should count records matching filters", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ 
                        id: "1", 
                        effectorId: "effector1",
                        metadata: { timestamp: 1000, syncState: "pending" }
                    }),
                    createTestRecord({ 
                        id: "2", 
                        effectorId: "effector1",
                        metadata: { timestamp: 2000, syncState: "completed" }
                    })
                ];
                
                for (const record of records) {
                    yield* store.addRecord(record);
                }

                const count = yield* store.countRecords("effector1", {
                    syncState: "pending"
                });

                expect(count).toBe(1);
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("addRecords", () => {
        it("should add multiple records in bulk", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ id: "bulk1", effectorId: "effector1" }),
                    createTestRecord({ id: "bulk2", effectorId: "effector1" })
                ];

                yield* store.addRecords(records);

                expect(mockDb.agentRecords.get("bulk1")).toEqual(records[0]);
                expect(mockDb.agentRecords.get("bulk2")).toEqual(records[1]);
            }).pipe(Effect.provide(testLayer))
        );

        it("should fail with ValidationError if any record is invalid", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ id: "valid" }),
                    createTestRecord({ id: undefined }) as unknown as AgentRecord
                ];

                const result = yield* Effect.either(store.addRecords(records));

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ValidationError);
                }
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("clearRecords", () => {
        it("should clear all records for an effector", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ id: "1", effectorId: "effector1" }),
                    createTestRecord({ id: "2", effectorId: "effector1" }),
                    createTestRecord({ id: "3", effectorId: "effector2" })
                ];
                
                for (const record of records) {
                    yield* store.addRecord(record);
                }

                yield* store.clearRecords("effector1");

                const remaining = yield* store.getRecords("effector1");
                expect(remaining).toHaveLength(0);

                const otherEffector = yield* store.getRecords("effector2");
                expect(otherEffector).toHaveLength(1);
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("getEffectorIds", () => {
        it("should return unique effector IDs", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ id: "1", effectorId: "effector1" }),
                    createTestRecord({ id: "2", effectorId: "effector1" }),
                    createTestRecord({ id: "3", effectorId: "effector2" })
                ];
                
                for (const record of records) {
                    yield* store.addRecord(record);
                }

                const effectorIds = yield* store.getEffectorIds();

                expect(effectorIds).toHaveLength(2);
                expect(effectorIds).toContain("effector1");
                expect(effectorIds).toContain("effector2");
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("getRecordsBySyncState", () => {
        it("should get records by sync state with limit", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const records = [
                    createTestRecord({ 
                        id: "1", 
                        metadata: { syncState: "pending", timestamp: Date.now() }
                    }),
                    createTestRecord({ 
                        id: "2", 
                        metadata: { syncState: "pending", timestamp: Date.now() }
                    }),
                    createTestRecord({ 
                        id: "3", 
                        metadata: { syncState: "completed", timestamp: Date.now() }
                    })
                ];
                
                for (const record of records) {
                    yield* store.addRecord(record);
                }

                const pendingRecords = yield* store.getRecordsBySyncState("pending", 1);

                expect(pendingRecords).toHaveLength(1);
                expect(pendingRecords[0].metadata.syncState).toBe("pending");
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("observeRecord", () => {
        it("should observe changes to a record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const record = createTestRecord();
                yield* store.addRecord(record);

                const observable = yield* store.observeRecord(record.id);
                
                // Subscribe to changes
                const changes: AgentRecord[] = [];
                const subscription = observable.subscribe({
                    next: (value) => changes.push(value)
                });

                // Update the record
                yield* store.updateRecordSyncState(record.id, "completed");

                // Allow time for subscription to receive update
                yield* Effect.sleep("100 millis");

                subscription.unsubscribe();

                expect(changes).toHaveLength(2); // Initial value + update
                expect(changes[1].metadata.syncState).toBe("completed");
            }).pipe(Effect.provide(testLayer))
        );

        it("should fail with RecordNotFoundError for non-existent record", () =>
            Effect.gen(function* () {
                const store = yield* AgentStore;
                const result = yield* Effect.either(store.observeRecord("non-existent"));

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(RecordNotFoundError);
                }
            }).pipe(Effect.provide(testLayer))
        );
    });
});