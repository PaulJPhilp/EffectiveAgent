/**
 * @file Chat Service implementation for AI chat completion
 * @module services/pipeline/producers/chat/service
 */
import { TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { EffectiveInput, EffectiveMessage } from "@/types.js";
import { Chunk, Effect, Option, Ref } from "effect";
import { ChatInputError, ChatModelError } from "./errors.js";
/**
 * ChatService provides methods for generating chat completions using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
export class ChatService extends Effect.Service()("ChatService", {
    effect: Effect.gen(function* () {
        // Get services directly
        const modelService = yield* ModelService;
        const providerService = yield* ProviderService;
        const initialState = {
            completionCount: 0,
            lastCompletion: Option.none(),
            lastUpdate: Option.none(),
            completionHistory: []
        };
        // Create internal state management
        const internalStateRef = yield* Ref.make(initialState);
        yield* Effect.log("ChatService initialized");
        // Helper function to update internal state
        const updateState = (completion) => Effect.gen(function* () {
            const currentState = yield* Ref.get(internalStateRef);
            const updatedHistory = [
                ...currentState.completionHistory,
                completion
            ].slice(-20); // Keep last 20 completions
            const newState = {
                completionCount: currentState.completionCount + 1,
                lastCompletion: completion.success ? Option.none() : currentState.lastCompletion,
                lastUpdate: Option.some(Date.now()),
                completionHistory: updatedHistory
            };
            yield* Ref.set(internalStateRef, newState);
            yield* Effect.log("Updated chat completion state", {
                oldCount: currentState.completionCount,
                newCount: newState.completionCount
            });
        });
        const service = {
            /**
             * Creates a new chat completion (legacy method for compatibility)
             */
            create: (options) => service.generate({
                ...options,
                span: options.span || {}
            }).pipe(Effect.map(response => response.data)),
            /**
             * Generates a chat completion from the given messages and model
             */
            generate: (options) => {
                return Effect.gen(function* () {
                    // Log start of chat completion
                    yield* Effect.log("Starting chat completion", {
                        modelId: options.modelId,
                        inputLength: options.input?.length ?? 0
                    });
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
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(Effect.mapError(() => new ChatModelError({
                        description: "Model ID must be provided",
                        module: "ChatService",
                        method: "generate"
                    })));
                    // Get provider for the model
                    const providerName = yield* modelService.getProviderName(modelId);
                    const providerClient = yield* providerService.getProviderClient(providerName);
                    // Prepare messages array
                    const messages = [];
                    if (options.system) {
                        messages.push({ role: "system", content: options.system });
                    }
                    messages.push({ role: "user", content: options.input });
                    // Create EffectiveMessages
                    const effectiveMessages = messages.map(msg => new EffectiveMessage({
                        role: msg.role,
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: msg.content }))
                    }));
                    // Create EffectiveInput
                    const effectiveInput = new EffectiveInput(options.input, Chunk.fromIterable(effectiveMessages));
                    // Call the real AI provider
                    const providerResult = yield* providerClient.chat(effectiveInput, {
                        modelId,
                        parameters: {
                            temperature: options.parameters?.temperature ?? 0.7,
                            maxTokens: options.parameters?.maxTokens ?? 1000,
                            topP: options.parameters?.topP ?? 1,
                            frequencyPenalty: options.parameters?.frequencyPenalty ?? 0,
                            presencePenalty: options.parameters?.presencePenalty ?? 0,
                            stop: options.parameters?.stop
                        },
                        system: options.system
                    });
                    const completion = {
                        content: providerResult.data.text,
                        finishReason: providerResult.data.finishReason,
                        usage: providerResult.data.usage,
                        toolCalls: (providerResult.data.toolCalls || []).map(toolCall => ({
                            id: toolCall.id,
                            type: "function",
                            function: {
                                name: toolCall.function.name,
                                arguments: JSON.parse(toolCall.function.arguments)
                            }
                        })),
                        providerMetadata: {
                            model: modelId,
                            provider: providerName,
                            ...Object.fromEntries(Object.entries(providerResult.data.providerMetadata || {})
                                .filter(([key]) => key !== 'capabilities' && key !== 'configSchema'))
                        }
                    };
                    const response = {
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
                }).pipe(Effect.withSpan("ChatService.generate"), Effect.catchAll((error) => {
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
                }));
            },
            /**
             * Get the current agent state for monitoring/debugging
             */
            getAgentState: () => Ref.get(internalStateRef),
            /**
             * Terminate the service (no-op since we don't have external runtime)
             */
            terminate: () => Effect.succeed(void 0)
        };
        return service;
    })
}) {
}
export default ChatService;
//# sourceMappingURL=service.js.map