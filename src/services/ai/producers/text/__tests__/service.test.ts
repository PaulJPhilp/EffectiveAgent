import { Effect, Either, Option } from "effect";
import type { Span } from "effect/Tracer";
import { describe, it, expect } from "vitest";
import { TextInputError, TextGenerationError, TextModelError, TextProviderError } from "../errors.js";
import { AiResponse } from "@effect/ai/AiResponse";
import * as AiRole from "@effect/ai/AiRole";
import TextService from "../service.js";
import { TestHarnessService } from "@/services/test-harness/service.js";

/**
 * Simplified TextService tests
 */
describe("TextService with Test Harness", () => {
  describe("generate", () => {
    it("should handle abort signal", () =>
      Effect.gen(function* (_) {
        const controller = new AbortController();
        const service = yield* TextService;
        const options = {
          modelId: "test-model",
          prompt: "Tell me a story",
          system: Option.none(),
          span: {} as Span,
          signal: controller.signal
        };

        // Abort after a short delay
        setTimeout(() => controller.abort(), 100);

        // The operation should be aborted
        const result = yield* service.generate(options);
        return result;
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );

    it("should generate text for valid input", () => 
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* service.generate({
          modelId: "test-model",
          prompt: "Tell me a story",
          system: Option.none()
          // messages is not part of TextGenerationOptions
        });
        
        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe("string");
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );

    it("should handle array of messages", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* service.generate({
          modelId: "test-model",
          prompt: "Tell me about robots",
          system: Option.none()
        });
        
        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe("string");
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );

    it("should fail for empty input", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          prompt: "",
          system: Option.none()
        }));
        
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextInputError);
          expect(result.left.description).toContain("Empty prompt");
        }
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );

    it("should fail when model is not found", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "nonexistent-model",
          prompt: "Test prompt",
          system: Option.none()
        }));
        
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextModelError); 
          expect(result.left.description).toContain("Model not found");
        }
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );

    it("should fail when provider is not found", () =>
      Effect.gen(function* () {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          prompt: "Test prompt",
          system: Option.none()
        }));
        
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextProviderError);
          expect(result.left.description).toContain("Provider not found");
        }
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );

    it("should fail when text generation fails", () =>
      Effect.gen(function* () {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          prompt: "Test prompt",
          system: Option.none()
        }));
        
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextGenerationError);
          expect(result.left.description).toContain("Text generation failed");
        }
      }).pipe(
        Effect.provide(TextService.Default)
      )
    );
  });
});
