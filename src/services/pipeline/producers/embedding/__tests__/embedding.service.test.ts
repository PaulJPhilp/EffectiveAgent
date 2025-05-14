import { ModelServiceApi } from "@/services/ai/model/api.js";
import { ProviderClientApi as ApiProviderClientApi, ProviderServiceApi } from "@/services/ai/provider/api.js";
import type {
    GenerateEmbeddingsResult
} from "@/services/ai/provider/types.js";
import { mockAccessorServiceImplObject } from "@/services/core/test-harness/components/mock-accessors/service.js"; // Import the mock object
import { createServiceTestHarness } from "@/services/core/test-harness/utils/effect-test-harness.js";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EmbeddingProviderError } from "../errors.js";
import { EmbeddingService } from "../service.js";

// Initialize harness with EmbeddingService
const harness = createServiceTestHarness(
    Layer.succeed(EmbeddingService, mockAccessorServiceImplObject.mockProducerServices.mockEmbeddingService) // Use the imported object
);

// Store original mock implementations to restore them after each test
let originalMockModelServiceMethods: Partial<ModelServiceApi> = {};
let originalMockProviderServiceMethods: Partial<ProviderServiceApi> = {};
let originalMockProviderClientMethods: Partial<ApiProviderClientApi> = {}; // To store specific client methods if needed

describe("EmbeddingService", () => {
    beforeEach(() => {
        const resetEffect = harness.harness.mocks.resetMockCallArgs();
        Effect.runSync(resetEffect);

        const modelService = harness.harness.mocks.mockModelService;
        originalMockModelServiceMethods = {
            getProviderName: modelService.getProviderName,
        };

        const providerService = harness.harness.mocks.mockProviderService;
        originalMockProviderServiceMethods = {
            getProviderClient: providerService.getProviderClient,
        };
        // If defaultProviderClient methods are ever modified, store them here too
        // For now, assuming testSpecificMockProviderClient is created fresh or its base is stable
    });

    afterEach(() => {
        Object.assign(harness.harness.mocks.mockModelService, originalMockModelServiceMethods);
        Object.assign(harness.harness.mocks.mockProviderService, originalMockProviderServiceMethods);
    });

    describe("Successful Generation", () => {
        it("should generate embeddings for a single string input", async () => {
            const modelId = "test-model-id";
            const inputText = "Test input string";
            const mockProviderEmbeddings = [[0.1, 0.2, 0.3, 0.4, 0.5]];

            const mockExpectedEmbeddingsResult: GenerateEmbeddingsResult = {
                embeddings: mockProviderEmbeddings,
                model: modelId,
                timestamp: expect.any(Date) as unknown as Date, // Match any date
                id: expect.any(String) as unknown as string, // Match any string ID
                usage: { promptTokens: 1, totalTokens: 1, completionTokens: 0 },
                texts: [inputText],
                dimensions: 0,
                parameters: {
                    modelParameters: undefined,
                    normalization: undefined,
                    preprocessing: undefined
                },
                finishReason: "stop"
            };

            harness.harness.mocks.mockProviderService.getProviderClient = (_providerName: string) => Effect.succeed({
                ...harness.harness.mocks.defaultProviderClient, // Spread the default mock client if available on harness
                generateEmbeddings: (_texts: string[], _options: any) => Effect.succeed({
                    metadata: {},
                    data: {
                        embeddings: mockProviderEmbeddings,
                        dimensions: 5,
                        texts: [inputText],
                        id: "mock-embedding-id",
                        model: modelId,
                        timestamp: new Date(),
                    },
                    usage: { promptTokens: 1, totalTokens: 1 }, // completionTokens might not be set by provider mock
                    finishReason: "stop"
                } as any)
            }) as any;

            const originalEffectToRun = Effect.gen(function* () {
                const service: EmbeddingService = harness.harness.mocks.mockProducerServices.mockEmbeddingService; // Use the concrete mock from the harness
                return yield* service.generate({ modelId, text: inputText });
            });

            const effectToRun = Effect.orDie(originalEffectToRun);

            const result = await harness.runTest(effectToRun);

            expect(result).toEqual(mockExpectedEmbeddingsResult);
            const captured = harness.harness.mocks.getMockCapturedArgs();
            expect(captured.providerClient.generateEmbeddings?.texts).toEqual([inputText]);
        });

        // ... more tests ...
    });

    describe("Error Handling", () => {
        it("should return EmbeddingProviderError if provider client fails", async () => {
            const modelId = "test-model-error-provider";
            const inputText = "Test input string for provider error";

            harness.harness.mocks.mockModelService.getProviderName = (_modelId: string) => Effect.succeed("failing-provider");
            harness.harness.mocks.mockProviderService.getProviderClient = (_providerName: string) => Effect.fail(new EmbeddingProviderError({ description: "Simulated provider error", method: "getProviderClient", providerName: "failing-provider", module: "EmbeddingService" }));

            const effectToRun = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate({ modelId, text: inputText });
            });

            await harness.expectError(
                effectToRun,
                "EmbeddingProviderError"
            );
        });

        it("should return EmbeddingProviderError if embedding generation fails within provider", async () => {
            const modelId = "test-model-embedding-failure";
            const inputText = "Test input for embedding failure";

            harness.harness.mocks.mockProviderService.getProviderClient = (_providerName: string) => Effect.succeed({
                ...harness.harness.mocks.defaultProviderClient,
                generateEmbeddings: (_texts: string[], _options: any) => Effect.fail(new EmbeddingProviderError({ description: "Simulated embedding generation failure", method: "generateEmbeddings", module: "EmbeddingService" }))
            }) as any;

            const effectToRun = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate({ modelId, text: inputText });
            });

            await harness.expectError(
                effectToRun,
                "EmbeddingProviderError"
            );
        });

        it("should return EmbeddingInputError for empty string input", async () => {
            const modelId = "test-model-empty-input";
            const inputText = ""; // Empty input

            const effectToRun = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate({ modelId, text: inputText });
            });

            await harness.expectError(
                effectToRun,
                "EmbeddingInputError"
            );
        });

        it("should return EmbeddingGenerationError if the specific modelId 'error-generate' is used", async () => {
            const modelId = "error-generate"; // Special modelId to trigger internal error
            const inputText = "Test input for general generation error";

            const effectToRun = Effect.gen(function* () {
                const service = yield* EmbeddingService;
                return yield* service.generate({ modelId, text: inputText });
            });

            await harness.expectError(
                effectToRun,
                "EmbeddingGenerationError"
            );
        });
    });
}); 