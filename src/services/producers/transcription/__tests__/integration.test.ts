/**
 * @file Integration tests for TranscriptionService
 * @module services/pipeline/producers/transcription/__tests__/integration.test
 */

import { randomBytes } from "node:crypto";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import type { Span } from "effect/Tracer";
import { describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { 
  TranscriptionAudioError, 
  TranscriptionModelError, 
} from "../errors.js";
import { AudioFormats, TranscriptionService } from "../service.js";
import type { TranscriptionOptions, } from "../types.js";

// Helper function to generate mock audio data
const generateMockAudioData = (format = 'wav'): string => {
  // Generate some random binary data
  const buffer = randomBytes(1024);
  return `data:audio/${format};base64,${buffer.toString('base64')}`;
};

// Mock span for testing
const createTestSpan = (): Span => ({
  attribute: () => {},
  end: () => {},
  event: () => {},
  isRecording: () => true,
  recordException: () => {},
  setAttribute: () => {},
  setStatus: () => {},
  spanContext: () => ({
    traceId: 'mock-trace-id',
    spanId: 'mock-span-id',
    traceFlags: 0,
    isRemote: false
  }),
  startSpan: () => ({
    end: () => {},
    setAttribute: () => {},
    setStatus: () => {},
    recordException: () => {},
    updateName: () => {}
  }),
  updateName: () => {}
} as unknown as Span);

// Create test harness layer combining all required services
const TestHarnessLayer = Layer.mergeAll(
  TranscriptionService.Default,
  ModelService.Default,
  ProviderService.Default,
  ConfigurationService.Default,
  NodeFileSystem.layer
);

// Helper function to create test options
const createTestOptions = (overrides: Partial<TranscriptionOptions> = {}): TranscriptionOptions => ({
  modelId: "whisper-1",
  audioData: generateMockAudioData('wav'),
  span: createTestSpan(),
  ...overrides
});

describe("TranscriptionService Integration Tests", () => {

  it("should transcribe audio with valid input", () =>
    Effect.gen(function* (_) {
      const service = yield* TranscriptionService;
      
      // Create test options
      const options = createTestOptions();
      
      const result = yield* Effect.either(
        service.transcribe(options)
      );

      // Check if the result is a success
      if (Either.isLeft(result)) {
        return expect.fail(`Transcription failed: ${result.left.message}`);
      }

      const transcription = result.right.data;

      // Verify required fields
      expect(transcription).toBeDefined();
      expect(transcription.text).toBeDefined();
      expect(transcription.model).toBe(options.modelId);
      expect(transcription.timestamp).toBeInstanceOf(Date);
      expect(transcription.id).toBeDefined();
      
      // Check for segments if available
      if (transcription.segments && transcription.segments.length > 0) {
        const segment = transcription.segments[0];
        expect(segment).toHaveProperty('id');
        expect(segment).toHaveProperty('start');
        expect(segment).toHaveProperty('end');
        expect(segment).toHaveProperty('text');
      }
      if (transcription.detectedLanguage) {
        expect(typeof transcription.detectedLanguage).toBe('string');
      }
      if (transcription.duration) {
        expect(typeof transcription.duration).toBe('number');
      }
      if (transcription.usage) {
        expect(transcription.usage).toHaveProperty('promptTokens');
        expect(transcription.usage).toHaveProperty('completionTokens');
        expect(transcription.usage).toHaveProperty('totalTokens');
      }
    }).pipe(
      Effect.provide(TestHarnessLayer)
    )
  );

  it("should handle various audio formats", () =>
    Effect.gen(function* (_) {
      const service = yield* TranscriptionService;
      
      // Test with different audio formats
      const formats = Object.values(AudioFormats);
      for (const format of formats) {
        const options = createTestOptions({
          audioData: generateMockAudioData(format)
        });
        
        const result = yield* Effect.either(
          service.transcribe(options)
        );
        
        if (Either.isLeft(result)) {
          return expect.fail(`Transcription failed for format ${format}: ${result.left.message}`);
        }
        
        const transcription = result.right.data;
        expect(transcription).toBeDefined();
        expect(transcription.text).toBeDefined();
        expect(transcription.model).toBe(options.modelId);
      }
    }).pipe(
      Effect.provide(TestHarnessLayer)
    )
  );

  it("should handle empty audio data error", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      
      const options = createTestOptions({
        audioData: Buffer.from(new ArrayBuffer(0)).toString('base64')
      });
      
      const result = yield* Effect.either(
        service.transcribe(options)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TranscriptionAudioError);
        expect(result.left.message).toContain("empty");
      }
    }).pipe(
      Effect.provide(TestHarnessLayer)
    )
  );

  it("should handle invalid audio data format", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      
      const options = createTestOptions({
        audioData: "invalid-base64-data"
      });
      
      const result = yield* Effect.either(
        service.transcribe(options)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TranscriptionAudioError);
        expect(result.left.message).toContain("format");
      }
    }).pipe(
      Effect.provide(TestHarnessLayer)
    )
  );

  it("should handle missing model ID error", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;

      const options = createTestOptions({
        modelId: ""
      });

      const result = yield* Effect.either(
        service.transcribe(options)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TranscriptionModelError);
        expect(result.left.message).toContain("model");
      }
    }).pipe(
      Effect.provide(TestHarnessLayer)
    )
  );
});

