/**
 * @file Integration tests for TranscriptionService
 * @module services/pipeline/producers/transcription/__tests__/integration.test
 */

import { randomBytes } from "crypto";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { Span } from "effect/Tracer";
import { describe, expect, it } from "vitest";
import { 
  TranscriptionAudioError, 
  TranscriptionError, 
  TranscriptionModelError, 
  TranscriptionProviderError 
} from "../errors.js";
import { TranscriptionService } from "../service.js";
import { AudioFormats } from "../service.js";
import type { TranscriptionOptions } from "../types.js";

// Helper function to generate mock audio data
const generateMockAudioData = (format: string = 'wav'): string => {
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
  // Test setup
  const testModelId = "whisper-1";
  const testAudioData = generateMockAudioData('wav');
  const testSpan = createTestSpan();

  // Helper function to convert audio data to base64
  const convertAudioToBase64 = (data: string | Uint8Array | ArrayBuffer): string => {
    let uint8Array: Uint8Array;
    if (typeof data === 'string') {
      const base64Data = data.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 audio data format');
      }
      uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
    } else if (data instanceof Uint8Array) {
      uint8Array = data;
    } else {
      uint8Array = new Uint8Array(data);
    }
    return Buffer.from(uint8Array).toString('base64');
  };

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

      const response = result.right;

      // Verify required fields
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.text).toBeDefined();
      expect(response.data.model).toBe(options.modelId);
      expect(response.data.timestamp).toBeInstanceOf(Date);
      expect(response.data.id).toBeDefined();
      
      // Check for segments if available
      if (response.data.segments && response.data.segments.length > 0) {
        const segment = response.data.segments[0];
        expect(segment).toHaveProperty('id');
        expect(segment).toHaveProperty('start');
        expect(segment).toHaveProperty('end');
        expect(segment).toHaveProperty('text');
      }
      if (response.data.detectedLanguage) {
        expect(typeof response.data.detectedLanguage).toBe('string');
      }
      
      if (response.data.duration) {
        expect(typeof response.data.duration).toBe('number');
      }
      
      if (response.data.usage) {
        expect(response.data.usage).toMatchObject({
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number)
        });
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
        
        const response = result.right;
        expect(response).toBeDefined();
        expect(response.data).toBeDefined();
        expect(response.data.text).toBeDefined();
        expect(response.data.model).toBe(options.modelId);
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
        expect(["TranscriptionAudioError", "TranscriptionError"]).toContain(result.left.constructor.name);
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

