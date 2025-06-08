import { EffectiveMessage, TextPart } from "@/schema.js";
import { experimental_generateSpeech as generateSpeech, generateText } from "ai";
import { Chunk, Effect, Either, Schema as S } from "effect";
import { z } from "zod";
import { ModelService } from "../../model/service.js";
import { ToolRegistryService } from '../../tool-registry/service.js';
import { ProviderMissingModelIdError, ProviderOperationError, ProviderToolError } from "../errors.js";
const MAX_TOOL_ITERATIONS = 5;
// Map finish reasons to EffectiveAgent finish reasons
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
// Helper to convert EA messages to Google AI SDK message format
function mapEAMessagesToGoogleMessages(eaMessages) {
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
        if (msg.role === "user" || msg.role === "system") {
            return { role: msg.role, content: textContent };
        }
        else if (msg.role === "assistant") {
            return { role: "user", content: `Assistant: ${textContent}` }; // Google doesn't have assistant role
        }
        else if (msg.role === "tool") {
            const toolName = msg.metadata?.toolName || "unknown";
            return { role: "user", content: `Tool ${toolName} result: ${textContent}` };
        }
        return { role: "user", content: textContent };
    });
}
// Helper to convert a Google message to an EA EffectiveMessage
function mapGoogleMessageToEAEffectiveMessage(googleMsg, modelId) {
    let eaParts = [];
    eaParts.push(new TextPart({ _tag: "Text", content: googleMsg.content }));
    // Note: Google's AI SDK doesn't directly support tool calls in the same way as OpenAI
    // Tool calls would need to be parsed from the response text if using function calling
    return new EffectiveMessage({
        role: googleMsg.role === "system" ? "system" : "user",
        parts: Chunk.fromIterable(eaParts),
        metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` }
    });
}
// Helper function to convert Effect Schema to Zod Schema for tool definitions
function convertEffectSchemaToZodSchema(schema) {
    return Effect.try({
        try: () => {
            // For Google AI SDK tool definitions, we create a flexible Zod schema
            // Since we don't have sophisticated schema introspection, 
            // we'll create a basic object schema that accepts any properties
            return z.object({}).passthrough();
        },
        catch: (error) => new ProviderOperationError({
            providerName: "google",
            operation: "schema-conversion",
            message: `Failed to convert Effect Schema to Zod Schema: ${error}`,
            module: "GoogleClient",
            method: "convertEffectSchemaToZodSchema",
            cause: error
        })
    });
}
// Internal factory for ProviderService only
function makeGoogleClient(apiKey) {
    return Effect.gen(function* () {
        const toolRegistryService = yield* ToolRegistryService;
        const modelService = yield* ModelService;
        return {
            // Tool-related methods
            validateToolInput: (toolName, input) => Effect.fail(new ProviderToolError({
                description: `Tool validation not implemented for ${toolName}`,
                provider: "google"
            })),
            executeTool: (toolName, input) => Effect.fail(new ProviderToolError({
                description: `Tool execution not implemented for ${toolName}`,
                provider: "google"
            })),
            processToolResult: (toolName, result) => Effect.fail(new ProviderToolError({
                description: `Tool result processing not implemented for ${toolName}`,
                provider: "google"
            })),
            // Provider and capability methods
            getProvider: () => Effect.fail(new ProviderOperationError({
                providerName: "google",
                operation: "getProvider",
                message: "Not implemented",
                module: "google",
                method: "getProvider"
            })),
            getCapabilities: () => Effect.succeed(new Set(["chat", "text-generation", "embeddings"])),
            // Core generation methods
            generateText: (input, options) => Effect.gen(function* () {
                const modelId = options.modelId;
                if (!modelId) {
                    return yield* Effect.fail(new ProviderMissingModelIdError({
                        providerName: "google",
                        capability: "text-generation",
                        module: "google",
                        method: "generateText"
                    }));
                }
                const messages = [];
                if (options.system) {
                    messages.push({ role: "system", content: options.system });
                }
                messages.push({ role: "user", content: input.text });
                const result = yield* Effect.tryPromise({
                    try: () => generateText({
                        messages,
                        model: modelId,
                        temperature: options.parameters?.temperature,
                        maxTokens: options.parameters?.maxTokens,
                        topP: options.parameters?.topP,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        presencePenalty: options.parameters?.presencePenalty
                    }),
                    catch: error => new ProviderOperationError({
                        providerName: "google",
                        operation: "generateText",
                        message: error instanceof Error ? error.message : "Unknown error",
                        module: "google",
                        method: "generateText",
                        cause: error
                    })
                });
                const textResult = {
                    text: result.text || "",
                    id: result.response?.id || `google-text-${Date.now()}`,
                    model: result.response?.modelId || modelId,
                    timestamp: new Date(),
                    finishReason: (result.finishReason || "stop"),
                    usage: {
                        promptTokens: result.usage?.promptTokens || 0,
                        completionTokens: result.usage?.completionTokens || 0,
                        totalTokens: result.usage?.totalTokens || 0
                    }
                };
                return {
                    data: textResult,
                    metadata: {
                        model: modelId,
                        provider: "google",
                        requestId: result.response?.id || `google-text-${Date.now()}`,
                        messageCount: messages.length,
                        hasSystemPrompt: !!options.system
                    },
                    usage: textResult.usage,
                    finishReason: textResult.finishReason
                };
            }),
            generateObject: (input, options) => Effect.gen(function* () {
                const modelId = options.modelId;
                if (!modelId) {
                    return yield* Effect.fail(new ProviderMissingModelIdError({
                        providerName: "google",
                        capability: "text-generation",
                        module: "google",
                        method: "generateObject"
                    }));
                }
                const messages = [];
                if (options.system) {
                    messages.push({ role: "system", content: options.system });
                }
                messages.push({ role: "user", content: input.text });
                try {
                    const result = yield* Effect.promise(() => generateText({
                        messages,
                        model: modelId,
                        temperature: options.parameters?.temperature,
                        maxTokens: options.parameters?.maxTokens,
                        topP: options.parameters?.topP,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        presencePenalty: options.parameters?.presencePenalty
                    }));
                    // Parse the text response as JSON
                    let parsedObject;
                    try {
                        parsedObject = JSON.parse(result.text || "");
                    }
                    catch (parseError) {
                        return yield* Effect.fail(new ProviderOperationError({
                            providerName: "google",
                            operation: "generateObject",
                            message: "Failed to parse generated text as JSON",
                            module: "google",
                            method: "generateObject",
                            cause: parseError
                        }));
                    }
                    const objectResult = {
                        object: parsedObject,
                        id: result.response?.id || `google-object-${Date.now()}`,
                        model: result.response?.modelId || modelId,
                        timestamp: new Date(),
                        finishReason: (result.finishReason || "stop"),
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
                            provider: "google",
                            requestId: result.response?.id || `google-object-${Date.now()}`,
                            messageCount: messages.length,
                            hasSystemPrompt: !!options.system
                        },
                        usage: objectResult.usage,
                        finishReason: objectResult.finishReason
                    };
                }
                catch (error) {
                    return yield* Effect.fail(new ProviderOperationError({
                        providerName: "google",
                        operation: "generateObject",
                        message: error instanceof Error ? error.message : "Unknown error",
                        module: "google",
                        method: "generateObject",
                        cause: error
                    }));
                }
            }),
            generateSpeech: (input, options) => Effect.gen(function* () {
                const modelId = options.modelId;
                if (!modelId) {
                    return yield* Effect.fail(new ProviderMissingModelIdError({
                        providerName: "google",
                        capability: "text-generation",
                        module: "google",
                        method: "generateSpeech"
                    }));
                }
                try {
                    // Call Google text-to-speech API
                    const result = yield* Effect.promise(() => generateSpeech({
                        model: modelId,
                        text: input,
                        voice: options.voice || "alloy",
                        speed: 1.0
                    }));
                    const speechResult = {
                        audioData: typeof result.audio === 'string' ? result.audio : Buffer.from(result.audio).toString('base64'),
                        id: `google-speech-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop",
                        usage: {
                            promptTokens: input.length, // Approximate token count based on input text length
                            completionTokens: 0, // No completion tokens for speech generation
                            totalTokens: input.length
                        },
                        parameters: {
                            voice: options.voice || "alloy",
                            speed: "1.0"
                        },
                        format: "mp3"
                    };
                    return {
                        data: speechResult,
                        metadata: {
                            model: modelId,
                            provider: "google",
                            requestId: `google-speech-${Date.now()}`,
                            audioSize: speechResult.audioData.length
                        },
                        usage: speechResult.usage,
                        finishReason: speechResult.finishReason
                    };
                }
                catch (error) {
                    return yield* Effect.fail(new ProviderOperationError({
                        providerName: "google",
                        operation: "generateSpeech",
                        message: error instanceof Error ? error.message : "Unknown error",
                        module: "google",
                        method: "generateSpeech",
                        cause: error
                    }));
                }
            }),
            transcribe: (input, options) => Effect.gen(function* () {
                const modelId = options.modelId;
                if (!modelId) {
                    return yield* Effect.fail(new ProviderMissingModelIdError({
                        providerName: "google",
                        capability: "text-generation",
                        module: "google",
                        method: "transcribe"
                    }));
                }
                try {
                    // Convert ArrayBuffer to Uint8Array for Google API
                    const audioData = new Uint8Array(input);
                    // Call Google Speech-to-Text API
                    const result = yield* Effect.promise(() => generateText({
                        messages: [{
                                role: "user",
                                content: "Please transcribe the following audio and provide the result as a JSON object with: text (full transcript), segments (array of {start, end, text}), and duration (in seconds)."
                            }],
                        model: modelId,
                        temperature: 0,
                        maxTokens: 4096,
                        providerOptions: {
                            google: {
                                ...(options.language && { language: options.language }),
                                timestamps: true,
                                quality: "standard"
                            }
                        }
                    }));
                    // Parse the transcription result
                    let parsedResult;
                    try {
                        parsedResult = JSON.parse(result.text);
                    }
                    catch (parseError) {
                        return yield* Effect.fail(new ProviderOperationError({
                            providerName: "google",
                            operation: "transcribe",
                            message: "Failed to parse transcription result",
                            module: "google",
                            method: "transcribe",
                            cause: parseError
                        }));
                    }
                    const transcribeResult = {
                        text: parsedResult.text || "",
                        segments: parsedResult.segments?.map((segment) => ({
                            id: 0,
                            start: segment.start,
                            end: segment.end,
                            text: segment.text,
                            words: []
                        })) || [],
                        duration: parsedResult.duration || 0,
                        parameters: {
                            language: options.language,
                            diarization: false,
                            timestamps: true,
                            quality: "standard"
                        },
                        id: `google-transcribe-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop",
                        usage: {
                            promptTokens: result.usage?.promptTokens || 0,
                            completionTokens: result.usage?.completionTokens || 0,
                            totalTokens: result.usage?.totalTokens || 0
                        }
                    };
                    return {
                        data: transcribeResult,
                        metadata: {
                            model: modelId,
                            provider: "google",
                            requestId: `google-transcribe-${Date.now()}`,
                            duration: transcribeResult.duration,
                            segmentCount: transcribeResult.segments?.length || 0
                        },
                        usage: transcribeResult.usage,
                        finishReason: transcribeResult.finishReason
                    };
                }
                catch (error) {
                    return yield* Effect.fail(new ProviderOperationError({
                        providerName: "google",
                        operation: "transcribe",
                        message: error instanceof Error ? error.message : "Unknown error",
                        module: "google",
                        method: "transcribe",
                        cause: error
                    }));
                }
            }),
            generateEmbeddings: (input, options) => Effect.gen(function* () {
                const modelId = options.modelId;
                if (!modelId) {
                    return yield* Effect.fail(new ProviderMissingModelIdError({
                        providerName: "google",
                        capability: "embeddings",
                        module: "google",
                        method: "generateEmbeddings"
                    }));
                }
                try {
                    // Call Google Vertex AI API for embeddings
                    const result = yield* Effect.promise(() => generateText({
                        messages: [{ role: "user", content: input.join("\n") }],
                        model: modelId,
                        temperature: 0,
                        maxTokens: 1536 // Standard embedding size
                    }));
                    // Parse the embeddings from the model output
                    // The model should return a JSON string containing the embeddings
                    let embeddings = [];
                    try {
                        const parsedOutput = JSON.parse(result.text);
                        if (Array.isArray(parsedOutput) && parsedOutput.every(Array.isArray)) {
                            embeddings = parsedOutput;
                        }
                        else {
                            throw new Error("Invalid embeddings format in response");
                        }
                    }
                    catch (parseError) {
                        return yield* Effect.fail(new ProviderOperationError({
                            providerName: "google",
                            operation: "generateEmbeddings",
                            message: "Failed to parse embeddings from response",
                            module: "google",
                            method: "generateEmbeddings",
                            cause: parseError
                        }));
                    }
                    const dimensions = embeddings[0]?.length || 0;
                    const embeddingResult = {
                        embeddings,
                        dimensions,
                        texts: input,
                        id: `google-embeddings-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop",
                        usage: {
                            promptTokens: result.usage?.promptTokens || 0,
                            completionTokens: result.usage?.completionTokens || 0,
                            totalTokens: result.usage?.totalTokens || 0
                        },
                        parameters: {
                            modelParameters: options.batchSize ? { batchSize: options.batchSize } : {},
                            normalization: undefined,
                            preprocessing: []
                        }
                    };
                    return {
                        data: embeddingResult,
                        metadata: {
                            model: modelId,
                            provider: "google",
                            requestId: `google-embeddings-${Date.now()}`,
                            dimensions
                        },
                        usage: embeddingResult.usage,
                        finishReason: embeddingResult.finishReason
                    };
                }
                catch (error) {
                    return yield* Effect.fail(new ProviderOperationError({
                        providerName: "google",
                        operation: "generateEmbeddings",
                        message: error instanceof Error ? error.message : "Unknown error",
                        module: "google",
                        method: "generateEmbeddings",
                        cause: error
                    }));
                }
            }),
            generateImage: (input, options) => Effect.gen(function* () {
                const modelId = options.modelId;
                if (!modelId) {
                    return yield* Effect.fail(new ProviderMissingModelIdError({
                        providerName: "google",
                        capability: "image-generation",
                        module: "google",
                        method: "generateImage"
                    }));
                }
                try {
                    // Convert EffectiveInput to prompt
                    const prompt = input.text || "A beautiful landscape";
                    // Call Google text model to generate image description
                    const result = yield* Effect.promise(() => generateText({
                        messages: [{
                                role: "user",
                                content: `Please generate a detailed image description for: ${prompt}. Return a JSON object with fields: base64 (base64 encoded PNG image data), width, height, and format.`
                            }],
                        model: modelId,
                        temperature: options.parameters?.temperature || 0.7,
                        maxTokens: 2048
                    }));
                    // Parse the image generation result
                    let parsedResult;
                    try {
                        parsedResult = JSON.parse(result.text);
                    }
                    catch (parseError) {
                        return yield* Effect.fail(new ProviderOperationError({
                            providerName: "google",
                            operation: "generateImage",
                            message: "Failed to parse image generation result",
                            module: "google",
                            method: "generateImage",
                            cause: parseError
                        }));
                    }
                    if (!parsedResult.base64) {
                        throw new Error("No image data in response");
                    }
                    const imageResult = {
                        imageUrl: `data:image/png;base64,${parsedResult.base64}`,
                        additionalImages: [],
                        parameters: {
                            size: options.size,
                            quality: options.quality,
                            style: options.style
                        },
                        id: `google-image-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop",
                        usage: {
                            promptTokens: result.usage?.promptTokens || 0,
                            completionTokens: result.usage?.completionTokens || 0,
                            totalTokens: result.usage?.totalTokens || 0
                        }
                    };
                    return {
                        data: imageResult,
                        metadata: {
                            model: modelId,
                            provider: "google",
                            requestId: `google-image-${Date.now()}`,
                            imageCount: 1,
                            size: options.size,
                            quality: options.quality,
                            style: options.style
                        },
                        usage: imageResult.usage,
                        finishReason: imageResult.finishReason
                    };
                }
                catch (error) {
                    return yield* Effect.fail(new ProviderOperationError({
                        providerName: "google",
                        operation: "generateImage",
                        message: error instanceof Error ? error.message : "Unknown error",
                        module: "google",
                        method: "generateImage",
                        cause: error
                    }));
                }
            }),
            // Chat method with tool calling support
            chat: (input, options) => Effect.gen(function* () {
                const toolRegistryService = yield* ToolRegistryService;
                let googleMessages = mapEAMessagesToGoogleMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
                let toolDescriptions = [];
                const modelId = options.modelId || "gemini-pro";
                // Process tools if provided
                if (options.tools && options.tools.length > 0) {
                    for (const tool of options.tools) {
                        if (tool.implementation._tag === "EffectImplementation") {
                            toolDescriptions.push(`Tool: ${tool.metadata.name} - ${tool.metadata.description}`);
                        }
                        else {
                            yield* Effect.logWarning(`Skipping tool ${tool.metadata.name} due to unsupported implementation type: ${tool.implementation._tag}`);
                        }
                    }
                }
                // Add system message with tool descriptions if tools are available
                if (options.system) {
                    const systemContent = toolDescriptions.length > 0
                        ? `${options.system}\n\nAvailable tools:\n${toolDescriptions.join('\n')}\n\nTo use a tool, respond with JSON in this format: {"tool_name": "toolname", "tool_args": {"arg1": "value1"}}`
                        : options.system;
                    googleMessages.unshift({ role: "system", content: systemContent });
                }
                else if (toolDescriptions.length > 0) {
                    googleMessages.unshift({
                        role: "system",
                        content: `Available tools:\n${toolDescriptions.join('\n')}\n\nTo use a tool, respond with JSON in this format: {"tool_name": "toolname", "tool_args": {"arg1": "value1"}}`
                    });
                }
                // Add user input if provided
                if (input.text && !input.messages) {
                    googleMessages.push({ role: "user", content: input.text });
                }
                for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
                    const googleResult = yield* Effect.tryPromise({
                        try: async () => {
                            return await generateText({
                                messages: googleMessages,
                                model: modelId,
                                temperature: options.parameters?.temperature,
                                maxTokens: options.parameters?.maxTokens,
                                topP: options.parameters?.topP,
                                frequencyPenalty: options.parameters?.frequencyPenalty,
                                presencePenalty: options.parameters?.presencePenalty,
                            });
                        },
                        catch: (error) => new ProviderOperationError({
                            providerName: "google",
                            operation: "chat.generateText",
                            message: error instanceof Error ? error.message : "Unknown Google AI SDK error",
                            module: "GoogleClient",
                            method: "chat.generateTextLoop",
                            cause: error
                        })
                    });
                    const assistantResponseContent = googleResult.text;
                    // Add assistant response to conversation
                    googleMessages.push({ role: "user", content: `Assistant: ${assistantResponseContent}` });
                    // Check if the response contains a tool call (JSON format)
                    let toolCallDetected = false;
                    let toolCall = null;
                    try {
                        if (assistantResponseContent.includes('{"tool_name"') || assistantResponseContent.includes('"tool_name"')) {
                            // Extract JSON from the response
                            const jsonMatch = assistantResponseContent.match(/\{.*?"tool_name".*?\}/s);
                            if (jsonMatch) {
                                toolCall = JSON.parse(jsonMatch[0]);
                                toolCallDetected = true;
                            }
                        }
                    }
                    catch (parseError) {
                        // If JSON parsing fails, treat as normal response
                        yield* Effect.logWarning("Failed to parse tool call from Google response", parseError);
                    }
                    if (!toolCallDetected || !toolCall) {
                        // No tool call detected, return final response
                        const mappedFinishReason = mapFinishReason(googleResult.finishReason || "stop");
                        const effectiveResponse = {
                            id: `google-chat-${Date.now()}`,
                            model: modelId,
                            timestamp: new Date(),
                            text: assistantResponseContent,
                            finishReason: mappedFinishReason,
                            usage: {
                                promptTokens: googleResult.usage?.promptTokens || 0,
                                completionTokens: googleResult.usage?.completionTokens || 0,
                                totalTokens: googleResult.usage?.totalTokens || 0,
                            },
                            messages: Chunk.isChunk(input.messages) ? input.messages.pipe(Chunk.appendAll(Chunk.fromIterable(googleMessages.slice(mapEAMessagesToGoogleMessages(Chunk.toReadonlyArray(input.messages)).length).map(gm => mapGoogleMessageToEAEffectiveMessage(gm, modelId))))) : Chunk.fromIterable(googleMessages.map(gm => mapGoogleMessageToEAEffectiveMessage(gm, modelId))),
                        };
                        return {
                            data: effectiveResponse,
                            metadata: { model: modelId, provider: "google", requestId: `google-chat-${Date.now()}` },
                            usage: effectiveResponse.usage,
                            finishReason: mappedFinishReason,
                        };
                    }
                    // Execute the tool call
                    const toolName = toolCall.tool_name;
                    const toolArgs = toolCall.tool_args;
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
                        // Attempt to validate arguments using the original Effect Schema first for better error messages
                        const validatedArgsEither = yield* Effect.either(S.decode(effectImpl.inputSchema)(toolArgs));
                        if (Either.isLeft(validatedArgsEither)) {
                            const validationError = validatedArgsEither.left;
                            yield* Effect.logWarning(`Invalid arguments for tool ${toolName}`, validationError);
                            toolExecutionOutputString = JSON.stringify({ error: `Invalid arguments for tool ${toolName}. Validation failed.` });
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
                    // Add tool result to conversation
                    googleMessages.push({ role: "user", content: `Tool ${toolName} result: ${toolExecutionOutputString}` });
                }
                yield* Effect.logError("Maximum tool iterations reached for chat.", { modelId });
                return yield* Effect.fail(new ProviderOperationError({
                    providerName: "google",
                    operation: "chat",
                    message: "Maximum tool iterations reached.",
                    module: "GoogleClient",
                    method: "chat.maxIterations"
                }));
            }),
            // Model management
            getModels: () => Effect.succeed([]),
            getDefaultModelIdForProvider: (providerName, capability) => Effect.fail(new ProviderMissingModelIdError({
                providerName,
                capability,
                module: "google",
                method: "getDefaultModelIdForProvider"
            })),
            // Provider management
            setVercelProvider: (vercelProvider) => Effect.fail(new ProviderOperationError({
                providerName: "google",
                operation: "setVercelProvider",
                message: "Not implemented",
                module: "google",
                method: "setVercelProvider"
            }))
        };
    });
}
export { makeGoogleClient };
//# sourceMappingURL=google-provider-client.js.map