/**
 * @file Tests for TranscriptionService implementation
 * @module services/ai/producers/transcription/service.test
 */

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { Effect, Layer, pipe } from "effect";
import { describe, expect, it, vi } from "vitest";
import { TranscriptionService, TranscriptionServiceLive } from "./service.js";

// Mock language model
const mockLanguageModel = {
    modelId: "test-transcription-model",
    capabilities: new Set(["audio"]),
    contextWindow: 4096,
    provider: "test-provider"
};

// Mock for the provider client
const mockProviderClient = {
    getModels: () => Effect.succeed([mockLanguageModel]),
    transcribe: vi.fn((audioData, options) =>
        Effect.succeed({
            text: "This is a test transcription",
            model: "test-transcription-model",
            timestamp: new Date(),
            id: "test-id-123",
            segments: [
                {
                    id: 1,
                    start: 0,
                    end: 2.5,
                    text: "This is a",
                    confidence: 0.95
                },
                {
                    id: 2,
                    start: 2.5,
                    end: 5.0,
                    text: "test transcription",
                    confidence: 0.98
                }
            ],
            detectedLanguage: "en-US",
            duration: 5.0,
            usage: {
                promptTokens: 0,
                completionTokens: 50,
                totalTokens: 50
            }
        })
    ),
    getProviderName: () => "test-provider",
    getCapabilities: () => new Set(["audio"])
};

// Mock for the model service
const mockModelService = {
    getProviderName: vi.fn((modelId) =>
        modelId === "test-transcription-model"
            ? Effect.succeed("test-provider")
            : Effect.fail(new Error("Model not found"))
    ),
    getModelCapabilities: vi.fn(() => Effect.succeed(new Set(["audio"])))
};

// Mock for the provider service
const mockProviderService = {
    getProviderClient: vi.fn((providerName) =>
        providerName === "test-provider"
            ? Effect.succeed(mockProviderClient)
            : Effect.fail(new Error("Provider not found"))
    ),
    load: vi.fn(() => Effect.succeed({ providers: [] }))
};

// Mock layers
const TestDeps = Layer.succeed(ModelService, mockModelService)
    .pipe(Layer.provide(Layer.succeed(ProviderService, mockProviderService)));

// Test layer with dependencies
const TestLayer = Layer.provide(
    TranscriptionServiceLive,
    TestDeps
);

describe("TranscriptionService", () => {
    it("should successfully transcribe audio", async () => {
        const program = Effect.gen(function* () {
            const service = yield* TranscriptionService;
            const result = yield* service.transcribe({
                modelId: "test-transcription-model",
                audioData: "base64audio",
                span: {} as any // Mock span for testing
            });
            return result;
        });

        const result = await pipe(
            program,
            Effect.provide(TestLayer),
            Effect.runPromise
        );

        expect(result).toEqual(expect.objectContaining({
            text: "This is a test transcription",
            model: "test-transcription-model"
        }));
        expect(mockProviderService.getProviderClient).toHaveBeenCalledWith("test-provider");
        expect(mockProviderClient.transcribe).toHaveBeenCalled();
    });

    it("should fail when model ID is not provided", async () => {
        const program = Effect.gen(function* () {
            const service = yield* TranscriptionService;
            return yield* service.transcribe({
                audioData: "base64audio",
                span: {} as any // Mock span for testing
            });
        });

        const result = await pipe(
            program,
            Effect.provide(TestLayer),
            Effect.runPromiseExit
        );

        expect(result._tag).toBe("Failure");
        expect(Effect.isFailure(result)).toBe(true);

        // We expect a TranscriptionModelError
        const error = result.cause;
        expect(error.toString()).toContain("TranscriptionModelError");
    });

    it("should fail when provider is not found", async () => {
        // Override the mock for this test
        mockModelService.getProviderName.mockImplementationOnce(() =>
            Effect.succeed("non-existent-provider")
        );

        const program = Effect.gen(function* () {
            const service = yield* TranscriptionService;
            return yield* service.transcribe({
                modelId: "test-transcription-model",
                audioData: "base64audio",
                span: {} as any
            });
        });

        const result = await pipe(
            program,
            Effect.provide(TestLayer),
            Effect.runPromiseExit
        );

        expect(result._tag).toBe("Failure");
        expect(Effect.isFailure(result)).toBe(true);

        // We expect a TranscriptionProviderError
        const error = result.cause;
        expect(error.toString()).toContain("TranscriptionProviderError");
    });
}); 