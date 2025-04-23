/**
 * @file Test suite for the EmbeddingService
 * @module services/ai/producers/embedding/service.test
 */

import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { EmbeddingInputError, EmbeddingModelError } from "./errors.js";
import { type EmbeddingGenerationOptions, EmbeddingService } from "./service.js";

describe("EmbeddingService", () => {
    // Mock data
    const testModelId = "test-embedding-model";
    const testProviderName = "test-provider";
    const testInput = "This is a test input";
    const testInputArray = ["This is input 1", "This is input 2"];
    const testEmbedding = [0.1, 0.2, 0.3, 0.4];
    const testModel = {
        modelId: testModelId,
        name: "Test Embedding Model",
        capabilities: ["embeddings"]
    };

    // Mock successful embedding result
    const mockEmbeddingResult = {
        embeddings: [testEmbedding],
        model: testModelId,
        timestamp: new Date(),
        id: "emb-12345",
        usage: {
            promptTokens: 10,
            totalTokens: 10
        }
    };

    // Mock batch embedding result
    const mockBatchEmbeddingResult = {
        embeddings: [testEmbedding, testEmbedding],
        model: testModelId,
        timestamp: new Date(),
        id: "emb-12346",
        usage: {
            promptTokens: 20,
            totalTokens: 20
        }
    };

    // Create mocks for dependencies
    const createMockServices = () => Effect.gen(function* () {
        // Mock provider client
        const mockProviderClient = {
            getModels: vi.fn(() => Effect.succeed([testModel])),
            generateEmbeddings: vi.fn(() => Effect.succeed(mockEmbeddingResult))
        };

        // Mock model service
        const mockModelService = {
            getProviderName: vi.fn(() => Effect.succeed(testProviderName)),
            getModelCapabilities: vi.fn(() => Effect.succeed(["embeddings"]))
        };

        // Mock provider service
        const mockProviderService = {
            getProviderClient: vi.fn(() => Effect.succeed(mockProviderClient))
        };

        // Create service implementation
        const embeddingService = yield* Effect.gen(function* () {
            return {
                generate: (options: EmbeddingGenerationOptions) => Effect.gen(function* () {
                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new EmbeddingModelError("Model ID must be provided"))
                    );

                    // Validate input
                    if (Array.isArray(options.input) && options.input.length === 0) {
                        return yield* Effect.fail(new EmbeddingInputError("Input array cannot be empty"));
                    }

                    if (!Array.isArray(options.input) && options.input.trim() === "") {
                        return yield* Effect.fail(new EmbeddingInputError("Input text cannot be empty"));
                    }

                    // Get provider name
                    const providerName = yield* mockModelService.getProviderName(modelId);

                    // Get provider client
                    const providerClient = yield* mockProviderService.getProviderClient(providerName);

                    // Get model
                    const models = yield* providerClient.getModels();
                    const model = models.find(m => m.modelId === modelId);
                    if (!model) {
                        return yield* Effect.fail(new EmbeddingModelError(`Model ${modelId} not found`));
                    }

                    // Generate embeddings
                    const result = Array.isArray(options.input)
                        ? yield* providerClient.generateEmbeddings({ model, input: options.input, ...options.parameters })
                        : yield* providerClient.generateEmbeddings({ model, input: options.input, ...options.parameters });

                    // Prepare result
                    return {
                        embeddings: result.embeddings,
                        model: result.model,
                        timestamp: result.timestamp,
                        id: result.id,
                        usage: result.usage
                    };
                }).pipe(Effect.withSpan("EmbeddingService.generate"))
            };
        });

        return {
            embeddingService,
            mockModelService,
            mockProviderService,
            mockProviderClient
        };
    });

    // Create test harness
    const testHarness = createServiceTestHarness(
        EmbeddingService,
        createMockServices
    );

    // Create test span
    const testSpan = {} as any;

    describe("generate", () => {
        it("should generate embeddings for a single text input", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: testInput,
                span: testSpan
            };

            // Set up mock provider behavior
            testHarness.services.mockProviderClient.generateEmbeddings.mockImplementation(() =>
                Effect.succeed(mockEmbeddingResult)
            );

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                const result = yield* service.generate(options);
                return result;
            });

            const result = await testHarness.runTest(program);

            // Verify
            expect(result).toBeDefined();
            expect(result.embeddings).toEqual([testEmbedding]);
            expect(result.model).toBe(testModelId);
            expect(result.id).toBe("emb-12345");
            expect(result.usage?.promptTokens).toBe(10);
            expect(result.usage?.totalTokens).toBe(10);

            // Verify interactions
            expect(testHarness.services.mockModelService.getProviderName).toHaveBeenCalledWith(testModelId);
            expect(testHarness.services.mockProviderService.getProviderClient).toHaveBeenCalledWith(testProviderName);
            expect(testHarness.services.mockProviderClient.generateEmbeddings).toHaveBeenCalledTimes(1);
        });

        it("should generate embeddings for an array of text inputs", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: testInputArray,
                span: testSpan
            };

            // Set up mock provider behavior for batch input
            testHarness.services.mockProviderClient.generateEmbeddings.mockImplementation(() =>
                Effect.succeed(mockBatchEmbeddingResult)
            );

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                const result = yield* service.generate(options);
                return result;
            });

            const result = await testHarness.runTest(program);

            // Verify
            expect(result).toBeDefined();
            expect(result.embeddings).toEqual([testEmbedding, testEmbedding]);
            expect(result.model).toBe(testModelId);
            expect(result.id).toBe("emb-12346");

            // Verify interactions
            expect(testHarness.services.mockProviderClient.generateEmbeddings).toHaveBeenCalledWith({
                model: testModel,
                input: testInputArray
            });
        });

        it("should fail when modelId is not provided", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                input: testInput,
                span: testSpan
            };

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify error
            await testHarness.expectError(program, "EmbeddingModelError");
        });

        it("should fail with EmbeddingInputError when input is empty string", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: "",
                span: testSpan
            };

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify specific error
            await testHarness.expectError(program, "EmbeddingInputError");
        });

        it("should fail with EmbeddingInputError when input array is empty", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: [],
                span: testSpan
            };

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify specific error
            await testHarness.expectError(program, "EmbeddingInputError");
        });

        it("should fail when provider name resolution fails", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: testInput,
                span: testSpan
            };

            // Mock error condition
            testHarness.services.mockModelService.getProviderName.mockImplementation(() =>
                Effect.fail(new Error("Provider not found"))
            );

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify
            await testHarness.expectError(program, "EmbeddingProviderError");
        });

        it("should fail when provider client cannot be obtained", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: testInput,
                span: testSpan
            };

            // Mock error condition
            testHarness.services.mockProviderService.getProviderClient.mockImplementation(() =>
                Effect.fail(new Error("Provider client not available"))
            );

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify
            await testHarness.expectError(program, "EmbeddingProviderError");
        });

        it("should fail when model is not found", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: "non-existent-model",
                input: testInput,
                span: testSpan
            };

            // Mock empty models list
            testHarness.services.mockProviderClient.getModels.mockImplementation(() =>
                Effect.succeed([])
            );

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify
            await testHarness.expectError(program, "EmbeddingModelError");
        });

        it("should fail when embedding generation fails", async () => {
            // Setup
            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: testInput,
                span: testSpan
            };

            // Mock generation failure
            testHarness.services.mockProviderClient.generateEmbeddings.mockImplementation(() =>
                Effect.fail(new Error("Embedding generation failed"))
            );

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            // Verify
            await testHarness.expectError(program, "EmbeddingGenerationError");
        });

        it("should pass custom parameters to the provider", async () => {
            // Setup
            const customParams = {
                dimensions: 1024,
                user: "test-user",
                encoding: "float"
            };

            const options: EmbeddingGenerationOptions = {
                modelId: testModelId,
                input: testInput,
                span: testSpan,
                parameters: customParams
            };

            // Execute
            const program = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate(options);
            });

            await testHarness.runTest(program);

            // Verify parameters were passed
            expect(testHarness.services.mockProviderClient.generateEmbeddings).toHaveBeenCalledWith({
                model: testModel,
                input: testInput,
                dimensions: 1024,
                user: "test-user",
                encoding: "float"
            });
        });
    });
}); 