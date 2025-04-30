/**
 * @file Implements the TextService for handling AI text generation using the ProviderService.
 * @module services/ai/producers/text/service
 */

import { Effect, Option, ConfigProvider } from "effect";
import * as Chunk from "effect/Chunk";
import { Message } from "@effect/ai/AiInput";
import type { Span } from "effect/Tracer";
import { AiResponse } from "@effect/ai/AiResponse";
import type { TextServiceError } from "./errors.js";
import { AiRole } from '@effect/ai';
import { ProviderServiceApi } from '../../provider/api.js';
import type { TextServiceApi, TextGenerationOptions } from "./api.js";
import type { ModelServiceApi } from "../../model/api.js";
import { TestConfig } from "effect/TestConfig";
import { EffectiveInput } from "../../input/service.js";
import { TextModelError, TextProviderError, TextGenerationError } from "./errors.js";

/**
 * Result shape expected from the underlying provider client's generateText method
 */
export interface ProviderTextGenerationResult {
    readonly data: {
        readonly text: string;
        readonly reasoning?: string;
        readonly reasoningDetails?: unknown;
        readonly sources?: unknown[];
        readonly messages?: unknown[];
        readonly warnings?: unknown[];
    };
    readonly metadata: {
        readonly usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
        readonly finishReason: string;
        readonly model: string;
        readonly timestamp: Date;
        readonly id: string;
    };
}

/**
 * Dependencies for TextService.
 */
import type { AiTestConfig } from "../../test-utils/service.js";

export interface TextServiceDeps {
    readonly modelService: ModelServiceApi;
    readonly providerService: ProviderServiceApi;
    readonly config: AiTestConfig;
}

/**
 * TextService provides methods for generating AI text responses using configured providers.
 */
class TextService extends Effect.Service<TextServiceApi>()("TextService", {
  effect: Effect.gen(function* (_) {
    // Create a reference to store dependencies
    const depsRef = yield* Effect.succeed({
      modelService: null as unknown as ModelServiceApi,
      providerService: null as unknown as ProviderServiceApi,
      config: null as unknown as AiTestConfig
    });
    
    return {
      /**
       * Generates a text completion from the given prompt and model.
       */
      generate: (options: TextGenerationOptions): Effect.Effect<
        AiResponse,
        TextModelError | TextProviderError | TextGenerationError,
        ConfigProvider.ConfigProvider
      > => {
        const { modelService, providerService } = depsRef;
        return Effect.gen(function* (_) {
          // Get model ID or fail
          const modelId = yield* Effect.fromNullable(options.modelId).pipe(
            Effect.mapError(() => new TextModelError({
              description: "Model ID must be provided",
              module: "TextService",
              method: "generate"
            }))
          );

          // Get provider name from model service
          const providerName = yield* modelService.getProviderName(modelId).pipe(
            Effect.mapError((error) => new TextProviderError({
              description: "Failed to get provider name for model",
              module: "TextService",
              method: "generate",
              cause: error
            }))
          );

          // Get provider client
          const providerClient = yield* providerService.getProviderClient(providerName).pipe(
            Effect.mapError((error) => new TextProviderError({
              description: "Failed to get provider client",
              module: "TextService",
              method: "generate",
              cause: error
            }))
          );

          // If system prompt is provided, prepend it to the prompt
          let finalPrompt = options.prompt;
          const systemPrompt = Option.getOrUndefined(options.system);
          if (systemPrompt) {
            finalPrompt = `${systemPrompt}\n\n${finalPrompt}`;
          }

          yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
          yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

          // Create EffectiveInput from the final prompt
          const effectiveInput = new EffectiveInput(Chunk.make(Message.fromInput(finalPrompt)));

          const result = yield* providerClient.generateText(
            effectiveInput,
            { modelId, system: systemPrompt, ...options.parameters }
          ).pipe(
            Effect.map((res) => res.data),
            Effect.mapError((error) => new TextGenerationError({
              description: "Text generation failed",
              module: "TextService",
              method: "generate",
              cause: error
            }))
          );

          // Map the result to AiResponse
          return AiResponse.fromText({
            role: AiRole.model,
            content: result.text
          });
        }).pipe(
          Effect.withSpan("TextService.generate")
        );
      }
    };
  }),
  dependencies: [
    {
      service: "modelService",
      layer: (deps: TextServiceDeps) => Effect.succeed(deps.modelService)
    },
    {
      service: "providerService",
      layer: (deps: TextServiceDeps) => Effect.succeed(deps.providerService)
    },
    {
      service: "config",
      layer: (deps: TextServiceDeps) => Effect.succeed(deps.config)
    }
  ]
}) {}

/**
 * Factory function to create a new TextService instance with dependencies.
 * @param deps - Required service dependencies
 * @returns Effect containing the TextService Layer
 */
export const makeTextService = (deps: TextServiceDeps) => {
  return Effect.succeed(deps);
};

export default TextService;