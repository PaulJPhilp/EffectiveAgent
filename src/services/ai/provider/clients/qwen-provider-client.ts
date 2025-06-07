import { EffectiveMessage, ModelCapability, TextPart, ToolCallPart } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import { type CoreMessage as VercelCoreMessage } from "ai";
import { Chunk, Effect } from "effect";
import { ToolRegistryService } from '../../tool-registry/service.js';
import type { ProviderClientApi } from "../api.js";
import {
    ProviderMissingCapabilityError,
    ProviderMissingModelIdError,
    ProviderNotFoundError,
    ProviderOperationError,
    ProviderServiceConfigError
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
    EffectiveProviderApi,
    GenerateEmbeddingsResult,
    GenerateObjectResult,
    GenerateTextResult,
    ProviderChatOptions,
    ProviderGenerateEmbeddingsOptions,
    ProviderGenerateImageOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateTextOptions,
    ProviderTranscribeOptions,
    ToolCallRequest
} from "../types.js";

// Map AI SDK finish reasons to EffectiveAgent finish reasons
function mapFinishReason(finishReason: string): FinishReason {
    switch (finishReason) {
        case "stop": return "stop";
        case "length": return "length";
        case "content-filter": return "content_filter";
        case "tool-calls": return "tool_calls";
        case "error": return "error";
        case "other": return "stop";
        case "unknown": return "stop";
        default: return "stop";
    }
}

// Helper to convert EA messages to Vercel AI SDK CoreMessage format
function mapEAMessagesToVercelMessages(eaMessages: ReadonlyArray<EffectiveMessage>): VercelCoreMessage[] {
    return eaMessages.map(msg => {
        const messageParts = Chunk.toReadonlyArray(msg.parts);
        let textContent = "";

        if (messageParts.length === 1 && messageParts[0]?._tag === "Text") {
            textContent = (messageParts[0] as TextPart).content;
        } else {
            textContent = messageParts
                .filter(part => part._tag === "Text")
                .map(part => (part as TextPart).content)
                .join("\n");
        }

        if (msg.role === "user" || msg.role === "assistant" || msg.role === "system") {
            return { role: msg.role, content: textContent };
        } else if (msg.role === "tool") {
            const toolCallId = (msg.metadata?.toolCallId as string) || "";
            const toolName = (msg.metadata?.toolName as string) || "unknown";
            return {
                role: "tool" as const,
                content: [{
                    type: "tool-result" as const,
                    toolCallId: toolCallId,
                    toolName: toolName,
                    result: textContent
                }]
            };
        }
        return { role: "user", content: textContent };
    });
}

// Helper to convert a Vercel AI SDK message to an EA EffectiveMessage
function mapVercelMessageToEAEffectiveMessage(vercelMsg: VercelCoreMessage, modelId: string): EffectiveMessage {
    let eaParts: Array<TextPart | ToolCallPart> = [];

    if (Array.isArray(vercelMsg.content)) {
        vercelMsg.content.forEach(part => {
            if (part.type === "text") {
                eaParts.push(new TextPart({ _tag: "Text", content: part.text }));
            }
        });
    } else if (typeof vercelMsg.content === "string") {
        eaParts.push(new TextPart({ _tag: "Text", content: vercelMsg.content }));
    }

    if ((vercelMsg as any).tool_calls) {
        (vercelMsg as any).tool_calls.forEach((tc: any) => {
            const toolCallRequest: ToolCallRequest = {
                id: tc.id || tc.tool_call_id,
                type: "tool_call",
                function: {
                    name: tc.tool_name || (tc.function && tc.function.name),
                    arguments: JSON.stringify(tc.args || (tc.function && tc.function.arguments))
                }
            };
            eaParts.push(new ToolCallPart({ _tag: "ToolCall", toolCall: JSON.stringify(toolCallRequest) }));
        });
    }

    return new EffectiveMessage({
        role: vercelMsg.role as EffectiveMessage["role"],
        parts: Chunk.fromIterable(eaParts),
        metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` }
    });
}

// Internal factory for ProviderService only
function makeQwenClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService> {
    // Create a simple provider that matches the Qwen API interface
    const qwenProvider = (modelId: string) => ({
        modelId,
        apiKey,
        baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    });

    return Effect.succeed({
        // Tool-related methods - Qwen supports tools
        validateToolInput: (toolName: string, input: unknown) =>
            Effect.tryPromise({
                try: () => Promise.resolve(true), // Basic validation
                catch: (error) => new ProviderOperationError({
                    providerName: "qwen",
                    operation: "validateToolInput",
                    message: `Failed to validate tool input: ${error}`,
                    module: "qwen",
                    method: "validateToolInput",
                    cause: error
                })
            }),

        executeTool: (toolName: string, input: unknown) =>
            Effect.tryPromise({
                try: () => Promise.resolve({ result: "Tool execution not implemented" }),
                catch: (error) => new ProviderOperationError({
                    providerName: "qwen",
                    operation: "executeTool",
                    message: `Failed to execute tool: ${error}`,
                    module: "qwen",
                    method: "executeTool",
                    cause: error
                })
            }),

        processToolResult: (toolName: string, result: unknown) =>
            Effect.succeed(result),

        // Provider and capability methods
        getProvider: () => Effect.succeed({
            name: "qwen" as const,
            provider: {} as any, // Raw provider not needed for EffectiveProviderApi
            capabilities: new Set<ModelCapability>(["chat", "text-generation", "function-calling", "vision"])
        }),

        getCapabilities: () =>
            Effect.succeed(new Set<ModelCapability>(["chat", "text-generation", "function-calling", "vision"])),

        // Core generation methods
        generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.gen(function* () {
            try {
                const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
                const modelId = options.modelId || "qwen-plus";

                // Mock implementation for testing - replace with real Vercel AI SDK call when qwen-ai-provider is available
                const result = yield* Effect.tryPromise({
                    try: () => Promise.resolve({
                        text: "Mock response from Qwen model",
                        finishReason: "stop",
                        usage: {
                            promptTokens: 10,
                            completionTokens: 20,
                            totalTokens: 30
                        },
                        response: {
                            messages: []
                        }
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "qwen",
                        operation: "generateText",
                        message: `Failed to generate text: ${error}`,
                        module: "qwen",
                        method: "generateText",
                        cause: error
                    })
                });

                const responseMessages = result.response?.messages || [];
                const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));

                const textResult: GenerateTextResult = {
                    id: `qwen-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    text: result.text,
                    finishReason: mapFinishReason(result.finishReason),
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    },
                    messages: [{
                        role: "assistant",
                        content: result.text
                    }],
                    toolCalls: []
                };

                return {
                    data: textResult,
                    metadata: {
                        model: modelId,
                        provider: "qwen",
                        requestId: `qwen-${Date.now()}`
                    },
                    usage: textResult.usage,
                    finishReason: textResult.finishReason
                };
            } catch (error) {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "qwen",
                    operation: "generateText",
                    message: `Failed to generate text: ${error}`,
                    module: "qwen",
                    method: "generateText",
                    cause: error
                }));
            }
        }),

        generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => Effect.gen(function* () {
            try {
                const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
                const modelId = options.modelId || "qwen-plus";

                // Mock implementation for testing - replace with real Vercel AI SDK call when qwen-ai-provider is available
                const result = yield* Effect.tryPromise({
                    try: () => Promise.resolve({
                        object: { mockProperty: "Mock object from Qwen" },
                        finishReason: "stop",
                        usage: {
                            promptTokens: 10,
                            completionTokens: 20,
                            totalTokens: 30
                        }
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "qwen",
                        operation: "generateObject",
                        message: `Failed to generate object: ${error}`,
                        module: "qwen",
                        method: "generateObject",
                        cause: error
                    })
                });

                const objectResult: GenerateObjectResult<T> = {
                    id: `qwen-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    object: result.object as T,
                    finishReason: mapFinishReason(result.finishReason),
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    }
                };

                return {
                    data: objectResult,
                    metadata: {
                        model: modelId,
                        provider: "qwen",
                        requestId: `qwen-${Date.now()}`
                    },
                    usage: objectResult.usage,
                    finishReason: objectResult.finishReason
                };
            } catch (error) {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "qwen",
                    operation: "generateObject",
                    message: `Failed to generate object: ${error}`,
                    module: "qwen",
                    method: "generateObject",
                    cause: error
                }));
            }
        }),

        // Unsupported capabilities
        generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
            Effect.fail(new ProviderMissingCapabilityError({
                providerName: "qwen",
                capability: "image-generation",
                module: "qwen",
                method: "generateImage"
            })),

        generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
            Effect.fail(new ProviderMissingCapabilityError({
                providerName: "qwen",
                capability: "audio",
                module: "qwen",
                method: "generateSpeech"
            })),

        transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
            Effect.fail(new ProviderMissingCapabilityError({
                providerName: "qwen",
                capability: "audio",
                module: "qwen",
                method: "transcribe"
            })),

        generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) => Effect.gen(function* () {
            try {
                const modelId = options.modelId || "text-embedding-v3";

                // Mock implementation for testing - replace with real Vercel AI SDK call when qwen-ai-provider is available
                const result = yield* Effect.tryPromise({
                    try: () => Promise.resolve({
                        embeddings: input.map(() => new Array(1024).fill(0)),
                        usage: {
                            promptTokens: 10,
                            completionTokens: 0,
                            totalTokens: 10
                        }
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "qwen",
                        operation: "generateEmbeddings",
                        message: `Failed to generate embeddings: ${error}`,
                        module: "qwen",
                        method: "generateEmbeddings",
                        cause: error
                    })
                });

                const embeddingsResult: GenerateEmbeddingsResult = {
                    id: `qwen-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    embeddings: result.embeddings,
                    dimensions: 1024,
                    texts: input,
                    parameters: {
                        modelParameters: { modelId, dimensions: 1024 },
                        normalization: "l2",
                        preprocessing: []
                    },
                    finishReason: "stop",
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    }
                };

                return {
                    data: embeddingsResult,
                    metadata: {
                        model: modelId,
                        provider: "qwen",
                        requestId: `qwen-${Date.now()}`
                    },
                    usage: embeddingsResult.usage,
                    finishReason: embeddingsResult.finishReason
                };
            } catch (error) {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "qwen",
                    operation: "generateEmbeddings",
                    message: `Failed to generate embeddings: ${error}`,
                    module: "qwen",
                    method: "generateEmbeddings",
                    cause: error
                }));
            }
        }),

        // Chat method - delegates to generateText since Qwen doesn't support tools
        chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) => Effect.gen(function* () {
            if (options.tools && options.tools.length > 0) {
                return yield* Effect.fail(new ProviderMissingCapabilityError({
                    providerName: "qwen",
                    capability: "tool-use",
                    module: "qwen",
                    method: "chat"
                }));
            }

            // Delegate to generateText for simple chat without tools
            const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(effectiveInput.messages || Chunk.empty()));
            const modelId = options.modelId || "qwen-plus";

            const result = yield* Effect.tryPromise({
                try: () => Promise.resolve({
                    text: "Mock response from Qwen model",
                    finishReason: "stop",
                    usage: {
                        promptTokens: 10,
                        completionTokens: 20,
                        totalTokens: 30
                    },
                    response: {
                        messages: []
                    }
                }),
                catch: (error) => new ProviderOperationError({
                    providerName: "qwen",
                    operation: "chat",
                    message: `Failed to generate text: ${error}`,
                    module: "qwen",
                    method: "chat",
                    cause: error
                })
            });

            const responseMessages = result.response?.messages || [];
            const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));

            const chatResult: GenerateTextResult = {
                id: `qwen-${Date.now()}`,
                model: modelId,
                timestamp: new Date(),
                text: result.text,
                finishReason: mapFinishReason(result.finishReason),
                usage: {
                    promptTokens: result.usage?.promptTokens || 0,
                    completionTokens: result.usage?.completionTokens || 0,
                    totalTokens: result.usage?.totalTokens || 0
                },
                messages: [{
                    role: "assistant",
                    content: result.text
                }],
                toolCalls: []
            };

            return {
                data: chatResult,
                metadata: {
                    model: modelId,
                    provider: "qwen",
                    requestId: `qwen-${Date.now()}`
                },
                usage: chatResult.usage,
                finishReason: chatResult.finishReason
            };
        }),

        // Model management
        getModels: () => Effect.succeed([]),

        getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) => {
            if (providerName !== "qwen") {
                return Effect.fail(new ProviderMissingModelIdError({
                    providerName,
                    capability,
                    module: "qwen",
                    method: "getDefaultModelIdForProvider"
                }));
            }

            switch (capability) {
                case "chat":
                case "text-generation":
                case "function-calling":
                    return Effect.succeed("qwen-plus");
                case "vision":
                    return Effect.succeed("qwen-vl-plus");
                default:
                    return Effect.fail(new ProviderMissingModelIdError({
                        providerName,
                        capability,
                        module: "qwen",
                        method: "getDefaultModelIdForProvider"
                    }));
            }
        },

        // Vercel provider integration
        setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
            Effect.succeed(undefined)
    });
}

export { makeQwenClient };
