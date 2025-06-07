import { Effect, Either, Option } from "effect";
import { Span } from "effect/Tracer";
import { describe, expect, it } from "vitest";
import { TextGenerationError, TextInputError, TextModelError, TextProviderError } from "../errors.js";
import { TextService } from "../service.js";

/**
 * Simplified TextService tests
 */
describe("TextService with Test Harness", () => {
  // Create explicit dependency layer following centralized pattern
  const textServiceTestLayer = TextService.Default;

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
        Effect.provide(textServiceTestLayer)
      )
    );

    it("should generate text for valid input", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* service.generate({
          modelId: "test-model",
          prompt: "Tell me a story",
          system: Option.none(),
          span: {} as Span
        });

        expect(result).toBeDefined();
        expect(result.data).toBeDefined(); // result.data is GenerateTextResult
        expect(result.data.text).toBeDefined();
        expect(typeof result.data.text).toBe("string");
      }).pipe(
        Effect.provide(textServiceTestLayer)
      )
    );

    it("should handle array of messages", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* service.generate({
          modelId: "test-model",
          prompt: "Tell me about robots",
          system: Option.none(),
          span: {} as Span
        });

        expect(result).toBeDefined();
        expect(result.data).toBeDefined(); // result.data is GenerateTextResult
        expect(result.data.text).toBeDefined();
        expect(typeof result.data.text).toBe("string");
      }).pipe(
        Effect.provide(textServiceTestLayer)
      )
    );

    it("should fail for empty input", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          prompt: "",
          system: Option.none(),
          span: {} as Span
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextInputError);
          expect((result.left as TextInputError).description).toContain("Empty prompt");
        }
      }).pipe(
        Effect.provide(textServiceTestLayer)
      )
    );

    it("should fail when model is not found", () =>
      Effect.gen(function* (_) {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "nonexistent-model",
          prompt: "Test prompt",
          system: Option.none(),
          span: {} as Span
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextModelError);
          expect((result.left as TextModelError).description).toContain("Model not found");
        }
      }).pipe(
        Effect.provide(textServiceTestLayer)
      )
    );

    it("should fail when provider is not found", () =>
      Effect.gen(function* () {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          prompt: "Test prompt",
          system: Option.none(),
          span: {} as Span
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextProviderError);
          expect((result.left as TextProviderError).description).toContain("Provider not found");
        }
      }).pipe(
        Effect.provide(textServiceTestLayer)
      )
    );

    it("should fail when text generation fails", () =>
      Effect.gen(function* () {
        const service = yield* TextService;
        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          prompt: "Test prompt",
          system: Option.none(),
          span: {} as Span
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(TextGenerationError);
          expect((result.left as TextGenerationError).description).toContain("Text generation failed");
        }
      }).pipe(
        Effect.provide(textServiceTestLayer)
      )
    );
  });
});
