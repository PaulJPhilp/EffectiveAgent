/**
 * @file Integration tests for TextService
 * @module services/pipeline/producers/text/__tests__/integration.test
 */

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Option } from "effect";
import type { Span } from "effect/Tracer";
import { describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import {
  TextInputError,
  TextModelError
} from "../errors.js";
import { TextService } from "../service.js";

// Mock span for testing
const testSpan = {
  attribute: () => { },
  end: () => { },
  event: () => { },
  isRecording: () => true,
  recordException: () => { },
  setAttribute: () => { },
  setAttributes: () => { },
  setStatus: () => { },
  spanContext: () => ({
    spanId: "test-span-id",
    traceId: "test-trace-id",
    traceFlags: 0,
    isRemote: false,
    traceState: undefined
  }),
  startSpan: () => ({
    end: () => { },
    setAttribute: () => { },
    setAttributes: () => { },
    setStatus: () => { },
    recordException: () => { }
  }),
  updateName: () => { }
} as unknown as Span;

describe("TextService Integration Tests", () => {
  // Test setup
  const testModelId = "test-model";
  const testPrompt = "Tell me a story about artificial intelligence";
  const testSystemPrompt = "You are a helpful assistant that tells engaging stories.";

  // Helper function to create test options
  const createTestOptions = (overrides: Partial<Parameters<typeof TextService.prototype.generate>[0]> = {}) => ({
    modelId: testModelId,
    prompt: testPrompt,
    system: Option.some(testSystemPrompt),
    span: testSpan,
    ...overrides
  });

  it("should generate text for a valid prompt", () =>
    Effect.gen(function* () {
      const service = yield* TextService;

      const response = yield* service.generate(
        createTestOptions()
      );

      // Verify the response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.text).toBeDefined();
      expect(typeof response.data.text).toBe("string");
      expect(response.data.text.length).toBeGreaterThan(0);

      // Check metadata
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe(testModelId);
      expect(response.metadata.id).toBeDefined();

      // Check usage if present
      if (response.usage) {
        expect(response.usage).toMatchObject({
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number)
        });
      }
    }).pipe(
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle empty prompt error", () =>
    Effect.gen(function* () {
      const service = yield* TextService;

      const result = yield* Effect.either(
        service.generate(
          createTestOptions({
            prompt: ""
          })
        )
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TextInputError);
        expect(result.left.message).toContain("Empty prompt");
      }
    }).pipe(
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle missing model ID error", () =>
    Effect.gen(function* () {
      const service = yield* TextService;

      const result = yield* Effect.either(
        service.generate(
          createTestOptions({
            modelId: ""
          })
        )
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TextModelError);
        expect(result.left.message).toContain("Model ID is required");
      }
    }).pipe(
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle invalid model ID error", () =>
    Effect.gen(function* () {
      const service = yield* TextService;

      const result = yield* Effect.either(
        service.generate(
          createTestOptions({
            modelId: "non-existent-model"
          })
        )
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(["TextModelError", "TextProviderError"]).toContain(result.left.constructor.name);
      }
    }).pipe(
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const controller = new AbortController();
      const service = yield* TextService;

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      const result = yield* Effect.either(
        service.generate(
          createTestOptions({
            signal: controller.signal,
            prompt: "This is a long prompt that should be aborted"
          })
        )
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(Error);
        expect(result.left.message).toContain("aborted");
      }
    }).pipe(
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle generation parameters", () =>
    Effect.gen(function* () {
      const service = yield* TextService;

      const response = yield* service.generate(
        createTestOptions({
          parameters: {
            temperature: 0.7,
            maxSteps: 100,
            topP: 0.9,
            topK: 40,
            presencePenalty: 0.5,
            frequencyPenalty: 0.5,
            stop: ["\n"]
          }
        })
      );

      // Verify the response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.text).toBeDefined();
      expect(typeof response.data.text).toBe("string");

      // Check that the output doesn't contain any of the stop sequences
      expect(response.data.text).not.toContain("\n");
    }).pipe(
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );
});
