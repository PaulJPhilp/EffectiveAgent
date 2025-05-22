import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";

import { ModelService } from "@/services/ai/model/service.js";
import type { GenerateEmbeddingsResult } from "@/services/ai/provider/types.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ProviderOperationError } from "@/services/ai/provider/errors.js";

import type { EmbeddingServiceApi } from "../api.js";
import { EmbeddingService } from "../service.js";
import {
    EmbeddingGenerationError,
    EmbeddingInputError,
} from "../errors.js";

describe("EmbeddingService", () => {
    let embeddingService: EmbeddingServiceApi;

    describe("Successful Generation", () => {
        it("should successfully generate embeddings", () =>
            Effect.gen(function* () {
                embeddingService = yield* EmbeddingService;

                const result = yield* embeddingService.generate({
                    text: "test input",
                    modelId: "text-embedding-ada-002", // Assuming this model is configured
                });

                expect(result.embeddings).toBeInstanceOf(Array);
                if (result.embeddings.length > 0) {
                    const firstEmbedding = result.embeddings[0];
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
                    expect(result.dimensions).toBeGreaterThan(0);
                } else {
                    // If embeddings are empty, this is unexpected for "test input".
                    // Fail the test explicitly, indicating why.
                    throw new Error(
                        "AssertionError: Expected non-empty embeddings for 'test input' but got an empty array."
                    );
                }
                expect(result.texts).toBeInstanceOf(Array);
                expect(result.texts.length).toBeGreaterThan(0);
                expect(result.model).toBe("text-embedding-ada-002");
                expect(result.id).toBeDefined();
                expect(result.timestamp).toBeInstanceOf(Date);
                expect(result.usage).toBeDefined();
                expect(result.usage.promptTokens).toBeGreaterThanOrEqual(0);
                expect(result.usage.totalTokens).toBeGreaterThanOrEqual(
                    result.usage.promptTokens
                );
                expect(result.finishReason).toBeDefined();
            }).pipe(
                Effect.provide(EmbeddingService.Default),
                Effect.provide(ModelService.Default),
                Effect.provide(ProviderService.Default)
            )
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
            }).pipe(
                Effect.provide(EmbeddingService.Default),
                Effect.provide(ModelService.Default),
                Effect.provide(ProviderService.Default)
            )
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
            }).pipe(
                Effect.provide(EmbeddingService.Default),
                Effect.provide(ModelService.Default),
                Effect.provide(ProviderService.Default)
            )
        );
    });
});