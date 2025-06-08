import { EffectiveMessage, TextPart, ToolCallPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany, experimental_generateImage as generateImage, generateObject, experimental_generateSpeech as generateSpeech, generateText, experimental_transcribe as transcribe } from "ai";
import { Chunk, Effect, Either, Schema as S } from "effect";
import { z } from "zod";
import { ToolRegistryService } from '../../tool-registry/service.js';
import { ProviderMissingModelIdError, ProviderOperationError, ProviderServiceConfigError, ProviderToolError } from "../errors.js";
const MAX_TOOL_ITERATIONS = 5;
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
// Helper function to convert Effect Schema to Zod Schema for Vercel AI SDK tool definitions
function convertEffectSchemaToZodSchema(schema) {
    return Effect.try({
        try: () => {
            // For Vercel AI SDK tool definitions, we create a flexible Zod schema
            // Since we don't have sophisticated schema introspection, 
            // we'll create a basic object schema that accepts any properties
            return z.object({}).passthrough();
        },
        catch: (error) => new ProviderOperationError({
            providerName: "openai",
            operation: "schema-conversion",
            message: `Failed to convert Effect Schema to Zod Schema: ${error}`,
            module: "OpenAIClient",
            method: "convertEffectSchemaToZodSchema",
            cause: error
        })
    });
}
// Helper function to convert Effect Schema to Standard Schema for generateObject
function convertEffectSchemaToStandardSchema(schema) {
    return Effect.try({
        try: () => {
            // Convert Effect Schema to Standard Schema v1 format for generateObject
            // The Vercel AI SDK accepts Standard Schema objects directly for generateObject
            return S.standardSchemaV1(schema);
        },
        catch: (error) => new ProviderOperationError({
            providerName: "openai",
            operation: "schema-conversion",
            message: `Failed to convert Effect Schema to Standard Schema: ${error}`,
            module: "OpenAIClient",
            method: "convertEffectSchemaToStandardSchema",
            cause: error
        })
    });
}
// Internal factory for ProviderService only
function makeOpenAIClient(apiKey) {
    const openaiProvider = createOpenAI({ apiKey });
    return Effect.succeed({
        validateToolInput: (toolName, input) => Effect.fail(new ProviderToolError({
            description: `Tool validation not implemented for ${toolName}`,
            provider: "openai"
        })),
        executeTool: (toolName, input) => Effect.fail(new ProviderToolError({
            description: `Tool execution not implemented for ${toolName}`,
            provider: "openai"
        })),
        processToolResult: (toolName, result) => Effect.fail(new ProviderToolError({
            description: `Tool result processing not implemented for ${toolName}`,
            provider: "openai"
        })),
        chat: (input, options) => Effect.gen(function* () {
            const toolRegistryService = yield* ToolRegistryService;
            let vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
            let llmTools = undefined;
            const modelId = options.modelId || "gpt-4o";
            if (options.tools && options.tools.length > 0) {
                llmTools = {};
                for (const tool of options.tools) {
                    if (tool.implementation._tag === "EffectImplementation") {
                        const effectImpl = tool.implementation;
                        const inputZodSchema = yield* convertEffectSchemaToZodSchema(effectImpl.inputSchema);
                        llmTools[tool.metadata.name] = {
                            description: tool.metadata.description,
                            parameters: inputZodSchema,
                        };
                    }
                    else {
                        yield* Effect.logWarning(`Skipping tool ${tool.metadata.name} due to unsupported implementation type: ${tool.implementation._tag}`);
                    }
                }
            }
            for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
                const vercelResult = yield* Effect.tryPromise({
                    try: async () => {
                        const modelInstance = openaiProvider(modelId);
                        return await generateText({
                            model: modelInstance,
                            messages: vercelMessages,
                            tools: llmTools,
                            system: options.system,
                            temperature: options.parameters?.temperature,
                            maxTokens: options.parameters?.maxTokens,
                            topP: options.parameters?.topP,
                            frequencyPenalty: options.parameters?.frequencyPenalty,
                            presencePenalty: options.parameters?.presencePenalty,
                        });
                    },
                    catch: (error) => new ProviderOperationError({
                        providerName: "openai",
                        operation: "chat.generateText",
                        message: error instanceof Error ? error.message : "Unknown AI SDK error",
                        module: "OpenAIClient",
                        method: "chat.generateTextLoop",
                        cause: error
                    })
                });
                const assistantResponseContent = vercelResult.text;
                const assistantToolCalls = vercelResult.toolCalls;
                const assistantMessage = {
                    role: 'assistant',
                    content: assistantResponseContent
                };
                vercelMessages.push(assistantMessage);
                if (!assistantToolCalls || assistantToolCalls.length === 0) {
                    const mappedFinishReason = mapFinishReason(vercelResult.finishReason);
                    const effectiveResponse = {
                        id: `openai-chat-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        text: assistantResponseContent,
                        finishReason: mappedFinishReason,
                        usage: {
                            promptTokens: vercelResult.usage.promptTokens,
                            completionTokens: vercelResult.usage.completionTokens,
                            totalTokens: vercelResult.usage.totalTokens,
                        },
                        messages: Chunk.isChunk(input.messages) ? input.messages.pipe(Chunk.appendAll(Chunk.fromIterable(vercelMessages.slice(mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages)).length).map(vm => mapVercelMessageToEAEffectiveMessage(vm, modelId))))) : Chunk.fromIterable(vercelMessages.map(vm => mapVercelMessageToEAEffectiveMessage(vm, modelId))),
                    };
                    return {
                        data: effectiveResponse,
                        metadata: { model: modelId, provider: "openai", requestId: vercelResult.experimental_rawResponse?.id },
                        usage: effectiveResponse.usage,
                        finishReason: mappedFinishReason,
                    };
                }
                const toolResultMessagesForLLM = [];
                for (const sdkToolCall of assistantToolCalls) {
                    const toolName = sdkToolCall.toolName;
                    const toolArgs = sdkToolCall.args;
                    let toolExecutionOutputString;
                    // Find the original ToolDefinition from the options to get its schema and EffectImplementation
                    const originalToolDef = options.tools?.find(t => t.metadata.name === toolName);
                    if (!originalToolDef) {
                        yield* Effect.logWarning(`Tool '${toolName}' not found in provided options.tools.`);
                        toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' not found in options.` });
                    }
                    else if (originalToolDef.implementation._tag !== "EffectImplementation") {
                        yield* Effect.logWarning(`Tool '${toolName}' is not an EffectImplementation.`);
                        toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' is not executable by this provider.` });
                    }
                    else {
                        const effectImpl = originalToolDef.implementation;
                        const toolInputZodSchema = yield* convertEffectSchemaToZodSchema(effectImpl.inputSchema);
                        // Attempt to validate arguments using the original Effect Schema first for better error messages
                        const validatedArgsEither = yield* Effect.either(S.decode(effectImpl.inputSchema)(toolArgs));
                        if (Either.isLeft(validatedArgsEither)) {
                            const validationError = validatedArgsEither.left;
                            yield* Effect.logWarning(`Invalid arguments for tool ${toolName}`, validationError);
                            toolExecutionOutputString = JSON.stringify({ error: `Invalid arguments for tool ${toolName}. Validation failed.` }); // Added more detail
                        }
                        else {
                            const validatedArgs = validatedArgsEither.right;
                            // For execution, use the tool resolved by the registry
                            const effectiveToolFromRegistryEither = yield* Effect.either(toolRegistryService.getTool(toolName));
                            if (Either.isLeft(effectiveToolFromRegistryEither)) {
                                yield* Effect.logError(`Tool '${toolName}' was in options.tools but not resolvable by ToolRegistryService.`, effectiveToolFromRegistryEither.left);
                                toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' could not be resolved by registry.` });
                            }
                            else {
                                const effectiveToolFromRegistry = effectiveToolFromRegistryEither.right;
                                const toolEffectToRun = effectiveToolFromRegistry.execute(validatedArgs);
                                const toolRunResultEither = yield* Effect.either(toolEffectToRun);
                                if (Either.isLeft(toolRunResultEither)) {
                                    const execError = toolRunResultEither.left;
                                    yield* Effect.logError(`Tool ${toolName} execution failed`, execError);
                                    toolExecutionOutputString = JSON.stringify({ error: `Tool ${toolName} execution failed: ${execError?.message || 'Unknown execution error'}` });
                                }
                                else {
                                    toolExecutionOutputString = JSON.stringify(toolRunResultEither.right);
                                }
                            }
                        }
                    }
                    const toolMessage = {
                        role: 'tool',
                        content: [{
                                type: "tool-result",
                                toolCallId: sdkToolCall.toolCallId,
                                toolName: toolName,
                                result: toolExecutionOutputString
                            }]
                    };
                    toolResultMessagesForLLM.push(toolMessage);
                }
                vercelMessages.push(...toolResultMessagesForLLM);
                llmTools = undefined;
            }
            yield* Effect.logError("Maximum tool iterations reached for chat.", { modelId });
            return yield* Effect.fail(new ProviderOperationError({
                providerName: "openai",
                operation: "chat",
                message: "Maximum tool iterations reached.",
                module: "OpenAIClient",
                method: "chat.maxIterations"
            }));
        }),
        getProvider: () => Effect.succeed({
            name: "openai",
            provider: {},
            capabilities: new Set(["chat", "text-generation", "embeddings", "image-generation", "function-calling"]),
        }),
        getCapabilities: () => Effect.succeed(new Set(["chat", "text-generation", "embeddings", "image-generation", "function-calling", "tool-use"])),
        generateText: (input, options) => Effect.tryPromise({
            try: async () => {
                const modelId = options.modelId || "gpt-4o";
                const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
                const promptText = input.text || (vercelMessages.length === 0 ? "" : undefined);
                const modelInstance = openaiProvider(modelId);
                const result = await generateText({
                    model: modelInstance,
                    prompt: promptText,
                    messages: vercelMessages.length > 0 ? vercelMessages : undefined,
                    system: options.system,
                    temperature: options.parameters?.temperature,
                    maxTokens: options.parameters?.maxTokens,
                    topP: options.parameters?.topP,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                    presencePenalty: options.parameters?.presencePenalty,
                });
                const textResult = {
                    text: result.text,
                    id: result.experimental_rawResponse?.id || `openai-text-${Date.now()}`,
                    model: result.experimental_rawResponse?.modelId || modelId,
                    timestamp: new Date(),
                    finishReason: mapFinishReason(result.finishReason || "stop"),
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    },
                    toolCalls: result.toolCalls?.map(tc => ({
                        id: tc.toolCallId,
                        type: 'tool_call',
                        function: { name: tc.toolName, arguments: JSON.stringify(tc.args) }
                    })),
                    messages: Chunk.fromIterable(vercelMessages.map(vm => mapVercelMessageToEAEffectiveMessage(vm, modelId))),
                };
                return {
                    data: textResult,
                    metadata: {
                        model: modelId,
                        provider: "openai",
                        requestId: result.experimental_rawResponse?.id || `openai-text-${Date.now()}`
                    },
                    usage: textResult.usage,
                    finishReason: textResult.finishReason
                };
            },
            catch: (error) => new ProviderOperationError({
                providerName: "openai",
                operation: "generateText",
                message: error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "generateText",
                cause: error
            })
        }),
        generateObject: (input, options) => Effect.gen(function* () {
            const modelId = options.modelId || "gpt-4o";
            const schema = options.schema; // This is an Effect.Schema
            const zodSchema = yield* convertEffectSchemaToZodSchema(schema);
            const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
            const promptText = input.text || (vercelMessages.length === 0 ? "" : undefined);
            const modelInstance = openaiProvider(modelId);
            const result = yield* Effect.tryPromise({
                try: () => generateObject({
                    model: modelInstance,
                    schema: zodSchema,
                    prompt: promptText,
                    messages: vercelMessages.length > 0 ? vercelMessages : undefined,
                    temperature: options.parameters?.temperature ?? 0.7,
                    maxTokens: options.parameters?.maxTokens ?? 1000,
                    topP: options.parameters?.topP ?? 1,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                    presencePenalty: options.parameters?.presencePenalty,
                }),
                catch: (error) => new ProviderOperationError({
                    providerName: "openai",
                    operation: "generateObject",
                    message: error instanceof Error ? error.message : "Unknown error",
                    module: "openai",
                    method: "generateObject",
                    cause: error
                })
            });
            return {
                data: {
                    object: result.object,
                    id: result.experimental_rawResponse?.id || `openai-object-${Date.now()}`,
                    model: result.experimental_rawResponse?.modelId || modelId,
                    timestamp: new Date(),
                    finishReason: mapFinishReason(result.finishReason || "stop"),
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    }
                },
                metadata: {
                    model: modelId,
                    provider: "openai",
                    requestId: result.experimental_rawResponse?.id || `openai-object-${Date.now()}`
                },
                usage: {
                    promptTokens: result.usage?.promptTokens || 0,
                    completionTokens: result.usage?.completionTokens || 0,
                    totalTokens: result.usage?.totalTokens || 0
                },
                finishReason: mapFinishReason(result.finishReason || "stop")
            };
        }),
        generateSpeech: (input, options) => Effect.tryPromise({
            try: async () => {
                const modelId = options.modelId || "tts-1";
                const result = await generateSpeech({
                    model: openaiProvider.speech(modelId),
                    text: input,
                    voice: options.voice || "alloy",
                });
                const audioData = Buffer.from(result.audio.uint8Array).toString('base64');
                return {
                    data: {
                        audioData: audioData,
                        format: "mp3",
                        id: `openai-speech-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop",
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                        parameters: {
                            voice: options.voice || "alloy",
                            speed: options.speed
                        }
                    },
                    metadata: { model: modelId, provider: "openai" },
                    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    finishReason: "stop",
                };
            },
            catch: (error) => new ProviderOperationError({
                providerName: "openai",
                operation: "generateSpeech",
                message: error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "generateSpeech",
                cause: error
            })
        }),
        transcribe: (input, options) => Effect.tryPromise({
            try: async () => {
                const modelId = options.modelId || "whisper-1";
                const result = await transcribe({
                    model: openaiProvider.transcription(modelId),
                    audio: input,
                });
                const transcribeResult = {
                    text: result.text,
                    id: `openai-transcribe-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    finishReason: "stop",
                    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    segments: result.segments?.map(s => ({
                        id: Date.now() + Math.random(),
                        start: s.startSecond,
                        end: s.endSecond,
                        text: s.text,
                        confidence: 1.0,
                        speaker: undefined,
                    })),
                    detectedLanguage: result.language,
                    duration: 0,
                    parameters: {
                        language: options.language,
                    }
                };
                return {
                    data: transcribeResult,
                    metadata: { model: modelId, provider: "openai" },
                    usage: transcribeResult.usage,
                    finishReason: transcribeResult.finishReason,
                };
            },
            catch: (error) => new ProviderOperationError({
                providerName: "openai",
                operation: "transcribe",
                message: error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "transcribe",
                cause: error
            })
        }),
        generateEmbeddings: (input, options) => Effect.tryPromise({
            try: async () => {
                const modelId = options.modelId || "text-embedding-ada-002";
                const result = await embedMany({
                    model: openaiProvider.textEmbedding(modelId),
                    values: input,
                });
                const embeddingResult = {
                    embeddings: result.embeddings,
                    id: `openai-embedding-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    finishReason: "stop",
                    usage: {
                        promptTokens: result.usage.tokens,
                        completionTokens: 0,
                        totalTokens: result.usage.tokens,
                    },
                    dimensions: result.embeddings[0]?.length ?? 0,
                    texts: input,
                    parameters: {}
                };
                return {
                    data: embeddingResult,
                    metadata: { model: modelId, provider: "openai" },
                    usage: embeddingResult.usage,
                    finishReason: embeddingResult.finishReason,
                };
            },
            catch: (error) => new ProviderOperationError({
                providerName: "openai",
                operation: "generateEmbeddings",
                message: error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "generateEmbeddings",
                cause: error
            })
        }),
        generateImage: (input, options) => Effect.tryPromise({
            try: async () => {
                const modelId = options.modelId || "dall-e-3";
                const promptText = input.text || (Chunk.isChunk(input.messages) ? Chunk.toReadonlyArray(input.messages).map(m => m.parts[0].content).join("\n") : "A futuristic cityscape");
                const result = await generateImage({
                    model: openaiProvider.image(modelId),
                    prompt: promptText,
                    n: options.n || 1,
                    size: (options.size || "1024x1024"),
                });
                const mainImage = result.images[0];
                const imageResult = {
                    imageUrl: mainImage?.base64 ? `data:image/png;base64,${mainImage.base64}` : "",
                    id: `openai-image-${Date.now()}`,
                    model: modelId,
                    timestamp: new Date(),
                    finishReason: "stop",
                    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    parameters: {
                        size: options.size || "1024x1024",
                        quality: options.quality || "standard",
                        style: options.style || "vivid"
                    },
                    additionalImages: result.images.slice(1).map(img => img.base64 ? `data:image/png;base64,${img.base64}` : "")
                };
                return {
                    data: imageResult,
                    metadata: { model: modelId, provider: "openai" },
                    usage: imageResult.usage,
                    finishReason: imageResult.finishReason,
                };
            },
            catch: (error) => new ProviderOperationError({
                providerName: "openai",
                operation: "generateImage",
                message: error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "generateImage",
                cause: error
            })
        }),
        getModels: () => Effect.gen(function* () {
            const ms = yield* ModelService;
            // Simplified implementation - return empty array since method doesn't exist on interface
            return [];
        }),
        getDefaultModelIdForProvider: (providerName, capability) => Effect.gen(function* () {
            if (providerName !== "openai") {
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "openai",
                    operation: "getDefaultModelId",
                    message: "Mismatched provider",
                    module: "openai",
                    method: "getDefaultModelIdForProvider"
                }));
            }
            const ms = yield* ModelService;
            const models = yield* ms.findModelsByCapability(capability);
            if (models.length === 0) {
                return yield* Effect.fail(new ProviderMissingModelIdError({
                    providerName: "openai",
                    capability,
                    module: "openai",
                    method: "getDefaultModelIdForProvider"
                }));
            }
            return models?.[0]?.id ?? "gpt-4o";
        }),
        setVercelProvider: (vercelProvider) => {
            if (!vercelProvider || vercelProvider.name !== "openai") {
                return Effect.fail(new ProviderServiceConfigError({
                    description: "Invalid or mismatched provider for OpenAI client",
                    module: "OpenAIClient",
                    method: "setVercelProvider"
                }));
            }
            return Effect.succeed(void 0);
        },
    });
}
export { makeOpenAIClient };
//# sourceMappingURL=openai-provider-client.js.map