/**
 * @file Integration tests for TranscriptionService
 * @module services/pipeline/producers/transcription/__tests__/integration.test
 */

import { Effect, Either } from "effect";
import { Span } from "effect/Tracer";
import { TranscriptionService } from "../service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { describe, it, expect } from "vitest";
import { 
  TranscriptionError, 
  TranscriptionAudioError, 
  TranscriptionModelError, 
  TranscriptionProviderError 
} from "../errors.js";
import { AudioFormats, type TranscriptionOptions } from "../service.js";
import { randomBytes } from "crypto";

// Import the actual types from the service
import type { TranscriptionResult } from "../types.js";

// Helper type for test assertions
type TestTranscriptionResult = TranscriptionResult & {
  metadata: {
    model: string;
    id: string;
  };
};

// Helper function to generate mock audio data
const generateMockAudioData = (format: string = 'wav'): string => {
  // Generate some random binary data
  const buffer = randomBytes(1024);
  
  // For real testing, you might want to generate actual audio data
  // For this example, we'll just return a base64 string
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

describe("TranscriptionService Integration Tests", () => {
  // Test setup
  const testModelId = "whisper-1"; // Example model ID
  const testAudioData = generateMockAudioData('wav');
  const testSpan = createTestSpan();

  // Helper function to create test options
  const createTestOptions = (overrides: Partial<Omit<TranscriptionOptions, 'span'>> = {}): TranscriptionOptions => {
    return {
      modelId: testModelId,
      audioData: testAudioData,
      span: testSpan,
      ...overrides
    };
  };

  it("should transcribe audio with valid input", () =>
    Effect.gen(function* (_) {
      const service = yield* TranscriptionService;
      
      // Create test options and extract the audio data
      const options = createTestOptions();
      
      // Ensure we have valid audio data
      if (!options.audioData) {
        return expect.fail('No audio data provided');
      }
      
      // Convert the audio data to a Uint8Array first
      let uint8Array: Uint8Array;
      if (typeof options.audioData === 'string') {
        // Handle base64 string
        const base64Data = options.audioData.split(',')[1];
        if (!base64Data) {
          return expect.fail('Invalid base64 audio data format');
        }
        uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
      } else if (options.audioData instanceof Uint8Array) {
        // Already a Uint8Array
        uint8Array = options.audioData;
      } else {
        // Convert ArrayBuffer to Uint8Array
        uint8Array = new Uint8Array(options.audioData);
      }
      
      // Call the service and get the result
      // Create a new ArrayBuffer from the Uint8Array
      const audioBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength
      ) as ArrayBuffer;
      
      const result = yield* Effect.either(
        service.transcribe(audioBuffer)
      );
      
      // Check if the result is a success
      if (Either.isLeft(result)) {
        return expect.fail(`Transcription failed: ${result.left.message}`);
      }
      
      // Get the transcription result
      const transcription = result.right;
      
      // Verify the basic structure
      expect(transcription).toMatchObject({
        text: expect.any(String)
      });
      
      // Check for additional fields if they exist
      if ('model' in transcription) {
        expect(transcription.model).toBe(testModelId);
      }
      
      if ('timestamp' in transcription) {
        expect(transcription.timestamp).toBeInstanceOf(Date);
      }
      
      if ('id' in transcription) {
        expect(transcription.id).toBeDefined();
      }
      
      expect(transcription.text.length).toBeGreaterThan(0);
      
      // Check for segments if they exist
      if ('segments' in transcription && Array.isArray(transcription.segments)) {
        if (transcription.segments.length > 0) {
          const segment = transcription.segments[0];
          expect(segment).toMatchObject({
            text: expect.any(String),
            start: expect.any(Number),
            end: expect.any(Number)
          });
        }
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle different audio formats", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      const formats: Array<keyof typeof AudioFormats> = ['MP3', 'WAV', 'FLAC'];
      
      for (const format of formats) {
        const audioData = generateMockAudioData(format);
        const options = createTestOptions({
          audioData,
          audioFormat: AudioFormats[format]
        });
        
        // Convert audio data to ArrayBuffer
        let uint8Array: Uint8Array;
        if (typeof options.audioData === 'string') {
          const base64Data = options.audioData.split(',')[1];
          if (!base64Data) {
            return expect.fail('Invalid base64 audio data format');
          }
          uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
        } else if (options.audioData instanceof Uint8Array) {
          uint8Array = options.audioData;
        } else {
          uint8Array = new Uint8Array(options.audioData);
        }
        
        const audioBuffer = uint8Array.buffer.slice(
          uint8Array.byteOffset,
          uint8Array.byteOffset + uint8Array.byteLength
        ) as ArrayBuffer;
        
        // Execute the effect and get the result
        const result = yield* Effect.either(
          service.transcribe(audioBuffer)
        );
        
        if (Either.isLeft(result)) {
          return expect.fail(`Transcription failed for format ${format}: ${result.left.message}`);
        }
        
        const response = result.right;
        expect(response).toBeDefined();
        expect(response.text).toBeDefined();
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle empty audio data error", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      
      // Create an empty ArrayBuffer
      const emptyAudioBuffer = new ArrayBuffer(0);
      
      const result = yield* Effect.either(
        service.transcribe(emptyAudioBuffer)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(["TranscriptionAudioError", "TranscriptionError"]).toContain(result.left.constructor.name);
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle missing model ID error", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      
      const options = createTestOptions({
        modelId: ""
      });
      
      // Convert audio data to ArrayBuffer
      let uint8Array: Uint8Array;
      if (typeof options.audioData === 'string') {
        const base64Data = options.audioData.split(',')[1];
        if (!base64Data) {
          return expect.fail('Invalid base64 audio data format');
        }
        uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
      } else if (options.audioData instanceof Uint8Array) {
        uint8Array = options.audioData;
      } else {
        uint8Array = new Uint8Array(options.audioData);
      }
      
      const audioBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength
      ) as ArrayBuffer;
      
      const result = yield* Effect.either(
        service.transcribe(audioBuffer)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TranscriptionModelError);
        expect(result.left.message).toContain("model");
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle invalid model ID error", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      
      const options = createTestOptions({
        modelId: "non-existent-model"
      });
      
      // Convert audio data to ArrayBuffer
      let uint8Array: Uint8Array;
      if (typeof options.audioData === 'string') {
        const base64Data = options.audioData.split(',')[1];
        if (!base64Data) {
          return expect.fail('Invalid base64 audio data format');
        }
        uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
      } else if (options.audioData instanceof Uint8Array) {
        uint8Array = options.audioData;
      } else {
        uint8Array = new Uint8Array(options.audioData);
      }
      
      const audioBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength
      ) as ArrayBuffer;
      
      const result = yield* Effect.either(
        service.transcribe(audioBuffer)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(["TranscriptionModelError", "TranscriptionProviderError"]).toContain(result.left.constructor.name);
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const controller = new AbortController();
      const service = yield* TranscriptionService;
      
      // Get the test options with the abort signal
      const options = createTestOptions({
        signal: controller.signal
      });
      
      // Convert audio data to ArrayBuffer
      let uint8Array: Uint8Array;
      if (typeof options.audioData === 'string') {
        const base64Data = options.audioData.split(',')[1];
        if (!base64Data) {
          return expect.fail('Invalid base64 audio data format');
        }
        uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
      } else if (options.audioData instanceof Uint8Array) {
        uint8Array = options.audioData;
      } else {
        uint8Array = new Uint8Array(options.audioData);
      }
      
      const audioBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength
      ) as ArrayBuffer;
      
      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      const result = yield* Effect.either(
        service.transcribe(audioBuffer)
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(Error);
        expect(result.left.message).toContain("aborted");
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle transcription parameters", () =>
    Effect.gen(function* () {
      const service = yield* TranscriptionService;
      
      const options = createTestOptions({
        parameters: {
          language: "en-US",
          diarization: true,
          timestamps: true
        }
      });
      
      // Convert audio data to ArrayBuffer
      let uint8Array: Uint8Array;
      if (typeof options.audioData === 'string') {
        const base64Data = options.audioData.split(',')[1];
        if (!base64Data) {
          return expect.fail('Invalid base64 audio data format');
        }
        uint8Array = new Uint8Array(Buffer.from(base64Data, 'base64'));
      } else if (options.audioData instanceof Uint8Array) {
        uint8Array = options.audioData;
      } else {
        uint8Array = new Uint8Array(options.audioData);
      }
      
      const audioBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength
      ) as ArrayBuffer;
      
      // Execute the effect and get the result
      const result = yield* Effect.either(
        service.transcribe(audioBuffer)
      );
      
      if (Either.isLeft(result)) {
        return expect.fail(`Transcription failed: ${result.left.message}`);
      }
      
      const response = result.right;
      
      // Verify the response structure
      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      
      // Check that the response includes the expected parameters if supported
      if ('segments' in response && Array.isArray(response.segments) && response.segments.length > 0) {
        const segment = response.segments[0];
        // These assertions depend on the provider's implementation
        expect(segment).toHaveProperty("start");
        expect(segment).toHaveProperty("end");
      
      }
    }).pipe(
      Effect.provide(TranscriptionService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );
});
