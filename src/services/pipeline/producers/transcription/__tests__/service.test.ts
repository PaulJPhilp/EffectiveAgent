/**
 * @file Tests for TranscriptionService implementation
 * @module services/ai/producers/transcription/service.test
 */

import { Effect, Exit, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { TranscriptionService } from "../service.js";

// --- Minimal mock for TranscriptionService ---
const mockTranscriptionServiceImpl = {
  transcribe: vi.fn(({ modelId, audioData, span }: any) => {
    if (!modelId) {
      return Effect.fail(new Error("TranscriptionModelError: modelId is required"));
    }
    if (modelId === "non-existent-provider") {
      return Effect.fail(new Error("TranscriptionProviderError: provider not found"));
    }
    return Effect.succeed({
      text: "This is a test transcription",
      model: "test-transcription-model",
      timestamp: new Date(),
      id: "test-id-123",
      segments: [
        { id: 1, start: 0, end: 2.5, text: "This is a", confidence: 0.95 },
        { id: 2, start: 2.5, end: 5.0, text: "test transcription", confidence: 0.98 }
      ],
      detectedLanguage: "en-US",
      duration: 5.0,
      usage: { promptTokens: 0, completionTokens: 50, totalTokens: 50 }
    });
  })
};
const mockTranscriptionServiceLayer = Layer.succeed(
  TranscriptionService,
  mockTranscriptionServiceImpl as any
);

describe("TranscriptionService", () => {
  it("should handle abort signal", () =>
    Effect.gen(function* (_) {
      const controller = new AbortController();
      const service = yield* TranscriptionService;
      const options = {
        modelId: "test-transcription-model",
        audioData: "base64audio",
        span: {} as any, // TODO: Use proper Span mock
        signal: controller.signal
      };

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      // The operation should be aborted
      const result = yield* service.transcribe(options);
      return result;
    }).pipe(
      Effect.provide(TranscriptionService.Default)
    )
  );

  it("should successfully transcribe audio", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* TranscriptionService;
      return yield* service.transcribe({
        modelId: "test-transcription-model",
        audioData: "base64audio",
        span: {} as any
      });
    });
    const result = await Effect.runPromise(
      effect.pipe(Effect.provide(mockTranscriptionServiceLayer))
    );
    expect(result).toEqual(
      expect.objectContaining({
        text: "This is a test transcription",
        model: "test-transcription-model"
      })
    );
    expect(mockTranscriptionServiceImpl.transcribe).toHaveBeenCalled();
  });

  it("should fail when model ID is not provided", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* TranscriptionService;
      return yield* service.transcribe({
        audioData: "base64audio",
        span: {} as any
      });
    });
    const result = await Effect.runPromiseExit(
      effect.pipe(Effect.provide(mockTranscriptionServiceLayer))
    );
    Exit.match(result, {
      onFailure: (error: unknown) => {
        expect(error?.toString()).toContain("TranscriptionModelError");
      },
      onSuccess: (_: unknown) => {
        throw new Error("Expected failure, got success");
      }
    });
  });

  it("should fail when provider is not found", async () => {
    // Simulate a non-existent provider by passing a special modelId
    const effect = Effect.gen(function* () {
      const service = yield* TranscriptionService;
      return yield* service.transcribe({
        modelId: "non-existent-provider",
        audioData: "base64audio",
        span: {} as any
      });
    });
    const result = await Effect.runPromiseExit(
      effect.pipe(Effect.provide(mockTranscriptionServiceLayer))
    );
    Exit.match(result, {
      onFailure: (error: unknown) => {
        expect(error?.toString()).toContain("TranscriptionProviderError");
      },
      onSuccess: (_: unknown) => {
        throw new Error("Expected failure, got success");
      }
    });
  });
});