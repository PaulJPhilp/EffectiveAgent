/**
 * @file Implements the TextService for handling AI text generation using the ProviderService.
 * @module services/ai/producers/text/service
 */

import { Effect, Option, ConfigProvider } from "effect";
import * as Chunk from "effect/Chunk";
import { Message } from "@effect/ai/AiInput";
import type { Span } from "effect/Tracer";
import type { EffectiveResponse, GenerateTextResult } from "@/services/ai/provider/types.js";
import type { TextServiceError } from "./errors.js";
import { AiRole } from '@effect/ai';
import { ProviderServiceApi } from '@/services/ai/provider/api.js';
import type { TextServiceApi, TextGenerationOptions } from "./api.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { EffectiveInput } from "@/services/ai/input/service.js";
import { TextModelError, TextProviderError, TextGenerationError, TextInputError } from "./errors.js";

/**
 * Parameters for text generation
 */
export interface TextGenerationParameters {
    [key: string]: unknown;
    maxSteps?: number;
    maxRetries?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    seed?: number;
    stop?: string[];
}

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
import type { TestHarnessApi } from "@/services/core/test-harness/api.js";

export interface TextServiceDeps {
    readonly modelService: ModelServiceApi;
    readonly providerService: ProviderServiceApi;
    readonly testHarness: TestHarnessApi;
}

/**
 * TextService provides methods for generating AI text responses using configured providers.
 */
class TextService extends Effect.Service<TextServiceApi>()("TextService", {
  effect: Effect.gen(function* () {
    // Get services
    const modelService = yield* ModelService;
    const providerService = yield* ProviderService;

    return {
      /**
       * Generates a text completion from the given prompt and model.
       */
      generate: (options: TextGenerationOptions): Effect.Effect<
        EffectiveResponse<GenerateTextResult>,
        TextModelError | TextProviderError | TextGenerationError | TextInputError,
        ConfigProvider.ConfigProvider
      > => {

        return Effect.gen(function* (_) {
          // Validate prompt
          if (!options.prompt || options.prompt.trim() === "") {
            return yield* Effect.fail(new TextInputError({
              description: "Prompt cannot be empty",
              module: "TextService",
              method: "generate"
            }));
          }

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

          // Call the provider client and map the error
          const generationEffect = providerClient.generateText(
            effectiveInput,
            {
              modelId,
              system: systemPrompt,
              parameters: {
                maxTokens: options.parameters?.['maxSteps'],
                maxRetries: options.parameters?.['maxRetries'],
                temperature: options.parameters?.['temperature'],
                topP: options.parameters?.['topP'],
                topK: options.parameters?.['topK'],
                presencePenalty: options.parameters?.['presencePenalty'],
                frequencyPenalty: options.parameters?.['frequencyPenalty'],
                seed: options.parameters?.['seed'],
                stop: options.parameters?.['stop']
              },
              signal: options.signal
            }
          ).pipe(
            // Map only the error, keeping the success type as EffectiveResponse<GenerateTextResult>
            Effect.mapError((error) => new TextGenerationError({
              description: "Text generation failed",
              module: "TextService",
              method: "generate",
              cause: error
            }))
          );

          // Return the Effect directly
          return yield* generationEffect;

        }).pipe(
          Effect.withSpan("TextService.generate")
        );
      }
    };
  }),
  dependencies: [] as const
}) {}

export default TextService;