/**
 * @file Chat Agent implementation using AgentRuntime for AI chat completion
 * @module services/pipeline/producers/chat/service
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { EffectiveInput, EffectiveMessage, EffectiveResponse } from "@/types.js";
import { Effect, Option, Ref } from "effect";
import type { ChatServiceApi } from "./api.js";
import { ChatInputError, ChatModelError } from "./errors.js";
import type { ChatCompletionOptions, ChatCompletionResult } from "./types.js";

/**
 * Chat generation agent state
 */
export interface ChatAgentState {
    readonly completionCount: number
    readonly lastCompletion: Option.Option<ChatCompletionResult>
    readonly lastUpdate: Option.Option<number>
    readonly completionHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly inputLength: number
        readonly responseLength: number
        readonly success: boolean
        readonly finishReason: string
        readonly toolCallsCount: number
    }>
}

/**
 * Chat generation commands
 */
interface GenerateChatCommand {
    readonly type: "GENERATE_CHAT"
    readonly options: ChatCompletionOptions
}

interface StateUpdateCommand {
    readonly type: "UPDATE_STATE"
    readonly completion: ChatCompletionResult
    readonly modelId: string
    readonly inputLength: number
    readonly success: boolean
}

type ChatActivityPayload = GenerateChatCommand | StateUpdateCommand

/**
 * ChatService provides methods for generating chat completions using AI providers.
 * Now implemented as an Agent using AgentRuntime for state management and activity tracking.
 */
export class ChatService extends Effect.Service<ChatServiceApi>()(
    "ChatService",
    {
        effect: Effect.gen(function* () {
            // Get services
            const agentRuntimeService = yield* AgentRuntimeService;
            const modelService = yield* ModelService;
            const providerService = yield* ProviderService;

            const agentId = makeAgentRuntimeId("chat-service-agent");

            const initialState: ChatAgentState = {
                completionCount: 0,
                lastCompletion: Option.none(),
                lastUpdate: Option.none(),
                completionHistory: []
            };

            // Create the agent runtime
            const runtime = yield* agentRuntimeService.create(agentId, initialState);

            // Create internal state management
            const internalStateRef = yield* Ref.make<ChatAgentState>(initialState);

            yield* Effect.log("ChatService agent initialized");

            // Helper function to update internal state
            const updateState = (completion: {
                readonly timestamp: number
                readonly modelId: string
                readonly inputLength: number
                readonly responseLength: number
                readonly success: boolean
                readonly finishReason: string
                readonly toolCallsCount: number
            }) => Effect.gen(function* () {
                const currentState = yield* Ref.get(internalStateRef);

                const updatedHistory = [
                    ...currentState.completionHistory,
                    completion
                ].slice(-20); // Keep last 20 completions

                const newState: ChatAgentState = {
                    completionCount: currentState.completionCount + 1,
                    lastCompletion: completion.success ? Option.none() : currentState.lastCompletion,
                    lastUpdate: Option.some(Date.now()),
                    completionHistory: updatedHistory
                };

                yield* Ref.set(internalStateRef, newState);

                // Also update the AgentRuntime state for consistency
                const stateUpdateActivity: AgentActivity = {
                    id: `chat-update-${Date.now()}`,
                    agentRuntimeId: agentId,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: newState,
                    metadata: {},
                    sequence: 0
                };
                yield* runtime.send(stateUpdateActivity);

                yield* Effect.log("Updated chat completion state", {
                    oldCount: currentState.completionCount,
                    newCount: newState.completionCount
                });
            });

            const service: ChatServiceApi = {
                /**
                 * Creates a new chat completion (legacy method for compatibility)
                 */
                create: (options: Omit<ChatCompletionOptions, 'span'> & { span?: any }) =>
                    service.generate({
                        ...options,
                        span: options.span || {} as any
                    }).pipe(
                        Effect.map(response => response.data)
                    ),

                /**
                 * Generates a chat completion from the given messages and model
                 */
                generate: (options: ChatCompletionOptions) => {
                    return Effect.gen(function* () {
                        // Log start of chat completion
                        yield* Effect.log("Starting chat completion", {
                            modelId: options.modelId,
                            inputLength: options.input?.length ?? 0
                        });

                        // Send command activity to agent
                        const activity: AgentActivity = {
                            id: `chat-generate-${Date.now()}`,
                            agentRuntimeId: agentId,
                            timestamp: Date.now(),
                            type: AgentActivityType.COMMAND,
                            payload: { type: "GENERATE_CHAT", options } satisfies GenerateChatCommand,
                            metadata: {},
                            sequence: 0
                        };

                        yield* runtime.send(activity);

                        // Validate input
                        if (!options.input || options.input.length === 0) {
                            yield* Effect.logError("No input provided");
                            return yield* Effect.fail(new ChatInputError({
                                description: "Input is required for chat completion",
                                module: "ChatService",
                                method: "generate"
                            }));
                        }

                        // Get model ID or fail
                        const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                            Effect.mapError(() => new ChatModelError({
                                description: "Model ID must be provided",
                                module: "ChatService",
                                method: "generate"
                            }))
                        );

                        // Get provider for the model
                        const providerName = yield* modelService.getProviderName(modelId);
                        const providerClient = yield* providerService.getProviderClient(providerName);

                        // Prepare messages array
                        const messages = [];
                        if (options.system) {
                            messages.push({ role: "system", content: options.system });
                        }
                        messages.push({ role: "user", content: options.input });

                        // Create EffectiveInput for the provider
                        const effectiveInput = new EffectiveInput({
                            text: options.input,
                            messages: messages.map(msg => new EffectiveMessage({
                                role: msg.role as "system" | "user" | "assistant",
                                content: msg.content
                            }))
                        });

                        // Call the real AI provider
                        const providerResult = yield* providerClient.chat(effectiveInput, {
                            modelId,
                            temperature: options.parameters?.temperature,
                            maxTokens: options.parameters?.maxTokens,
                            topP: options.parameters?.topP,
                            frequencyPenalty: options.parameters?.frequencyPenalty,
                            presencePenalty: options.parameters?.presencePenalty,
                            stop: options.parameters?.stop,
                            system: options.system
                        });

                        const completion: ChatCompletionResult = {
                            content: providerResult.data.text,
                            finishReason: providerResult.data.finishReason,
                            usage: providerResult.data.usage,
                            toolCalls: providerResult.data.toolCalls || [],
                            providerMetadata: {
                                model: modelId,
                                provider: providerName,
                                ...providerResult.data.providerMetadata
                            }
                        };

                        const response: EffectiveResponse<ChatCompletionResult> = {
                            data: completion,
                            metadata: {
                                model: modelId,
                                provider: providerName,
                                inputLength: options.input.length,
                                systemPromptLength: options.system?.length || 0
                            }
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
                            toolCallsCount: completion.toolCalls.length
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
                                    toolCallsCount: 0
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

export default ChatService;
