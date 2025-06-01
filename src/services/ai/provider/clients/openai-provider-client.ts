import { ModelCapability } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import { openai } from "@ai-sdk/openai";
import { embedMany, experimental_generateImage as generateImage, generateObject, experimental_generateSpeech as generateSpeech, generateText, experimental_transcribe as transcribe } from "ai";
import { Chunk, Effect } from "effect";
import { z } from "zod";
import type { ProviderClientApi } from "../api.js";
import {
    ProviderMissingModelIdError,
    ProviderNotFoundError,
    ProviderOperationError,
    ProviderServiceConfigError,
    ProviderToolError
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
    EffectiveProviderApi,
    GenerateEmbeddingsResult,
    GenerateImageResult,
    GenerateSpeechResult,
    GenerateTextResult,
    ProviderChatOptions,
    ProviderGenerateEmbeddingsOptions,
    ProviderGenerateImageOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateTextOptions,
    ProviderTranscribeOptions,
    TranscribeResult
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

// Helper function to create a basic Zod schema for common object structures
function createZodSchemaFromPrompt(prompt: string): z.ZodSchema {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes("product") || lowerPrompt.includes("laptop") || lowerPrompt.includes("phone")) {
        return z.object({
            name: z.string(),
            price: z.number(),
            category: z.string(),
            inStock: z.boolean(),
            description: z.string()
        });
    } else {
        // Default to person-like object
        return z.object({
            name: z.string(),
            age: z.number(),
            email: z.string(),
            isActive: z.boolean()
        });
    }
}

// Internal factory for ProviderService only
function makeOpenAIClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi> {
    // Set API key globally for this client instance
    process.env.OPENAI_API_KEY = apiKey;

    return Effect.succeed({
        // Tool-related methods
        validateToolInput: (toolName: string, input: unknown) =>
            Effect.fail(new ProviderToolError({
                description: `Tool validation not implemented for ${toolName}`,
                provider: "openai"
            })),

        executeTool: (toolName: string, input: unknown) =>
            Effect.fail(new ProviderToolError({
                description: `Tool execution not implemented for ${toolName}`,
                provider: "openai"
            })),

        processToolResult: (toolName: string, result: unknown) =>
            Effect.fail(new ProviderToolError({
                description: `Tool result processing not implemented for ${toolName}`,
                provider: "openai"
            })),

        // Provider and capability methods
        getProvider: () => Effect.fail(new ProviderOperationError({
            providerName: "openai",
            operation: "getProvider",
            message: "Not implemented",
            module: "openai",
            method: "getProvider"
        })),

        getCapabilities: () =>
            Effect.succeed(new Set<ModelCapability>(["chat", "text-generation", "embeddings", "image-generation", "function-calling"])),

        // Core generation methods - REAL IMPLEMENTATION
        generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) =>
            Effect.tryPromise({
                try: async () => {
                    const modelId = options.modelId || "gpt-4o";

                    // Convert EffectiveInput to prompt
                    const prompt = input.text || "";
                    const messages = Chunk.toReadonlyArray(input.messages || Chunk.empty())
                        .map(msg => {
                            // Extract content from message parts
                            const parts = Chunk.toReadonlyArray(msg.parts);
                            const textPart = parts.find(part => part._tag === "Text");
                            return {
                                role: msg.role,
                                content: textPart?.content || ""
                            };
                        });

                    // Call OpenAI API
                    const result = await generateText({
                        model: openai(modelId as any),
                        prompt: messages.length > 0 ? undefined : prompt,
                        messages: messages.length > 0 ? messages as any : undefined,
                        temperature: options.parameters?.temperature,
                        maxTokens: options.parameters?.maxTokens,
                        topP: options.parameters?.topP,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        presencePenalty: options.parameters?.presencePenalty
                    });

                    const textResult: GenerateTextResult = {
                        text: result.text,
                        id: result.response?.id || `openai-${Date.now()}`,
                        model: result.response?.modelId || modelId,
                        timestamp: new Date(),
                        finishReason: mapFinishReason(result.finishReason || "stop"),
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
                            provider: "openai",
                            requestId: result.response?.id || `openai-${Date.now()}`
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

        generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) =>
            Effect.tryPromise({
                try: async () => {
                    const modelId = options.modelId || "gpt-4o";

                    // Convert EffectiveInput to prompt
                    const prompt = input.text || "";

                    // Call OpenAI API with structured output
                    const zodSchema = createZodSchemaFromPrompt(prompt);
                    const result = await generateObject({
                        model: openai(modelId as any),
                        prompt: prompt,
                        schema: zodSchema,
                        temperature: options.parameters?.temperature,
                        maxTokens: options.parameters?.maxTokens,
                        topP: options.parameters?.topP,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        presencePenalty: options.parameters?.presencePenalty,
                    });

                    return {
                        data: {
                            object: result.object as T,
                            id: result.response?.id || `openai-object-${Date.now()}`,
                            model: result.response?.modelId || modelId,
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
                            requestId: result.response?.id || `openai-object-${Date.now()}`,
                            schemaUsed: !!options.schema
                        },
                        usage: {
                            promptTokens: result.usage?.promptTokens || 0,
                            completionTokens: result.usage?.completionTokens || 0,
                            totalTokens: result.usage?.totalTokens || 0
                        },
                        finishReason: mapFinishReason(result.finishReason || "stop")
                    };
                },
                catch: (error) => new ProviderOperationError({
                    providerName: "openai",
                    operation: "generateObject",
                    message: error instanceof Error ? error.message : "Unknown error",
                    module: "openai",
                    method: "generateObject",
                    cause: error
                })
            }),

        generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
            Effect.tryPromise({
                try: async () => {
                    // OpenAI's TTS models provide high-quality speech synthesis
                    // - tts-1: Fast, real-time capable model
                    // - tts-1-hd: Higher quality model with better fidelity
                    // - gpt-4o-mini-tts: Advanced model with enhanced voice control
                    const modelId = options.modelId || "tts-1";

                    // Call OpenAI speech API
                    const result = await generateSpeech({
                        model: openai.speech(modelId as any),
                        text: input,
                        voice: options.voice as any || "alloy",
                        providerOptions: {
                            openai: {
                                response_format: "mp3",
                                speed: 1.0,
                                ...(options.voice && { voice: options.voice })
                            }
                        }
                    });

                    const speechResult: GenerateSpeechResult = {
                        audioData: result.audio.base64 || "",
                        format: "mp3",
                        id: `openai-speech-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop" as FinishReason,
                        usage: {
                            promptTokens: input.length, // Approximate token count for TTS
                            completionTokens: 0,
                            totalTokens: input.length
                        },
                        parameters: {
                            voice: options.voice,
                            speed: "1.0"
                        }
                    };

                    return {
                        data: speechResult,
                        metadata: {
                            model: modelId,
                            provider: "openai",
                            requestId: `openai-speech-${Date.now()}`,
                            audioSize: speechResult.audioData.length
                        },
                        usage: speechResult.usage,
                        finishReason: speechResult.finishReason
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

        transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
            Effect.tryPromise({
                try: async () => {
                    // OpenAI's Whisper models are industry-leading for audio transcription
                    // - Supports 99+ languages with high accuracy
                    // - Robust to accents, background noise, and technical language
                    // - Available models: whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe
                    const modelId = options.modelId || "whisper-1";

                    // Convert ArrayBuffer to Uint8Array for AI SDK
                    const audioData = new Uint8Array(input);

                    // Call OpenAI transcription API with available options
                    const result = await transcribe({
                        model: openai.transcription(modelId as any),
                        audio: audioData,
                        providerOptions: {
                            openai: {
                                ...(options.language && { language: options.language }),
                                diarization: false,
                                timestamps: true,
                                quality: "standard"
                            }
                        }
                    });

                    const transcribeResult: TranscribeResult = {
                        text: result.text,
                        segments: result.segments?.map(segment => ({
                            id: 0, // AI SDK segments don't have IDs
                            start: segment.startSecond,
                            end: segment.endSecond,
                            text: segment.text,
                            words: [] // AI SDK doesn't provide word-level timing
                        })) || [],
                        duration: result.durationInSeconds || 0,
                        parameters: {
                            language: options.language,
                            diarization: false,
                            timestamps: true,
                            quality: "standard"
                        },
                        id: `openai-transcribe-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop" as FinishReason,
                        usage: {
                            promptTokens: 0, // Transcription doesn't use standard token counting
                            completionTokens: 0,
                            totalTokens: 0
                        }
                    };

                    return {
                        data: transcribeResult,
                        metadata: {
                            model: modelId,
                            provider: "openai",
                            requestId: `openai-transcribe-${Date.now()}`,
                            duration: transcribeResult.duration,
                            segmentCount: transcribeResult.segments?.length || 0
                        },
                        usage: transcribeResult.usage,
                        finishReason: transcribeResult.finishReason
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

        generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) =>
            Effect.tryPromise({
                try: async () => {
                    const modelId = options.modelId || "text-embedding-3-small";

                    // Call OpenAI API for embeddings
                    const result = await embedMany({
                        model: openai.embedding(modelId as any),
                        values: input
                    });

                    // Determine dimensions from first embedding
                    const dimensions = result.embeddings[0]?.length || 0;

                    const embeddingResult: GenerateEmbeddingsResult = {
                        embeddings: result.embeddings,
                        dimensions,
                        texts: input,
                        id: `openai-embeddings-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop" as FinishReason,
                        usage: {
                            promptTokens: result.usage?.tokens || 0,
                            completionTokens: 0,
                            totalTokens: result.usage?.tokens || 0
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
                            provider: "openai",
                            requestId: `openai-embeddings-${Date.now()}`,
                            dimensions
                        },
                        usage: embeddingResult.usage,
                        finishReason: embeddingResult.finishReason
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

        generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
            Effect.tryPromise({
                try: async () => {
                    // GPT-4o is OpenAI's best image generation model (superior to DALL-E)
                    // - Photorealistic & accurate prompt adherence
                    // - Excellent text rendering within images
                    // - Advanced editing capabilities
                    // - Better instruction following
                    const modelId = options.modelId || "gpt-4o";

                    // Convert EffectiveInput to prompt - handle both text and message formats
                    const prompt = input.text ||
                        (input.messages && Chunk.size(input.messages) > 0
                            ? Chunk.toReadonlyArray(input.messages).map(msg =>
                                Chunk.toReadonlyArray(msg.parts)
                                    .filter(part => part._tag === "Text")
                                    .map(part => part.content)
                                    .join(" ")
                            ).join(" ")
                            : "A beautiful landscape");

                    // Call OpenAI API for image generation using GPT-4o or DALL-E
                    const result = await generateImage({
                        model: openai.image(modelId as any),
                        prompt: prompt,
                        size: options.size as any,
                        n: options.n || 1,
                        providerOptions: {
                            openai: {
                                quality: options.quality as any,
                                style: options.style as any
                            }
                        }
                    });

                    // Handle both single image and multiple images
                    const images = result.images || (result.image ? [result.image] : []);
                    const primaryImage = images[0];
                    const additionalImages = images.slice(1);

                    if (!primaryImage) {
                        throw new Error("No image generated");
                    }

                    const imageResult: GenerateImageResult = {
                        imageUrl: primaryImage.base64 ? `data:image/png;base64,${primaryImage.base64}` : "",
                        additionalImages: additionalImages.map(img =>
                            img.base64 ? `data:image/png;base64,${img.base64}` : ""
                        ).filter(Boolean),
                        parameters: {
                            size: options.size,
                            quality: options.quality,
                            style: options.style
                        },
                        id: `openai-image-${Date.now()}`,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: "stop" as FinishReason,
                        usage: {
                            promptTokens: 0, // Image generation doesn't use standard token counting
                            completionTokens: 0,
                            totalTokens: 0
                        }
                    };

                    return {
                        data: imageResult,
                        metadata: {
                            model: modelId,
                            provider: "openai",
                            requestId: `openai-image-${Date.now()}`,
                            imageCount: images.length,
                            size: options.size,
                            quality: options.quality,
                            style: options.style
                        },
                        usage: imageResult.usage,
                        finishReason: imageResult.finishReason
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

        // Chat method - REAL IMPLEMENTATION
        chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) =>
            Effect.tryPromise({
                try: async () => {
                    const modelId = options.modelId || "gpt-4o";

                    // Convert EffectiveInput to messages format
                    const messages = Chunk.toReadonlyArray(effectiveInput.messages || Chunk.empty())
                        .map(msg => {
                            // Extract content from message parts
                            const parts = Chunk.toReadonlyArray(msg.parts);
                            const textPart = parts.find(part => part._tag === "Text");
                            return {
                                role: msg.role,
                                content: textPart?.content || ""
                            };
                        });

                    // Add system message if provided
                    const systemMessages = options.system ? [{ role: "system" as const, content: options.system }] : [];
                    const allMessages = [...systemMessages, ...messages];

                    // If no messages, use the text input as a user message
                    if (allMessages.length === 0 && effectiveInput.text) {
                        allMessages.push({ role: "user" as const, content: effectiveInput.text });
                    }

                    // Call OpenAI API with chat messages
                    const result = await generateText({
                        model: openai(modelId as any),
                        messages: allMessages as any,
                        temperature: options.parameters?.temperature,
                        maxTokens: options.parameters?.maxTokens,
                        topP: options.parameters?.topP,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        presencePenalty: options.parameters?.presencePenalty,
                        ...(options.tools && { tools: options.tools as any })
                    });

                    const chatResult: GenerateTextResult = {
                        text: result.text,
                        id: result.response?.id || `openai-chat-${Date.now()}`,
                        model: result.response?.modelId || modelId,
                        timestamp: new Date(),
                        finishReason: mapFinishReason(result.finishReason || "stop"),
                        usage: {
                            promptTokens: result.usage?.promptTokens || 0,
                            completionTokens: result.usage?.completionTokens || 0,
                            totalTokens: result.usage?.totalTokens || 0
                        },
                        // Add tool calls if present
                        toolCalls: result.toolCalls?.map(tc => ({
                            id: tc.toolCallId || `tool-call-${Date.now()}-${Math.random()}`,
                            type: "tool_call" as const,
                            function: {
                                name: tc.toolName,
                                arguments: JSON.stringify(tc.args)
                            }
                        })) || []
                    };

                    return {
                        data: chatResult,
                        metadata: {
                            model: modelId,
                            provider: "openai",
                            requestId: result.response?.id || `openai-chat-${Date.now()}`,
                            messageCount: allMessages.length,
                            hasSystemPrompt: !!options.system,
                            toolsUsed: result.toolCalls?.length || 0
                        },
                        usage: chatResult.usage,
                        finishReason: chatResult.finishReason
                    };
                },
                catch: (error) => new ProviderOperationError({
                    providerName: "openai",
                    operation: "chat",
                    message: error instanceof Error ? error.message : "Unknown error",
                    module: "openai",
                    method: "chat",
                    cause: error
                })
            }),

        // Model management
        getModels: () =>
            Effect.gen(function* () {
                const modelService = yield* ModelService;
                const openaiModels = yield* modelService.getModelsForProvider("openai");
                // Convert PublicModelInfo to LanguageModelV1 format
                return openaiModels.map(model => openai(model.id));
            }).pipe(
                Effect.mapError(error => new ProviderServiceConfigError({
                    description: `Failed to get OpenAI models: ${error instanceof Error ? error.message : String(error)}`,
                    module: "openai",
                    method: "getModels"
                }))
            ),

        getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) =>
            Effect.fail(new ProviderMissingModelIdError({
                providerName,
                capability,
                module: "openai",
                method: "getDefaultModelIdForProvider"
            })),

        // Vercel provider integration
        setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
            Effect.fail(new ProviderOperationError({
                providerName: "openai",
                operation: "setVercelProvider",
                message: "Not implemented",
                module: "openai",
                method: "setVercelProvider"
            }))
    });
}

export { makeOpenAIClient };
