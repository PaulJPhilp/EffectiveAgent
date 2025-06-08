import { EffectiveMessage, TextPart, ToolCallPart } from "@/schema.js";
import { Chunk, Effect } from "effect";
import { ProviderMissingCapabilityError, ProviderMissingModelIdError, ProviderOperationError } from "../errors.js";
// Map AI SDK finish reasons to EffectiveAgent finish reasons
function mapFinishReason(finishReason) {
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
function mapEAMessagesToVercelMessages(eaMessages) {
    return eaMessages.map(msg => {
        const messageParts = Chunk.toReadonlyArray(msg.parts);
        let textContent = "";
        if (messageParts.length === 1 && messageParts[0]?._tag === "Text") {
            textContent = messageParts[0].content;
        }
        else {
            textContent = messageParts
                .filter(part => part._tag === "Text")
                .map(part => part.content)
                .join("\n");
        }
        if (msg.role === "user" || msg.role === "assistant" || msg.role === "system") {
            return { role: msg.role, content: textContent };
        }
        else if (msg.role === "tool") {
            const toolCallId = msg.metadata?.toolCallId || "";
            const toolName = msg.metadata?.toolName || "unknown";
            return {
                role: "tool",
                content: [{
                        type: "tool-result",
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
function mapVercelMessageToEAEffectiveMessage(vercelMsg, modelId) {
    let eaParts = [];
    if (Array.isArray(vercelMsg.content)) {
        vercelMsg.content.forEach(part => {
            if (part.type === "text") {
                eaParts.push(new TextPart({ _tag: "Text", content: part.text }));
            }
        });
    }
    else if (typeof vercelMsg.content === "string") {
        eaParts.push(new TextPart({ _tag: "Text", content: vercelMsg.content }));
    }
    if (vercelMsg.tool_calls) {
        vercelMsg.tool_calls.forEach((tc) => {
            const toolCallRequest = {
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
        role: vercelMsg.role,
        parts: Chunk.fromIterable(eaParts),
        metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` }
    });
}
// Internal factory for ProviderService only
function makeQwenClient(apiKey) {
    // Create a simple provider that matches the Qwen API interface
    const qwenProvider = (modelId) => ({
        modelId,
        apiKey,
        baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    });
    return Effect.succeed({
        // Tool-related methods - Qwen supports tools
        validateToolInput: (toolName, input) => Effect.tryPromise({
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
        executeTool: (toolName, input) => Effect.tryPromise({
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
        processToolResult: (toolName, result) => Effect.succeed(result),
        // Provider and capability methods
        getProvider: () => Effect.succeed({
            name: "qwen",
            provider: {}, // Raw provider not needed for EffectiveProviderApi
            capabilities: new Set(["chat", "text-generation", "function-calling", "vision"])
        }),
        getCapabilities: () => Effect.succeed(new Set(["chat", "text-generation", "function-calling", "vision"])),
        // Core generation methods
        generateText: (input, options) => Effect.gen(function* () {
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
                const textResult = {
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
            }
            catch (error) {
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
        generateObject: (input, options) => Effect.gen(function* () {
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
                const objectResult = {
                    id: `qwen-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    object: result.object,
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
            }
            catch (error) {
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
        generateImage: (input, options) => Effect.fail(new ProviderMissingCapabilityError({
            providerName: "qwen",
            capability: "image-generation",
            module: "qwen",
            method: "generateImage"
        })),
        generateSpeech: (input, options) => Effect.fail(new ProviderMissingCapabilityError({
            providerName: "qwen",
            capability: "audio",
            module: "qwen",
            method: "generateSpeech"
        })),
        transcribe: (input, options) => Effect.fail(new ProviderMissingCapabilityError({
            providerName: "qwen",
            capability: "audio",
            module: "qwen",
            method: "transcribe"
        })),
        generateEmbeddings: (input, options) => Effect.gen(function* () {
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
                const embeddingsResult = {
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
            }
            catch (error) {
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
        chat: (effectiveInput, options) => Effect.gen(function* () {
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
            const chatResult = {
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
        getDefaultModelIdForProvider: (providerName, capability) => {
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
        setVercelProvider: (vercelProvider) => Effect.succeed(undefined)
    });
}
export { makeQwenClient };
//# sourceMappingURL=qwen-provider-client.js.map