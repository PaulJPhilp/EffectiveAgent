/**
 * @file PipelineService Agent Tests
 * @module services/pipeline/pipeline/tests
 */

import { AgentRuntimeService } from "@/agent-runtime/service.js";
import { FileEntity } from "@/services/core/file/schema.js";
import type { RepositoryServiceApi } from "@/services/core/repository/api.js";
import { EntityNotFoundError, RepositoryError } from "@/services/core/repository/errors.js";
import { RepositoryService } from "@/services/core/repository/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer, Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

// Corrected imports for ExecutiveService components
import { ExecutiveParameters } from "../../executive-service/api.js";
import { ExecutiveServiceError } from "../../executive-service/errors.js";
import { ExecutiveService } from "../../executive-service/service.js";

import { PipelineService } from "../service.js";

// Create a mock repository for FileEntity that the FileService needs
const makeFileRepo = (): RepositoryServiceApi<FileEntity> => ({
    create: (data: FileEntity["data"]) => Effect.succeed({
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        data: data
    } as FileEntity),

    findById: (id: string) => {
        if (id === "non-existent-id") {
            return Effect.fail(new EntityNotFoundError({
                entityId: id,
                entityType: "FileEntity"
            }) as unknown as RepositoryError);
        }
        return Effect.succeed(Option.none<FileEntity>());
    },

    findOne: () => Effect.succeed(Option.none()),
    findMany: () => Effect.succeed([]),
    update: () => Effect.succeed({
        id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
            filename: "test.txt",
            mimeType: "text/plain",
            sizeBytes: 0,
            contentBase64: "",
            ownerId: "test-owner"
        }
    } as FileEntity),
    delete: () => Effect.succeed(undefined),
    count: () => Effect.succeed(0)
});

// Create the repository layer for FileEntity
const FileRepositoryLayer = Layer.succeed(
    RepositoryService<FileEntity>().Tag,
    makeFileRepo()
);

// Complete test layer with all dependencies
const TestLayer = Layer.mergeAll(
    PipelineService.Default,
    AgentRuntimeService.Default,
    ExecutiveService.Default,
    NodeFileSystem.layer
).pipe(
    Layer.provide(FileRepositoryLayer)
);

/**
 * PipelineService Agent tests with AgentRuntime integration
 */
describe("PipelineService Agent", () => {
    class TestInput extends Schema.Class<TestInput>("TestInput")({
        prompt: Schema.String
    }) { }

    class TestUsage extends Schema.Class<TestUsage>("TestUsage")({
        promptTokens: Schema.Number,
        completionTokens: Schema.Number,
        totalTokens: Schema.Number
    }) { }

    class TestOutput extends Schema.Class<TestOutput>("TestOutput")({
        text: Schema.String,
        usage: TestUsage
    }) { }

    describe("execute", () => {
        it("should execute pipeline and update agent state", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                // Check initial state
                const initialState = yield* service.getAgentState();
                expect(initialState.executionCount).toBe(0);
                expect(Option.isNone(initialState.lastExecution)).toBe(true);

                // Create a simple test effect
                const testEffect = Effect.succeed(new TestInput({ prompt: "test prompt" }));
                const parameters: ExecutiveParameters = { timeoutMs: 5000, maxRetries: 3 };

                const result = yield* service.execute(testEffect, parameters);

                expect(result).toBeDefined();
                expect(result.prompt).toBe("test prompt");

                // Check updated state
                const updatedState = yield* service.getAgentState();
                expect(updatedState.executionCount).toBe(1);
                expect(Option.isSome(updatedState.lastExecution)).toBe(true);
                expect(updatedState.executionHistory).toHaveLength(1);

                // Check history details
                const historyEntry = updatedState.executionHistory[0]!;
                expect(historyEntry.success).toBe(true);
                expect(historyEntry.parameters).toEqual(parameters);
                expect(historyEntry.durationMs).toBeGreaterThan(0);

                // Cleanup
                yield* service.terminate();

                return result;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });

        it("should handle multiple concurrent executions", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                // Execute multiple effects concurrently
                const requests = [
                    service.execute(Effect.succeed(new TestInput({ prompt: "test 1" }))),
                    service.execute(Effect.succeed(new TestInput({ prompt: "test 2" }))),
                    service.execute(Effect.succeed(new TestInput({ prompt: "test 3" })))
                ];

                const results = yield* Effect.all(requests, { concurrency: "unbounded" });

                expect(results).toHaveLength(3);
                results.forEach((result, index) => {
                    expect(result.prompt).toBe(`test ${index + 1}`);
                });

                // Check final state
                const finalState = yield* service.getAgentState();
                expect(finalState.executionCount).toBe(3);
                expect(finalState.executionHistory).toHaveLength(3);

                // Cleanup
                yield* service.terminate();

                return results;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });

        it("should handle execution failures and update state", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;
                const errorMessage = "Test execution failure";
                const failingEffect = Effect.fail(new Error(errorMessage));

                const result = yield* Effect.either(service.execute(failingEffect));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ExecutiveServiceError);
                }

                // Check state was updated for failed execution
                const state = yield* service.getAgentState();
                expect(state.executionCount).toBe(1);
                expect(state.executionHistory).toHaveLength(1);

                const historyEntry = state.executionHistory[0]!;
                expect(historyEntry.success).toBe(false);

                // Cleanup
                yield* service.terminate();

                return result;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });

        it("should handle timeout parameters correctly", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                // Create an effect that would take longer than timeout
                const slowEffect = Effect.gen(function* () {
                    yield* Effect.sleep("2 seconds");
                    return new TestInput({ prompt: "slow test" });
                });

                const parameters: ExecutiveParameters = { timeoutMs: 100 }; // Very short timeout

                const result = yield* Effect.either(service.execute(slowEffect, parameters));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ExecutiveServiceError);
                }

                // Check state
                const state = yield* service.getAgentState();
                expect(state.executionCount).toBe(1);

                // Cleanup
                yield* service.terminate();

                return result;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });

        it("should handle retry parameters correctly", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                let attemptCount = 0;
                const flakyEffect = Effect.gen(function* () {
                    attemptCount++;
                    if (attemptCount < 3) {
                        return yield* Effect.fail(new Error("Temporary failure"));
                    }
                    return new TestInput({ prompt: "retry success" });
                });

                const parameters: ExecutiveParameters = { maxRetries: 5 };

                const result = yield* service.execute(flakyEffect, parameters);

                expect(result).toBeDefined();
                expect(result.prompt).toBe("retry success");

                // Check state
                const state = yield* service.getAgentState();
                expect(state.executionCount).toBe(1);
                expect(state.executionHistory).toHaveLength(1);

                const historyEntry = state.executionHistory[0]!;
                expect(historyEntry.success).toBe(true);
                expect(historyEntry.parameters?.maxRetries).toBe(5);

                // Cleanup
                yield* service.terminate();

                return result;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });
    });

    describe("agent state management", () => {
        it("should track execution history correctly", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                // Execute multiple different effects
                yield* service.execute(
                    Effect.succeed(new TestInput({ prompt: "first" })),
                    { timeoutMs: 1000 }
                );

                yield* service.execute(
                    Effect.succeed(new TestInput({ prompt: "second" })),
                    { maxRetries: 2 }
                );

                const state = yield* service.getAgentState();

                expect(state.executionCount).toBe(2);
                expect(state.executionHistory).toHaveLength(2);

                // Check history details
                const firstExecution = state.executionHistory[0]!;
                expect(firstExecution.success).toBe(true);
                expect(firstExecution.parameters?.timeoutMs).toBe(1000);

                const secondExecution = state.executionHistory[1]!;
                expect(secondExecution.success).toBe(true);
                expect(secondExecution.parameters?.maxRetries).toBe(2);

                // Cleanup
                yield* service.terminate();

                return state;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });

        it("should provide access to agent runtime", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;
                const runtime = service.getRuntime();

                // Check initial runtime state (should be initial state, not updated by activities)
                const runtimeState = yield* runtime.getState();
                expect(runtimeState.state.executionCount).toBe(0);

                // Execute and check that the service's internal state is updated
                yield* service.execute(Effect.succeed(new TestInput({ prompt: "test" })));

                // The service's internal state should be updated
                const serviceState = yield* service.getAgentState();
                expect(serviceState.executionCount).toBe(1);

                // The AgentRuntime state doesn't automatically update from activities,
                // it maintains the initial state while tracking activities
                const updatedRuntimeState = yield* runtime.getState();
                expect(updatedRuntimeState.state.executionCount).toBe(0); // Still initial state

                // Cleanup
                yield* service.terminate();

                return { serviceState, runtimeState: updatedRuntimeState };
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });

        it("should limit execution history to 20 entries", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                // Execute 25 times to test history limit
                const requests = Array.from({ length: 25 }, (_, i) =>
                    service.execute(Effect.succeed(new TestInput({ prompt: `test ${i}` })))
                );

                yield* Effect.all(requests, { concurrency: 5 });

                const state = yield* service.getAgentState();

                expect(state.executionCount).toBe(25);
                expect(state.executionHistory).toHaveLength(20); // Should be limited to 20

                // Cleanup
                yield* service.terminate();

                return state;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });
    });

    describe("agent lifecycle", () => {
        it("should terminate properly", async () => {
            const test = Effect.gen(function* () {
                const service = yield* PipelineService;

                // Execute something
                yield* service.execute(Effect.succeed(new TestInput({ prompt: "test" })));

                // Terminate the agent
                yield* service.terminate();

                return true;
            }).pipe(
                Effect.provide(TestLayer)
            );

            await Effect.runPromise(test as any);
        });
    });
});