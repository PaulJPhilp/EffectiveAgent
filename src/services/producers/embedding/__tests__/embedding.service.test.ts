import { ConfigurationService } from "@/services/core/configuration/index.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";

import type { EmbeddingServiceApi } from "../api.js";
import {
    EmbeddingGenerationError,
    EmbeddingInputError,
} from "../errors.js";
import { EmbeddingService } from "../service.js";

describe("EmbeddingService", () => {
    // Centralized dependency layer configuration
    const testLayer = Layer.provide(
        Layer.mergeAll(
            ConfigurationService.Default,
            ProviderService.Default,
            ModelService.Default,
            EmbeddingService.Default
        ),
        NodeFileSystem.layer
    );
    let embeddingService: EmbeddingServiceApi;

    describe("Successful Generation", () => {
        it("should successfully generate embeddings", () =>
            Effect.gen(function* () {
                embeddingService = yield* EmbeddingService;

                const result = yield* embeddingService.generate({
                    text: "test input",
                    modelId: "text-embedding-ada-002", // Assuming this model is configured
                });

                expect(result.data.embeddings).toBeInstanceOf(Array);
                if (result.data.embeddings.length > 0) {
                    const firstEmbedding = result.data.embeddings[0];
                    // Use Array.isArray for type narrowing recognized by TypeScript
                    if (Array.isArray(firstEmbedding)) {
                        expect(firstEmbedding).toBeInstanceOf(Array); // Runtime check is still good
                        if (firstEmbedding.length > 0) {
                            expect(typeof firstEmbedding[0]).toBe("number");
                        }
                    } else {
                        // This path should ideally not be hit if embeddings.length > 0
                        // and embeddings are standard arrays (not sparse with undefined elements).
                        // Fail the test if firstEmbedding is not an array as expected.
                        throw new Error("AssertionError: Expected firstEmbedding to be an array.");
                    }
                    expect(firstEmbedding.length).toBeGreaterThan(0);
                } else {
                    // If embeddings are empty, this is unexpected for "test input".
                    // Fail the test explicitly, indicating why.
                    throw new Error(
                        "AssertionError: Expected non-empty embeddings for 'test input' but got an empty array."
                    );
                }
                expect(result.data.model).toBe("text-embedding-ada-002");
                if (result.data.usage) {
                    expect(result.data.usage.promptTokens).toBeGreaterThanOrEqual(0);
                    expect(result.data.usage.totalTokens).toBeGreaterThanOrEqual(
                        result.data.usage.promptTokens
                    );
                }
            }).pipe(Effect.provide(testLayer))
        );
    });

    describe("Error Handling", () => {
        it("should return EmbeddingInputError for empty text", () =>
            Effect.gen(function* () {
                embeddingService = yield* EmbeddingService;

                const result = yield* Effect.either(
                    embeddingService.generate({ text: "", modelId: "any-model" })
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(EmbeddingInputError);
                    expect(result.left.message).toContain("Input text cannot be empty");
                }
            }).pipe(Effect.provide(testLayer))
        );

        it("should return EmbeddingGenerationError if embedding generation fails", () =>
            Effect.gen(function* () {
                embeddingService = yield* EmbeddingService;
                // To reliably test this, "failing-model" should be configured
                // to fail or be a non-existent model that causes a known error.
                const result = yield* Effect.either(
                    embeddingService.generate({
                        text: "test input for failure",
                        modelId: "model-designed-to-fail",
                    })
                );

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(EmbeddingGenerationError);
                    // The exact message and cause will depend on the actual error from the service
                    // For example, if the model isn't found, it might be an EmbeddingModelError
                    // or if the provider fails, it could be an EmbeddingProviderError with a cause.
                    // This assertion might need to be adjusted after observing actual failures.
                    // expect(result.left.message).toContain(
                    //    "Failed to generate embeddings for model model-designed-to-fail"
                    // );
                    // expect(result.left.cause).toBeInstanceOf(ProviderOperationError);
                }
            }).pipe(Effect.provide(testLayer))
        );
    });
});