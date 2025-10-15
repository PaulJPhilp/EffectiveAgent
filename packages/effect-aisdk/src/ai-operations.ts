/**
 * @file Core AI operations - Effect wrappers around Vercel AI SDK
 * @module @effective-agent/ai-sdk/ai-operations
 */

import type { EmbeddingModel, LanguageModelV1 } from "ai";
import { embedMany, generateObject, generateText, streamText } from "ai";
import { Chunk, Effect } from "effect";
import { type AiSdkMessageTransformError, AiSdkOperationError } from "./errors.js";
import type { EffectiveInput, GenerateObjectOptions, GenerateTextOptions } from "./input-types.js";
import { toVercelMessages } from "./message-transformer.js";
import type { GenerateEmbeddingsResult, GenerateObjectResult, GenerateTextResult } from "./result-types.js";
import type { BaseAiParameters, EffectiveResponse, EffectiveUsage } from "./types.js";

/**
 * Generate text using a language model
 */
export function generateTextWithModel(
  model: LanguageModelV1,
  input: EffectiveInput,
  options?: Partial<GenerateTextOptions>
): Effect.Effect<EffectiveResponse<GenerateTextResult>, AiSdkOperationError | AiSdkMessageTransformError> {
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
export function generateObjectWithModel<T>(
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
export function generateEmbeddingsWithModel(
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
        id: "embedding-" + Date.now(),
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
