import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
// Import Effect Vitest integration
import * as EffectVitest from "@effect/vitest";

// Import service definition and errors
import {
    DataValidationError,
    LongTermMemoryService,
    MemoryEntryNotFoundError
} from "../src/memory/longterm/longterm-memory-service"; // Adjust path

// Import Live implementation and Layer
import { LongTermMemoryServiceLiveLayer } from "../src/memory/longterm/longterm-memory-service-live"; // Adjust path

// Import Mocks
import {
    getMockServices,
    mockLogger,
    MockLoggingServiceLayer,
    MockUserRepositoryLayer,
    type MockUserRepositoryService, // Import class for type casting/reset
} from "./testing/mocks.ts"; // Adjust path

// --- Test Setup ---

// Create the full layer stack for testing
const TestLayer = LongTermMemoryServiceLiveLayer.pipe(
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockUserRepositoryLayer) // Provide the mock repo layer
);

// Use EffectVitest.provide for the test suite
const { it } = EffectVitest.provide(TestLayer);

// Helper to get service instance and mocks within tests
const getTestServiceAndMocks = Effect.all({
    svc: LongTermMemoryService,
    mocks: getMockServices,
});

describe("LongTermMemoryServiceLive", () => {
    let mockRepoService: MockUserRepositoryService;

    // Use EffectVitest.beforeEach to run effects before each test
    EffectVitest.beforeEach(() =>
        Effect.gen(function* (_) {
            vi.clearAllMocks();
            // Get the mock repo service instance to reset its state
            const { mocks } = yield* _(getTestServiceAndMocks);
            mockRepoService = mocks.repoSvc as MockUserRepositoryService;
            mockRepoService.reset(); // Reset the in-memory DB
        })
    );

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- set ---
    describe("set", () => {
        it("should create a new entry if key does not exist for user", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const params = {
                    userId: "user1",
                    key: "pref_a",
                    value: "value_a",
                    valueType: "string",
                };
                yield* _(svc.set(params));

                // Verify repository interaction
                expect(mockRepoService.find).toHaveBeenCalledWith({
                    userId: "user1",
                    key: "pref_a",
                });
                expect(mockRepoService.create).toHaveBeenCalledTimes(1);
                expect(mockRepoService.create).toHaveBeenCalledWith(
                    expect.objectContaining(params)
                );
                expect(mockRepoService.update).not.toHaveBeenCalled();
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    "Memory entry created",
                    { userId: "user1", key: "pref_a" }
                );
            }));

        it("should update an existing entry if key exists for user", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const initialParams = {
                    userId: "user2",
                    key: "pref_b",
                    value: 123,
                    valueType: "number",
                };
                // Pre-populate the entry
                const createdEntity = yield* _(mockRepoService.create(initialParams));

                const updateParams = {
                    userId: "user2",
                    key: "pref_b",
                    value: 456, // New value
                    metadata: { updated: true },
                };
                yield* _(svc.set(updateParams));

                // Verify repository interaction
                expect(mockRepoService.find).toHaveBeenCalledWith({
                    userId: "user2",
                    key: "pref_b",
                });
                expect(mockRepoService.create).toHaveBeenCalledTimes(1); // Only initial create
                expect(mockRepoService.update).toHaveBeenCalledTimes(1);
                expect(mockRepoService.update).toHaveBeenCalledWith(
                    createdEntity.id, // Ensure update uses the correct ID
                    { value: 456, valueType: undefined, metadata: { updated: true } } // Only fields being updated
                );
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    "Memory entry updated",
                    { userId: "user2", key: "pref_b" }
                );
            }));

        it("should fail with DataValidationError if repo create fails validation", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const params = { userId: "", key: "", value: "test" }; // Invalid userId/key for mock repo create

                const result = yield* _(svc.set(params), Effect.flip);

                expect(result).toBeInstanceOf(DataValidationError);
                expect(result.message).toContain("Invalid data for create");
                expect(mockRepoService.create).toHaveBeenCalledTimes(1);
            }));

        it("should fail with DataValidationError if repo update fails validation", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const initialParams = { userId: "user3", key: "pref_c", value: "initial" };
                yield* _(mockRepoService.create(initialParams)); // Pre-populate

                const updateParams = { userId: "user3", key: "pref_c", value: "INVALID_UPDATE_VALUE" }; // Trigger mock repo update validation error

                const result = yield* _(svc.set(updateParams), Effect.flip);

                expect(result).toBeInstanceOf(DataValidationError);
                expect(result.message).toContain("Invalid data for update");
                expect(mockRepoService.update).toHaveBeenCalledTimes(1);
            }));
    });

    // --- get ---
    describe("get", () => {
        it("should retrieve an existing entry", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const params = {
                    userId: "user4",
                    key: "pref_d",
                    value: { complex: true, data: [1] },
                    valueType: "json",
                    metadata: { source: "test" },
                };
                yield* _(mockRepoService.create(params)); // Pre-populate

                const result = yield* _(svc.get<{ complex: boolean; data: number[] }>({ userId: "user4", key: "pref_d" }));

                expect(result).toEqual({
                    key: "pref_d",
                    value: { complex: true, data: [1] },
                    valueType: "json",
                    metadata: { source: "test" },
                });
                expect(mockRepoService.find).toHaveBeenCalledWith({
                    userId: "user4",
                    key: "pref_d",
                });
            }));

        it("should fail with MemoryEntryNotFoundError if entry does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);

                const result = yield* _(
                    svc.get({ userId: "user5", key: "nonexistent" }),
                    // Effect.catchTag("MemoryEntryNotFoundError", (e) => Effect.succeed(e)) // Alternative way to catch
                    Effect.flip
                );

                expect(result).toBeInstanceOf(MemoryEntryNotFoundError);
                expect(result.userId).toBe("user5");
                expect(result.key).toBe("nonexistent");
                expect(mockRepoService.find).toHaveBeenCalledWith({
                    userId: "user5",
                    key: "nonexistent",
                });
            }));
    });

    // --- list ---
    describe("list", () => {
        it("should return an empty array if user has no entries", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.list({ userId: "user6" }));

                expect(result).toEqual([]);
                expect(mockRepoService.find).toHaveBeenCalledWith({ userId: "user6" });
            }));

        it("should return all entries for a specific user", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                // Add entries for user7 and another user
                yield* _(mockRepoService.create({ userId: "user7", key: "key1", value: "val1" }));
                yield* _(mockRepoService.create({ userId: "user8", key: "key_other", value: "other" }));
                yield* _(mockRepoService.create({ userId: "user7", key: "key2", value: 100, valueType: "number" }));

                const result = yield* _(svc.list({ userId: "user7" }));

                expect(result.length).toBe(2);
                expect(result).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ key: "key1", value: "val1" }),
                        expect.objectContaining({ key: "key2", value: 100, valueType: "number" }),
                    ])
                );
                // Ensure order doesn't matter for check
                expect(result.map(e => e.key).sort()).toEqual(["key1", "key2"]);
                expect(mockRepoService.find).toHaveBeenCalledWith({ userId: "user7" });
            }));
    });

    // --- delete ---
    describe("delete", () => {
        it("should delete an existing entry", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const params = { userId: "user9", key: "to_delete", value: true };
                const created = yield* _(mockRepoService.create(params)); // Pre-populate

                yield* _(svc.delete({ userId: "user9", key: "to_delete" }));

                // Verify repository interaction
                expect(mockRepoService.find).toHaveBeenCalledWith({ userId: "user9", key: "to_delete" });
                expect(mockRepoService.delete).toHaveBeenCalledTimes(1);
                expect(mockRepoService.delete).toHaveBeenCalledWith(created.id);
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    "Memory entry deleted",
                    { userId: "user9", key: "to_delete" }
                );

                // Verify deletion
                const getResult = yield* _(svc.get({ userId: "user9", key: "to_delete" }), Effect.flip);
                expect(getResult).toBeInstanceOf(MemoryEntryNotFoundError);
            }));

        it("should fail with MemoryEntryNotFoundError if entry to delete does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);

                const result = yield* _(
                    svc.delete({ userId: "user10", key: "nonexistent" }),
                    Effect.flip
                );

                expect(result).toBeInstanceOf(MemoryEntryNotFoundError);
                expect(result.userId).toBe("user10");
                expect(result.key).toBe("nonexistent");
                expect(mockRepoService.find).toHaveBeenCalledWith({ userId: "user10", key: "nonexistent" });
                expect(mockRepoService.delete).not.toHaveBeenCalled();
            }));
    });
});
