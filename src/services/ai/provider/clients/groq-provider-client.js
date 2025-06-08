import { EffectiveMessage, TextPart, ToolCallPart } from "@/schema.js";
import { createGroq } from "@ai-sdk/groq";
import { generateObject, generateText, experimental_transcribe as transcribe } from "ai";
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
function makeGroqClient(apiKey) {
    const groqProvider = createGroq({ apiKey });
    return Effect.succeed({
        // Tool-related methods - Groq supports tools
        validateToolInput: (toolName, input) => Effect.succeed(true), // Basic validation - could be enhanced
        executeTool: (toolName, input) => Effect.succeed({ result: "Tool execution not implemented" }), // Placeholder
        processToolResult: (toolName, result) => Effect.succeed(result),
        // Provider and capability methods
        getProvider: () => Effect.succeed({
            name: "groq",
            provider: {}, // Raw provider not needed for EffectiveProviderApi
            capabilities: new Set(["chat", "text-generation", "object-generation", "tool-use", "audio"])
        }),
        getCapabilities: () => Effect.succeed(new Set(["chat", "text-generation", "object-generation", "tool-use", "audio"])),
        // Core generation methods
        generateText: (input, options) => Effect.gen(function* () {
            try {
                const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
                const modelId = options.modelId || "llama-3.3-70b-versatile";
                const result = yield* Effect.tryPromise({
                    try: () => generateText({
                        model: groqProvider(modelId),
                        messages: vercelMessages,
                        system: options.system,
                        maxTokens: options.parameters?.maxTokens,
                        temperature: options.parameters?.temperature,
                        topP: options.parameters?.topP,
                        topK: options.parameters?.topK,
                        presencePenalty: options.parameters?.presencePenalty,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        stopSequences: options.parameters?.stop,
                        seed: options.parameters?.seed,
                        maxRetries: 2,
                        abortSignal: options.signal
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "groq",
                        operation: "generateText",
                        message: `Failed to generate text: ${error}`,
                        module: "groq",
                        method: "generateText",
                        cause: error
                    })
                });
                const responseMessages = result.response?.messages || [];
                const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));
                const textResult = {
                    id: `groq-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    text: result.text,
                    finishReason: mapFinishReason(result.finishReason),
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    },
                    toolCalls: [],
                    reasoning: result.reasoning
                };
                return {
                    data: textResult,
                    metadata: {
                        model: modelId,
                        provider: "groq",
                        requestId: `groq-${Date.now()}`
                    },
                    usage: textResult.usage,
                    finishReason: textResult.finishReason
                };
            }
            catch (error) {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "groq",
                    operation: "generateText",
                    message: `Failed to generate text: ${error}`,
                    module: "groq",
                    method: "generateText",
                    cause: error
                }));
            }
        }),
        generateObject: (input, options) => Effect.gen(function* () {
            try {
                const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
                const modelId = options.modelId || "llama-3.3-70b-versatile";
                const result = yield* Effect.tryPromise({
                    try: () => generateObject({
                        model: groqProvider(modelId),
                        messages: vercelMessages,
                        schema: options.schema,
                        system: options.system,
                        maxTokens: options.parameters?.maxTokens,
                        temperature: options.parameters?.temperature,
                        topP: options.parameters?.topP,
                        topK: options.parameters?.topK,
                        presencePenalty: options.parameters?.presencePenalty,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        stopSequences: options.parameters?.stop,
                        seed: options.parameters?.seed,
                        maxRetries: 2,
                        abortSignal: options.signal
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "groq",
                        operation: "generateObject",
                        message: `Failed to generate object: ${error}`,
                        module: "groq",
                        method: "generateObject",
                        cause: error
                    })
                });
                const objectResult = {
                    id: `groq-${Date.now()}`,
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
                        provider: "groq",
                        requestId: `groq-${Date.now()}`
                    },
                    usage: objectResult.usage,
                    finishReason: objectResult.finishReason
                };
            }
            catch (error) {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "groq",
                    operation: "generateObject",
                    message: `Failed to generate object: ${error}`,
                    module: "groq",
                    method: "generateObject",
                    cause: error
                }));
            }
        }),
        // Transcription support
        transcribe: (input, options) => Effect.gen(function* () {
            try {
                const modelId = options.modelId || "whisper-large-v3";
                const result = yield* Effect.tryPromise({
                    try: () => transcribe({
                        model: groqProvider.transcription(modelId),
                        audio: input,
                        providerOptions: {
                            groq: {
                                language: options.language,
                                temperature: options.parameters?.temperature,
                                timestampGranularities: options.timestamps ? ["word", "segment"] : ["segment"]
                            }
                        },
                        abortSignal: options.signal
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "groq",
                        operation: "transcribe",
                        message: `Failed to transcribe audio: ${error}`,
                        module: "groq",
                        method: "transcribe",
                        cause: error
                    })
                });
                const transcribeResult = {
                    id: `groq-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    text: result.text,
                    finishReason: "stop",
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    },
                    segments: result.segments?.map(segment => ({
                        id: segment.id,
                        start: segment.start,
                        end: segment.end,
                        text: segment.text,
                        confidence: segment.confidence,
                        speaker: segment.speaker,
                        language: segment.language
                    })),
                    detectedLanguage: result.detectedLanguage,
                    duration: result.duration,
                    parameters: {
                        language: options.language,
                        diarization: options.diarization,
                        timestamps: options.timestamps,
                        quality: "standard"
                    }
                };
                return {
                    data: transcribeResult,
                    metadata: {
                        model: modelId,
                        provider: "groq",
                        requestId: `groq-${Date.now()}`
                    },
                    usage: transcribeResult.usage,
                    finishReason: transcribeResult.finishReason
                };
            }
            catch (error) {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "groq",
                    operation: "transcribe",
                    message: `Failed to transcribe audio: ${error}`,
                    module: "groq",
                    method: "transcribe",
                    cause: error
                }));
            }
        }),
        // Unsupported capabilities
        generateImage: (input, options) => Effect.fail(new ProviderMissingCapabilityError({
            providerName: "groq",
            capability: "image-generation",
            module: "groq",
            method: "generateImage"
        })),
        generateSpeech: (input, options) => Effect.fail(new ProviderMissingCapabilityError({
            providerName: "groq",
            capability: "audio",
            module: "groq",
            method: "generateSpeech"
        })),
        generateEmbeddings: (input, options) => Effect.fail(new ProviderMissingCapabilityError({
            providerName: "groq",
            capability: "embeddings",
            module: "groq",
            method: "generateEmbeddings"
        })),
        // Chat method - supports tools
        chat: (effectiveInput, options) => Effect.gen(function* () {
            const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(effectiveInput.messages || Chunk.empty()));
            const modelId = options.modelId || "llama-3.3-70b-versatile";
            const result = yield* Effect.tryPromise({
                try: () => generateText({
                    model: groqProvider(modelId),
                    messages: vercelMessages,
                    system: options.system,
                    tools: options.tools ? Object.fromEntries(options.tools.map(tool => [tool.name, {
                            description: tool.description,
                            parameters: tool.parameters
                        }])) : undefined,
                    maxTokens: options.parameters?.maxTokens,
                    temperature: options.parameters?.temperature,
                    topP: options.parameters?.topP,
                    topK: options.parameters?.topK,
                    presencePenalty: options.parameters?.presencePenalty,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                    stopSequences: options.parameters?.stop,
                    seed: options.parameters?.seed,
                    maxRetries: 2,
                    abortSignal: options.signal
                }),
                catch: (error) => new ProviderOperationError({
                    providerName: "groq",
                    operation: "chat",
                    message: `Failed to generate text: ${error}`,
                    module: "groq",
                    method: "chat",
                    cause: error
                })
            });
            const responseMessages = result.response?.messages || [];
            const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));
            const chatResult = {
                id: `groq-${Date.now()}`,
                model: modelId,
                timestamp: new Date(),
                text: result.text,
                finishReason: mapFinishReason(result.finishReason),
                usage: {
                    promptTokens: result.usage?.promptTokens || 0,
                    completionTokens: result.usage?.completionTokens || 0,
                    totalTokens: result.usage?.totalTokens || 0
                },
                toolCalls: result.toolCalls?.map(tc => ({
                    id: tc.toolCallId,
                    type: "tool_call",
                    function: {
                        name: tc.toolName,
                        arguments: JSON.stringify(tc.args)
                    }
                })) || [],
                reasoning: result.reasoning
            };
            return {
                data: chatResult,
                metadata: {
                    model: modelId,
                    provider: "groq",
                    requestId: `groq-${Date.now()}`
                },
                usage: chatResult.usage,
                finishReason: chatResult.finishReason
            };
        }),
        // Model management
        getModels: () => Effect.succeed([]),
        getDefaultModelIdForProvider: (providerName, capability) => {
            if (providerName !== "groq") {
                return Effect.fail(new ProviderMissingModelIdError({
                    providerName,
                    capability,
                    module: "groq",
                    method: "getDefaultModelIdForProvider"
                }));
            }
            switch (capability) {
                case "chat":
                case "text-generation":
                case "object-generation":
                case "tool-use":
                    return Effect.succeed("llama-3.3-70b-versatile");
                case "audio":
                    return Effect.succeed("whisper-large-v3");
                default:
                    return Effect.fail(new ProviderMissingModelIdError({
                        providerName,
                        capability,
                        module: "groq",
                        method: "getDefaultModelIdForProvider"
                    }));
            }
        },
        // Vercel provider integration
        setVercelProvider: (vercelProvider) => Effect.succeed(undefined)
    });
}
export { makeGroqClient };
//# sourceMappingURL=groq-provider-client.js.map