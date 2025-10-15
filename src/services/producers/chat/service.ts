import { NodeFileSystem, NodePath } from "@effect/platform-node";
/**
 * @file Chat Service implementation for AI chat completion
 * @module services/pipeline/producers/chat/service
 */
import { generateTextWithModel, TextPart } from "@effective-agent/ai-sdk";
import { Chunk, Effect, Option, Ref } from "effect";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import { ResilienceService } from "@/services/execution/resilience/service.js";
import {
  EffectiveMessage,
  type EffectiveResponse
} from "@/types.js";
import type { ChatServiceApi } from "./api.js";
import { ChatInputError, ChatModelError } from "./errors.js";
import type { ChatCompletionOptions, ChatCompletionResult } from "./types.js";

/**
 * Chat generation agent state
 */
export interface ChatAgentState {
  readonly completionCount: number;
  readonly lastCompletion: Option.Option<ChatCompletionResult>;
  readonly lastUpdate: Option.Option<number>;
  readonly completionHistory: ReadonlyArray<{
    readonly timestamp: number;
    readonly modelId: string;
    readonly inputLength: number;
    readonly responseLength: number;
    readonly success: boolean;
    readonly finishReason: string;
    readonly toolCallsCount: number;
  }>;
}

/**
 * ChatService provides methods for generating chat completions using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
export class ChatService extends Effect.Service<ChatServiceApi>()(
  "ChatService",
  {
    effect: Effect.gen(function* () {
      // Get services directly
      const modelService = yield* ModelService;
      const providerService = yield* ProviderService;

      const initialState: ChatAgentState = {
        completionCount: 0,
        lastCompletion: Option.none(),
        lastUpdate: Option.none(),
        completionHistory: [],
      };

      // Create internal state management
      const internalStateRef = yield* Ref.make<ChatAgentState>(initialState);

      yield* Effect.log("ChatService initialized");

      // Helper function to update internal state
      const updateState = (completion: {
        readonly timestamp: number;
        readonly modelId: string;
        readonly inputLength: number;
        readonly responseLength: number;
        readonly success: boolean;
        readonly finishReason: string;
        readonly toolCallsCount: number;
      }) =>
        Effect.gen(function* () {
          const currentState = yield* Ref.get(internalStateRef);

          const updatedHistory = [
            ...currentState.completionHistory,
            completion,
          ].slice(-20); // Keep last 20 completions

          const newState: ChatAgentState = {
            completionCount: currentState.completionCount + 1,
            lastCompletion: completion.success
              ? Option.none()
              : currentState.lastCompletion,
            lastUpdate: Option.some(Date.now()),
            completionHistory: updatedHistory,
          };

          yield* Ref.set(internalStateRef, newState);

          yield* Effect.log("Updated chat completion state", {
            oldCount: currentState.completionCount,
            newCount: newState.completionCount,
          });
        });

      const service: ChatServiceApi = {
        /**
         * Creates a new chat completion (legacy method for compatibility)
         */
        create: (
          options: Omit<ChatCompletionOptions, "span"> & { span?: any }
        ) =>
          service
            .generate({
              ...options,
              span: options.span || ({} as any),
            })
            .pipe(Effect.map((response) => response.data)),

        /**
         * Generates a chat completion from the given messages and model
         */
        generate: (options: ChatCompletionOptions) => {
          return Effect.gen(function* () {
            // Log start of chat completion
            yield* Effect.log("Starting chat completion", {
              modelId: options.modelId,
              inputLength: options.input?.length ?? 0,
            });

            // Validate input
            if (!options.input || options.input.length === 0) {
              yield* Effect.logError("No input provided");
              return yield* Effect.fail(
                new ChatInputError({
                  description: "Input is required for chat completion",
                  module: "ChatService",
                  method: "generate",
                })
              );
            }

            // Get model ID or fail
            const modelId = yield* Effect.fromNullable(options.modelId).pipe(
              Effect.mapError(
                () =>
                  new ChatModelError({
                    description: "Model ID must be provided",
                    module: "ChatService",
                    method: "generate",
                  })
              )
            );

            // Get provider for the model
            const providerName = yield* modelService.getProviderName(modelId);
            const languageModel = yield* providerService.getAiSdkLanguageModel(
              providerName,
              modelId
            );

            // Prepare messages array
            const messages = [];
            if (options.system) {
              messages.push({ role: "system", content: options.system });
            }
            messages.push({ role: "user", content: options.input });

            // Create EffectiveMessages
            const effectiveMessages = messages.map(
              (msg) =>
                new EffectiveMessage({
                  role: msg.role as "system" | "user" | "assistant",
                  parts: Chunk.of(
                    new TextPart({ _tag: "Text", content: msg.content })
                  ),
                })
            );

            // Call ai-sdk operation directly
            const aiSdkResult = yield* generateTextWithModel(languageModel, {
              text: options.input,
              messages: Chunk.fromIterable(effectiveMessages)
            }, {
              system: options.system,
              parameters: {
                temperature: options.parameters?.temperature ?? 0.7,
                maxTokens: options.parameters?.maxTokens ?? 1000,
                topP: options.parameters?.topP ?? 1,
                frequencyPenalty: options.parameters?.frequencyPenalty ?? 0,
                presencePenalty: options.parameters?.presencePenalty ?? 0,
              },
            });

            const completion: ChatCompletionResult = {
              content: aiSdkResult.data.text,
              finishReason: aiSdkResult.data.finishReason,
              usage: aiSdkResult.data.usage,
              toolCalls: (aiSdkResult.data.toolCalls || []).map(
                (toolCall) => ({
                  id: toolCall.id,
                  type: "function" as const,
                  function: {
                    name: toolCall.function.name,
                    arguments: JSON.parse(toolCall.function.arguments),
                  },
                })
              ),
              providerMetadata: {
                model: modelId,
                provider: providerName,
                ...aiSdkResult.data.providerMetadata
              },
            };

            const response: EffectiveResponse<ChatCompletionResult> = {
              data: completion,
              metadata: {
                model: modelId,
                provider: providerName,
                inputLength: options.input.length,
                systemPromptLength: options.system?.length || 0,
              },
            };

            yield* Effect.log("Chat completion completed successfully");

            // Update agent state with completion results
            yield* updateState({
              timestamp: Date.now(),
              modelId,
              inputLength: options.input.length + (options.system?.length || 0),
              responseLength: completion.content.length,
              success: true,
              finishReason: completion.finishReason,
              toolCallsCount: completion.toolCalls.length,
            });

            return response;
          }).pipe(
            Effect.withSpan("ChatService.generate"),
            Effect.catchAll((error) => {
              return Effect.gen(function* () {
                yield* Effect.logError("Chat completion failed", { error });

                // Update state with failure
                yield* updateState({
                  timestamp: Date.now(),
                  modelId: options.modelId || "unknown",
                  inputLength: options.input?.length || 0,
                  responseLength: 0,
                  success: false,
                  finishReason: "error",
                  toolCallsCount: 0,
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
         * Terminate the service (no-op since we don't have external runtime)
         */
        terminate: () => Effect.succeed(void 0),
      };

      return service;
    }),
    dependencies: [
      ModelService.Default,
      ProviderService.Default,
      ToolRegistryService.Default,
      ConfigurationService.Default,
      OrchestratorService.Default,
      ResilienceService.Default,
      NodeFileSystem.layer,
      NodePath.layer
    ]
  }
) { }

export default ChatService;
