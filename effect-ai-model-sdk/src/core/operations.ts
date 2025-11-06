/**
 * @file Core AI operations - Effect wrappers around Vercel AI SDK
 * @module @org_name/effect-ai-model-sdk/core/operations
 */

import type { EmbeddingModel, ImageModelV1, LanguageModelV1 } from "ai";
import { embedMany, generateImage, generateObject, generateSpeech, generateText, transcribe } from "ai";
import { Effect } from "effect";
import { type AiSdkMessageTransformError, AiSdkOperationError } from "../errors.js";
import type { EffectiveInput, GenerateObjectOptions, GenerateTextOptions } from "../types/inputs.js";
import { toVercelMessages } from "../types/transformers.js";
import type { GenerateEmbeddingsResult, GenerateObjectResult, GenerateTextResult } from "../types/results.js";
import type { EffectiveResponse, } from "../types/core.js";

/**
 * Generate text using a language model
 */
export function generateText(
  model: LanguageModelV1,
  input: EffectiveInput,
  options?: Partial<GenerateTextOptions>
): Effect.Effect<EffectiveResponse<GenerateTextResult>, AiSdkOperationError | AiSdkMessageTransformError> {
  return Effect.gen(function* () {
    yield* Effect.log("Starting text generation", {
      model: (model as any).modelId || "unknown",
      hasMessages: !!input.messages,
      hasText: !!input.text,
    });

    try {
      // Convert messages if provided
      let messages: any[] = [];
      if (input.messages) {
        messages = yield* toVercelMessages(input.messages);
      } else if (input.text) {
        messages = [{ role: "user", content: input.text }];
      }

      // Call Vercel AI SDK
      const result = yield* Effect.tryPromise({
        try: () => generateText({
          model,
          messages,
          system: options?.system,
          temperature: options?.parameters?.temperature,
          maxTokens: options?.parameters?.maxTokens,
          topP: options?.parameters?.topP,
          frequencyPenalty: options?.parameters?.frequencyPenalty,
          presencePenalty: options?.parameters?.presencePenalty,
          seed: options?.parameters?.seed,
        }),
        catch: (error) => new AiSdkOperationError({
          message: "Failed to generate text",
          operation: "generateText",
          cause: error,
        }),
      });

      // Transform result
      const textResult: GenerateTextResult = {
        id: result.response.id,
        model: result.response.modelId,
        timestamp: result.response.timestamp,
        text: result.text,
        finishReason: result.finishReason as any,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
        warnings: result.warnings?.map(w => ({
          code: w.type || "warning",
          message: "type" in w ? `${w.type}: ${(w as any).setting || ""}` : "warning"
        })),
      };

      yield* Effect.log("Text generation completed successfully", {
        model: result.response.modelId,
        tokens: textResult.usage.totalTokens,
      });

      return {
        data: textResult,
        metadata: {
          model: result.response.modelId,
          provider: "unknown",
        },
        usage: textResult.usage,
        finishReason: textResult.finishReason,
      };
    } catch (error) {
      yield* Effect.logError("Text generation failed", { error });
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during text generation",
          operation: "generateText",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate a structured object using a language model
 */
export function generateObject<T>(
  model: LanguageModelV1,
  input: EffectiveInput,
  schema: any,
  options?: Partial<GenerateObjectOptions<T>>
): Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, AiSdkOperationError | AiSdkMessageTransformError> {
  return Effect.gen(function* () {
    try {
      // Convert messages if provided
      let messages: any[] = [];
      if (input.messages) {
        messages = yield* toVercelMessages(input.messages);
      } else if (input.text) {
        messages = [{ role: "user", content: input.text }];
      }

      // Call Vercel AI SDK
      const result = yield* Effect.tryPromise({
        try: () => generateObject({
          model,
          messages,
          schema,
          system: options?.system,
          temperature: options?.parameters?.temperature,
          maxTokens: options?.parameters?.maxTokens,
          topP: options?.parameters?.topP,
        }),
        catch: (error) => new AiSdkOperationError({
          message: "Failed to generate object",
          operation: "generateObject",
          cause: error,
        }),
      });

      // Transform result
      const objectResult: GenerateObjectResult<T> = {
        id: result.response.id,
        model: result.response.modelId,
        timestamp: result.response.timestamp,
        object: result.object as T,
        finishReason: result.finishReason as any,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
      };

      return {
        data: objectResult,
        metadata: {
          model: result.response.modelId,
          provider: "unknown",
        },
        usage: objectResult.usage,
        finishReason: objectResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during object generation",
          operation: "generateObject",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate embeddings for text inputs
 */
export function generateEmbeddings(
  model: EmbeddingModel<string>,
  texts: string[]
): Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, AiSdkOperationError> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise({
        try: () => embedMany({
          model,
          values: texts,
        }),
        catch: (error) => new AiSdkOperationError({
          message: "Failed to generate embeddings",
          operation: "embedMany",
          cause: error,
        }),
      });

      // Transform result
      const embeddingsResult: GenerateEmbeddingsResult = {
        id: `embedding-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        embeddings: result.embeddings,
        dimensions: result.embeddings[0]?.length || 0,
        texts,
        finishReason: "stop",
        usage: {
          promptTokens: result.usage?.tokens || 0,
          completionTokens: 0,
          totalTokens: result.usage?.tokens || 0,
        },
        parameters: {},
      };

      return {
        data: embeddingsResult,
        metadata: {
          model: "unknown",
          provider: "unknown",
        },
        usage: embeddingsResult.usage,
        finishReason: embeddingsResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during embedding generation",
          operation: "embedMany",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate images using an image model
 */
export function generateImages(
  model: ImageModelV1,
  prompt: string,
  options?: { n?: number; size?: string; aspectRatio?: string }
): Effect.Effect<EffectiveResponse<GenerateImageResult>, AiSdkOperationError> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise({
        try: () => generateImage({
          model,
          prompt,
          n: options?.n ?? 1,
          size: options?.size as any,
          aspectRatio: options?.aspectRatio as any,
        }),
        catch: (error) => new AiSdkOperationError({
          message: "Failed to generate image",
          operation: "generateImage",
          cause: error,
        }),
      });

      // Transform result
      const imageResult: GenerateImageResult = {
        id: result.response.id || `image-${Date.now()}`,
        model: result.response.modelId || "unknown",
        timestamp: result.response.timestamp || new Date(),
        imageUrl: result.images[0]?.url || "",
        additionalImages: result.images.slice(1).map(img => img.url || ""),
        parameters: {
          size: options?.size,
        },
        usage: {
          promptTokens: 0, // Image generation doesn't use text tokens in the same way
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: "stop",
      };

      return {
        data: imageResult,
        metadata: {
          model: result.response.modelId || "unknown",
          provider: "unknown",
        },
        usage: imageResult.usage,
        finishReason: imageResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during image generation",
          operation: "generateImage",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate speech using a speech model
 */
export function generateAudio(
  model: any, // SpeechModelV1 not exported from ai package yet
  input: string,
  options?: { voice?: string; speed?: number }
): Effect.Effect<EffectiveResponse<GenerateSpeechResult>, AiSdkOperationError> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise({
        try: () => generateSpeech({
          model,
          text: input,
          voice: options?.voice as any,
          speed: options?.speed,
        }),
        catch: (error) => new AiSdkOperationError({
          message: "Failed to generate speech",
          operation: "generateSpeech",
          cause: error,
        }),
      });

      // Transform result
      const speechResult: GenerateSpeechResult = {
        id: result.response.id || `speech-${Date.now()}`,
        model: result.response.modelId || "unknown",
        timestamp: result.response.timestamp || new Date(),
        audioData: result.audio || "",
        format: "mp3", // Default format
        parameters: {
          voice: options?.voice,
          speed: options?.speed,
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: "stop",
      };

      return {
        data: speechResult,
        metadata: {
          model: result.response.modelId || "unknown",
          provider: "unknown",
        },
        usage: speechResult.usage,
        finishReason: speechResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during speech generation",
          operation: "generateSpeech",
          cause: error,
        })
      );
    }
  });
}

/**
 * Transcribe audio using a transcription model
 */
export function transcribeAudio(
  model: any, // TranscriptionModelV1 not exported yet
  audio: Uint8Array,
  options?: { language?: string }
): Effect.Effect<EffectiveResponse<TranscribeResult>, AiSdkOperationError> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise({
        try: () => transcribe({
          model,
          audio: { data: audio },
          language: options?.language,
        }),
        catch: (error) => new AiSdkOperationError({
          message: "Failed to transcribe audio",
          operation: "transcribe",
          cause: error,
        }),
      });

      // Transform result
      const transcriptionResult: TranscribeResult = {
        id: result.response.id || `transcription-${Date.now()}`,
        model: result.response.modelId || "unknown",
        timestamp: result.response.timestamp || new Date(),
        text: result.text,
        segments: result.segments?.map(seg => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          confidence: seg.confidence,
        })),
        detectedLanguage: result.language,
        parameters: {
          language: options?.language,
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: "stop",
      };

      return {
        data: transcriptionResult,
        metadata: {
          model: result.response.modelId || "unknown",
          provider: "unknown",
        },
        usage: transcriptionResult.usage,
        finishReason: transcriptionResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during audio transcription",
          operation: "transcribe",
          cause: error,
        })
      );
    }
  });
}
