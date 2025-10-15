/**
 * @file Text Agent implementation for AI text generation
 * @module services/pipeline/producers/text/service
 */

import { generateTextWithModel } from "@effective-agent/ai-sdk";
import { Chunk, Effect, Option, Ref } from "effect";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { GenerateTextResult } from "@/services/ai/provider/types";
import type { TextServiceApi } from "@/services/producers/text/api.js";
import { TextInputError, TextModelError } from "@/services/producers/text/errors.js";
import type { TextGenerationOptions } from "@/services/producers/text/types.js";
import type { EffectiveResponse } from "@/types.js";

/**
 * Text generation agent state (simplified without AgentRuntime)
 */
export interface TextAgentState {
  readonly generationCount: number
  readonly lastGeneration: Option.Option<string>
  readonly lastUpdate: Option.Option<number>
  readonly generationHistory: ReadonlyArray<{
    readonly timestamp: number
    readonly modelId: string
    readonly promptLength: number
    readonly outputLength: number
    readonly success: boolean
  }>
}

/**
 * TextService provides methods for generating AI text responses using configured providers.
 * Simplified implementation without AgentRuntime dependency.
 */
class TextService extends Effect.Service<TextServiceApi>()(
  "TextService",
  {
    effect: Effect.gen(function* () {
      // Get services directly
      const modelService = yield* ModelService;
      const providerService = yield* ProviderService;

      // Create internal state management
      const initialState: TextAgentState = {
        generationCount: 0,
        lastGeneration: Option.none(),
        lastUpdate: Option.none(),
        generationHistory: []
      };

      const internalStateRef = yield* Ref.make<TextAgentState>(initialState);

      yield* Effect.log("TextService initialized");

      // Helper function to update internal state
      const updateState = (generation: {
        readonly timestamp: number
        readonly modelId: string
        readonly promptLength: number
        readonly outputLength: number
        readonly success: boolean
      }) => Effect.gen(function* () {
        const currentState = yield* Ref.get(internalStateRef);

        const updatedHistory = [
          ...currentState.generationHistory,
          generation
        ].slice(-20); // Keep last 20 generations

        const newState: TextAgentState = {
          generationCount: currentState.generationCount + 1,
          lastGeneration: generation.success ? Option.some(generation.modelId) : currentState.lastGeneration,
          lastUpdate: Option.some(Date.now()),
          generationHistory: updatedHistory
        };

        yield* Ref.set(internalStateRef, newState);

        yield* Effect.log("Updated text generation state", {
          oldCount: currentState.generationCount,
          newCount: newState.generationCount
        });
      });

      const service: TextServiceApi = {
        generate: (options: TextGenerationOptions) => {
          return Effect.gen(function* () {
            // Log start of text generation
            yield* Effect.log("Starting text generation", {
              modelId: options.modelId,
              promptLength: options.prompt?.length ?? 0,
              hasSystemPrompt: Option.isSome(options.system)
            });

            // Validate input
            if (!options.prompt || options.prompt.trim().length === 0) {
              yield* Effect.logError("No prompt provided");
              return yield* Effect.fail(new TextInputError({
                description: "Prompt is required for text generation",
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

            // Get provider for the model
            const providerName = yield* modelService.getProviderName(modelId);
            const languageModel = yield* providerService.getAiSdkLanguageModel(providerName, modelId);

            // Prepare the final prompt
            const systemPrompt = Option.getOrElse(options.system, () => "");
            const finalPrompt = systemPrompt
              ? `${systemPrompt}\n\n${options.prompt}`
              : options.prompt;

            // Call ai-sdk operation directly
            const aiSdkResult = yield* generateTextWithModel(languageModel, {
              text: finalPrompt,
              messages: Chunk.empty()
            }, {
              system: Option.getOrUndefined(options.system),
              parameters: {
                temperature: options.parameters?.temperature,
                maxTokens: options.parameters?.maxSteps,
                topP: options.parameters?.topP,
                frequencyPenalty: options.parameters?.frequencyPenalty,
                presencePenalty: options.parameters?.presencePenalty,
              },
            });

            const response: EffectiveResponse<GenerateTextResult> = {
              data: {
                id: crypto.randomUUID(),
                model: modelId,
                timestamp: new Date(),
                text: aiSdkResult.data.text,
                usage: aiSdkResult.data.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                finishReason: aiSdkResult.data.finishReason ?? "stop"
              },
              metadata: {
                model: modelId,
                provider: providerName,
                promptLength: finalPrompt.length,
                outputLength: aiSdkResult.data.text.length,
                usage: aiSdkResult.data.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
              }
            };

            yield* Effect.log("Text generation completed successfully");

            // Update internal state with generation results
            yield* updateState({
              timestamp: Date.now(),
              modelId,
              promptLength: finalPrompt.length,
              outputLength: response.data.text.length,
              success: true
            });

            return response;

          }).pipe(
            Effect.withSpan("TextService.generate"),
            Effect.catchAll((error) => {
              return Effect.gen(function* () {
                yield* Effect.logError("Text generation failed", { error });

                // Update state with failure
                yield* updateState({
                  timestamp: Date.now(),
                  modelId: options.modelId || "unknown",
                  promptLength: options.prompt?.length || 0,
                  outputLength: 0,
                  success: false
                });

                return yield* Effect.fail(error);
              });
            })
          );
        },

        /**
         * Get the current agent state for monitoring/debugging
         */
        getAgentState: () => Ref.get(internalStateRef),

        /**
         * Get the runtime for direct access in tests (no-op without AgentRuntime)
         */
        getRuntime: () => Effect.fail(new Error("Runtime not available in simplified TextService")),

        /**
         * Terminate the service (simplified - just reset state)
         */
        terminate: () => Effect.gen(function* () {
          yield* Ref.set(internalStateRef, initialState);
          yield* Effect.log("TextService terminated");
        })
      };

      return service;
    })
  }
) { }

export { TextService };
