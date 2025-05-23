/**
 * @file Implements the TextService for handling AI text generation using the ProviderService.
 * @module services/ai/producers/text/service
 */

import { TextPart } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderServiceApi } from "@/services/ai/provider/api.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { TestHarnessApi } from "@/services/core/test-harness/api.js";
import type { TextServiceApi } from "@/services/pipeline/producers/text/api.js";
import { TextGenerationError, TextInputError, TextModelError, TextProviderError } from "@/services/pipeline/producers/text/errors.js";
import type { TextGenerationOptions } from "@/services/pipeline/producers/text/types.js";
import type { GenerateBaseResult as SharedApiGenerateBaseResult } from "@/services/pipeline/types.js"; // Added alias
import type { GenerateTextResult as ProviderGenerateTextResult } from "@/services/ai/provider/types.js"; // Added alias
import { EffectiveInput, EffectiveMessage, EffectiveUsage, EffectiveResponse } from "@/types.js"; // Added EffectiveResponse
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import * as Option from "effect/Option";

/**
 * Parameters for text generation
 */
export interface TextGenerationParameters {
  [key: string]: unknown;
  maxTokens?: number;
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
    readonly usage?: EffectiveUsage;
    readonly finishReason: string;
    readonly model: string;
    readonly timestamp: Date;
    readonly id: string;
  };
}

/**
 * Dependencies for TextService.
 */

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
      generate: (options: TextGenerationOptions) => {
        return Effect.gen(function* () {
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
          const textPart = new TextPart({ _tag: "Text", content: finalPrompt });
          const message = new EffectiveMessage({
            role: "user",
            parts: Chunk.make(textPart)
          });
          const effectiveInput = new EffectiveInput(
            finalPrompt,
            Chunk.make(message)
          );

          // Call the provider client and map the error
          const generationEffect = providerClient.generateText(
            effectiveInput,
            {
              modelId,
              system: systemPrompt,
              parameters: {

                temperature: options.parameters?.temperature,
                topP: options.parameters?.topP,
                topK: options.parameters?.topK,
                presencePenalty: options.parameters?.presencePenalty,
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

          // Transform the provider's GenerateTextResult to the API's EffectiveResponse<GenerateBaseResult>
          return yield* generationEffect.pipe(
            // Assuming providerOutput is EffectiveResponse<ProviderGenerateTextResult> based on lint errors
            Effect.map((providerWrappedOutput: EffectiveResponse<ProviderGenerateTextResult>) => {
              const providerOutputData = providerWrappedOutput.data; // This is ProviderGenerateTextResult

              // 1. Create the 'data' part for the final EffectiveResponse, this is SharedApiGenerateBaseResult
              const sharedApiData: SharedApiGenerateBaseResult = {
                output: providerOutputData.text,
                usage: providerOutputData.usage, // providerOutputData has usage from its GenerateBaseResult parent
                finishReason: providerOutputData.finishReason as SharedApiGenerateBaseResult['finishReason'],
                providerMetadata: providerOutputData.providerMetadata as Record<string, unknown> | undefined // Cast added here
              };

              // 2. Create the final EffectiveResponse<SharedApiGenerateBaseResult>
              const finalResponse: EffectiveResponse<SharedApiGenerateBaseResult> = {
                data: sharedApiData,
                // Populate metadata for the outer EffectiveResponse from the provider's wrapped response or providerOutputData
                metadata: {
                  // providerWrappedOutput.metadata might be one source if it exists and is structured
                  // providerOutputData (ProviderGenerateTextResult) also has id, model, timestamp from its base
                  id: providerOutputData.id,
                  model: providerOutputData.model,
                  timestamp: providerOutputData.timestamp,
                  providerName: providerName // Captured earlier
                },
                // Populate top-level fields of the final EffectiveResponse
                // These might be sourced from providerWrappedOutput or sharedApiData
                usage: providerWrappedOutput.usage ?? sharedApiData.usage, // Prefer top-level from wrapper if available
                finishReason: (providerWrappedOutput.finishReason ?? sharedApiData.finishReason) as SharedApiGenerateBaseResult['finishReason'],
                providerMetadata: (providerWrappedOutput.providerMetadata as Record<string, unknown> | undefined) ?? sharedApiData.providerMetadata
                // messages: providerWrappedOutput.messages, // If applicable
              };
              return finalResponse;
            })
          );

        }).pipe(
          Effect.withSpan("TextService.generate")
        );
      }
    };
  }),
  dependencies: [] as const
}) { }

// Export the TextService as default
export default TextService;