/**
 * @file Text Agent implementation using AgentRuntime for AI text generation
 * @module services/pipeline/producers/text/service
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { TextServiceApi } from "@/services/pipeline/producers/text/api.js";
import { TextInputError, TextModelError } from "@/services/pipeline/producers/text/errors.js";
import type { TextGenerationOptions } from "@/services/pipeline/producers/text/types.js";
import { EffectiveResponse } from "@/types.js";
import { Effect, Option, Ref } from "effect";

/**
 * Text generation agent state
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
 * Text generation commands
 */
interface GenerateTextCommand {
  readonly type: "GENERATE_TEXT"
  readonly options: TextGenerationOptions
}

interface StateUpdateCommand {
  readonly type: "UPDATE_STATE"
  readonly generation: string
  readonly modelId: string
  readonly promptLength: number
  readonly success: boolean
}

type TextActivityPayload = GenerateTextCommand | StateUpdateCommand

/**
 * TextService provides methods for generating AI text responses using configured providers.
 * Now implemented as an Agent using AgentRuntime for state management and activity tracking.
 */
class TextService extends Effect.Service<TextServiceApi>()(
  "TextService",
  {
    effect: Effect.gen(function* () {
      // Get services
      const agentRuntimeService = yield* AgentRuntimeService;
      const modelService = yield* ModelService;
      const providerService = yield* ProviderService;

      const agentId = makeAgentRuntimeId("text-service-agent");

      const initialState: TextAgentState = {
        generationCount: 0,
        lastGeneration: Option.none(),
        lastUpdate: Option.none(),
        generationHistory: []
      };

      // Create the agent runtime
      const runtime = yield* agentRuntimeService.create(agentId, initialState);

      // Create internal state management
      const internalStateRef = yield* Ref.make<TextAgentState>(initialState);

      yield* Effect.log("TextService agent initialized");

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

        // Also update the AgentRuntime state for consistency
        const stateUpdateActivity: AgentActivity = {
          id: `text-update-${Date.now()}`,
          agentRuntimeId: agentId,
          timestamp: Date.now(),
          type: AgentActivityType.STATE_CHANGE,
          payload: newState,
          metadata: {},
          sequence: 0
        };
        yield* runtime.send(stateUpdateActivity);

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

            // Send command activity to agent
            const activity: AgentActivity = {
              id: `text-generate-${Date.now()}`,
              agentRuntimeId: agentId,
              timestamp: Date.now(),
              type: AgentActivityType.COMMAND,
              payload: { type: "GENERATE_TEXT", options } satisfies GenerateTextCommand,
              metadata: {},
              sequence: 0
            };

            yield* runtime.send(activity);

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
            const providerClient = yield* providerService.getProviderClient(providerName);

            // Prepare the final prompt
            const systemPrompt = Option.getOrElse(options.system, () => "");
            const finalPrompt = systemPrompt
              ? `${systemPrompt}\n\n${options.prompt}`
              : options.prompt;

            // Call the real AI provider
            const providerResult = yield* providerClient.generateText(finalPrompt, {
              modelId,
              temperature: options.parameters?.temperature,
              maxTokens: options.parameters?.maxTokens,
              topP: options.parameters?.topP,
              frequencyPenalty: options.parameters?.frequencyPenalty,
              presencePenalty: options.parameters?.presencePenalty,
              stop: options.parameters?.stop
            });

            const response: EffectiveResponse<string> = {
              data: providerResult.text,
              metadata: {
                model: modelId,
                provider: providerName,
                promptLength: finalPrompt.length,
                outputLength: providerResult.text.length,
                usage: providerResult.usage
              }
            };

            yield* Effect.log("Text generation completed successfully");

            // Update agent state with generation results
            yield* updateState({
              timestamp: Date.now(),
              modelId,
              promptLength: finalPrompt.length,
              outputLength: response.data.length,
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
         * Get the runtime for direct access in tests
         */
        getRuntime: () => runtime,

        /**
         * Terminate the agent
         */
        terminate: () => agentRuntimeService.terminate(agentId)
      };

      return service;
    }),
    dependencies: [AgentRuntimeService.Default, ModelService.Default, ProviderService.Default]
  }
) { }

export default TextService;