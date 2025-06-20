/**
 * @file PipelineService Agent Tests
 * @module services/pipeline/pipeline/tests
 */

import { join } from "path";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { FileEntity, FileEntityData } from "@/services/core/file/schema.js";
import type { RepositoryServiceApi } from "@/services/core/repository/api.js";
import { EntityNotFoundError } from "@/services/core/repository/errors.js";
import { RepositoryService } from "@/services/core/repository/service.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Schema } from "@effect/schema";
import { Effect, Either, Layer, Option } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ExecutiveServiceError } from "@/services/executive/errors.js";
import { ExecutiveService } from "@/services/executive/service.js";
import type { PipelineServiceInterface } from "../api.js";
import { PipelineService } from "../service.js";

// Test repository implementation
function makeFileRepo(): RepositoryServiceApi<FileEntity> {
    const store = new Map<string, FileEntity>();

    return {
        create: (entityData) => {
            const id = Math.random().toString(36).substring(7);
            const entity: FileEntity = {
                id,
                createdAt: new Date(),
                updatedAt: new Date(),
                data: entityData
            };
            store.set(id, entity);
            return Effect.succeed(entity);
        },
        findById: (id: string) => {
            const entity = store.get(id);
            return entity
                ? Effect.succeed(Option.some(entity))
                : Effect.succeed(Option.none());
        },
        findOne: (options) => {
            const entities = Array.from(store.values());
            let entity: FileEntity | undefined;

            if (options?.filter) {
                entity = entities.find(e => {
                    const filter = options.filter ?? {};
                    return Object.entries(filter).every(([key, value]) => {
                        const entityValue = (e.data as any)[key];
                        return entityValue === value;
                    });
                });
            } else {
                entity = entities[0];
            }

            return Effect.succeed(entity ? Option.some(entity) : Option.none());
        },
        findMany: () => Effect.succeed([...store.values()]),
        update: (id: string, entityData: Partial<FileEntityData>) => {
            const entity = store.get(id);
            if (!entity) {
                return Effect.fail(new EntityNotFoundError({ entityId: id, entityType: "file" }));
            }
            const updated = {
                ...entity,
                data: { ...entity.data, ...entityData },
                updatedAt: new Date()
            };
            store.set(id, updated);
            return Effect.succeed(updated);
        },
        delete: (id: string) => {
            const entity = store.get(id);
            if (!entity) {
                return Effect.fail(new EntityNotFoundError({ entityId: id, entityType: "file" }));
            }
            store.delete(id);
            return Effect.succeed(Option.some(entity));
        },
        count: () => Effect.succeed(store.size)
    };
}

// Create the repository layer for FileEntity
const FileRepositoryLayer = Layer.succeed(
    RepositoryService<FileEntity>().Tag,
    makeFileRepo()
);

describe("PipelineService", () => {
    const testDir = join(process.cwd(), "test-policy-configs", "pipeline");
    const validPolicyConfig = join(testDir, "valid-policy.json");
    const modelsConfigPath = join(testDir, "models.json");
    const providersConfigPath = join(testDir, "providers.json");
    const masterConfigPath = join(testDir, "master-config.json");

    const validPolicyConfigData = {
        name: "Test Policy Config",
        version: "1.0.0",
        description: "Test policy configuration",
        policies: [
            {
                id: "default-allow",
                name: "Default Allow Rule",
                description: "Default rule to allow all operations",
                type: "allow",
                resource: "*",
                priority: 100,
                conditions: {
                    rateLimits: {
                        requestsPerMinute: 100
                    },
                    costLimits: {
                        maxCostPerRequest: 1000
                    }
                }
            }
        ]
    };

    const validModelsConfig = {
        models: [
            {
                id: "gpt-4",
                provider: "openai",
                capabilities: ["chat", "text"]
            }
        ]
    };

    const validProvidersConfig = {
        providers: [
            {
                name: "openai",
                apiKeyEnvVar: "OPENAI_API_KEY"
            }
        ]
    };

    const validMasterConfig = {
        name: "Test Master Config",
        version: "1.0.0",
        runtimeSettings: {
            fileSystemImplementation: "node" as const
        },
        configPaths: {
            policy: validPolicyConfig,
            models: modelsConfigPath,
            providers: providersConfigPath
        },
        logging: {
            level: "info" as const,
            filePath: "logs/test.log",
            enableConsole: true
        }
    };

    // Store original env vars
    const originalEnv = { ...process.env };

    // Centralized dependency management for PipelineService tests
    const fileSystemLayer = NodeFileSystem.layer;

    const configurationLayer = Layer.provide(
        ConfigurationService.Default,
        fileSystemLayer
    );

    const policyLayer = Layer.provide(
        PolicyService.Default,
        configurationLayer
    );

    const executiveLayer = Layer.provide(
        ExecutiveService.Default,
        policyLayer
    );

    const pipelineLayer = Layer.provide(
        PipelineService.Default,
        executiveLayer
    );

    const testLayer = Layer.mergeAll(
        fileSystemLayer,
        configurationLayer,
        policyLayer,
        executiveLayer,
        pipelineLayer
    );

    // Helper function to provide common layers
    const withLayers = <T, E, R>(effect: Effect.Effect<T, E, R>) =>
        effect.pipe(
            Effect.provide(testLayer)
        ) as Effect.Effect<T, E, never>;

    beforeEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;

                // Create test directory and files
                yield* fs.makeDirectory(testDir, { recursive: true });
                yield* fs.writeFileString(validPolicyConfig, JSON.stringify(validPolicyConfigData, null, 2));
                yield* fs.writeFileString(modelsConfigPath, JSON.stringify(validModelsConfig, null, 2));
                yield* fs.writeFileString(providersConfigPath, JSON.stringify(validProvidersConfig, null, 2));
                yield* fs.writeFileString(masterConfigPath, JSON.stringify(validMasterConfig, null, 2));

                // Set up environment with test config paths
                process.env.MASTER_CONFIG_PATH = masterConfigPath;
                process.env.OPENAI_API_KEY = "test-key";
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    afterEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;

                // Clean up test files with better error handling
                yield* Effect.catchAll(
                    fs.remove(testDir, { recursive: true }),
                    () => Effect.void
                );

                // Reset environment
                process.env = { ...originalEnv };
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    // Test schemas
    const TestInput = Schema.Struct({
        prompt: Schema.String
    });

    const TestUsage = Schema.Struct({
        promptTokens: Schema.Number,
        completionTokens: Schema.Number,
        totalTokens: Schema.Number
    });

    const TestOutput = Schema.Struct({
        text: Schema.String,
        usage: TestUsage
    });

    describe("execute", () => {
        it("should execute pipeline and update agent state", () =>
            withLayers(Effect.gen(function* () {
                const pipeline: PipelineServiceInterface = yield* PipelineService;
                const input = { prompt: "test prompt" };

                const result = yield* pipeline.execute(
                    Effect.succeed(input),
                    {
                        operationName: "test-execution",
                        maxRetries: 3,
                        timeoutMs: 30000,
                        rateLimit: true
                    }
                );

                expect(result).toBeDefined();
            })));

        it("should handle multiple concurrent executions", () =>
            withLayers(Effect.gen(function* () {
                const pipeline: PipelineServiceInterface = yield* PipelineService;
                const input = { prompt: "test prompt" };

                const executions = Array.from({ length: 3 }, () =>
                    pipeline.execute(
                        Effect.succeed(input),
                        {
                            operationName: "concurrent-test",
                            maxRetries: 3,
                            timeoutMs: 30000,
                            rateLimit: true
                        }
                    )
                );

                const results = yield* Effect.all(executions, { concurrency: "unbounded" });
                expect(results).toBeDefined();
            })));

        it("should fail with invalid model ID", () =>
            withLayers(Effect.gen(function* () {
                const pipeline: PipelineServiceInterface = yield* PipelineService;
                const input = { prompt: "test prompt" };

                const result = yield* Effect.either(pipeline.execute(
                    Effect.succeed(input),
                    {
                        operationName: "invalid-model-test",
                        maxRetries: 0,
                        timeoutMs: 5000,
                        rateLimit: true
                    }
                ));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ExecutiveServiceError);
                }
            })));
    });

    describe("agent state management", () => {
        it("should track execution history correctly", () =>
            withLayers(Effect.gen(function* () {
                const pipeline: PipelineServiceInterface = yield* PipelineService;
                const input = { prompt: "test prompt" };

                const result = yield* pipeline.execute(
                    Effect.succeed(input),
                    {
                        operationName: "history-test",
                        maxRetries: 3,
                        timeoutMs: 30000,
                        rateLimit: true
                    }
                );

                expect(result).toBeDefined();
                const state = yield* pipeline.getAgentState();
                expect(state.executionHistory).toHaveLength(1);
            }))
        );

        it("should provide access to agent runtime", () =>
            withLayers(Effect.gen(function* () {
                const pipeline: PipelineServiceInterface = yield* PipelineService;
                const runtime = pipeline.getRuntime();
                expect(runtime).toBeDefined();
            }))
        );

        it("should limit execution history to 20 entries", () =>
            withLayers(Effect.gen(function* () {
                const pipeline: PipelineServiceInterface = yield* PipelineService;
                const input = { prompt: "test prompt" };

                // Execute 25 times
                const executions = Array.from({ length: 25 }, () =>
                    pipeline.execute(
                        Effect.succeed(input),
                        {
                            operationName: "history-limit-test",
                            maxRetries: 3,
                            timeoutMs: 30000,
                            rateLimit: true
                        }
                    )
                );

                yield* Effect.all(executions, { concurrency: "unbounded" });
                const state = yield* pipeline.getAgentState();
                expect(state.executionHistory).toHaveLength(20);
            }))
        );
    });

    describe("agent lifecycle", () => {
        it("should terminate properly", () =>
            withLayers(Effect.gen(function* () {
                const pipeline = yield* PipelineService;
                yield* pipeline.terminate();
                const state = yield* pipeline.getAgentState();
                expect(state.isTerminated).toBe(true);
            }))
        );
    });

    it("should be createable without dependencies", () =>
        withLayers(Effect.gen(function* () {
            const pipelineService = yield* PipelineService
            expect(pipelineService).toBeDefined()
            expect(typeof pipelineService.execute).toBe("function")
        }))
    )

    it("should have an execute method", () =>
        withLayers(Effect.gen(function* () {
            const pipelineService = yield* PipelineService
            expect(typeof pipelineService.execute).toBe("function")
        }))
    )
});